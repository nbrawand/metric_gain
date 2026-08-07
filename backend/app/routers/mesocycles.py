"""Mesocycle template endpoints for creating and managing training block templates."""

from typing import List
from collections import OrderedDict

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload


from app.database import get_db
from app.models.mesocycle import Mesocycle, MesocycleInstance, WorkoutTemplate, WorkoutExercise
from app.models.workout_session import WorkoutSession, WorkoutSet
from app.models.user import User
from app.models.exercise import Exercise
from app.schemas.mesocycle import (
    MesocycleCreate,
    MesocycleUpdate,
    MesocycleResponse,
    MesocycleListResponse,
    WorkoutTemplateCreate,
    WorkoutTemplateResponse,
)
from app.utils.auth import get_current_user
from app.utils.db import apply_update

router = APIRouter()


def _reject_duplicate_exercises(workout_data) -> None:
    """A workout may not list the same exercise twice.

    Sets are numbered per template entry, so two entries for one exercise give
    it two runs of set numbers in a session — which breaks adding and removing
    sets and matching next week's targets. The session-level swap and add
    endpoints already refuse this; template creation has to as well.
    """
    seen = set()
    for exercise_data in workout_data.exercises:
        if exercise_data.exercise_id in seen:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"'{workout_data.name}' lists the same exercise twice",
            )
        seen.add(exercise_data.exercise_id)


def _reject_if_instance_active(db: Session, mesocycle_id: int, action: str) -> None:
    """Refuse structural edits to a template a running mesocycle is built on.

    A running instance's sessions were generated from this template's shape:
    one session per workout template per week. Changing that shape mid-block
    leaves the instance with sessions that no longer match the plan the client
    reads back, so the block can never finish.
    """
    active_instances = (
        db.query(MesocycleInstance)
        .filter(
            MesocycleInstance.mesocycle_template_id == mesocycle_id,
            MesocycleInstance.status == "active",
        )
        .count()
    )
    if active_instances > 0:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"You can't {action} this template while a mesocycle from it "
                "is running. End that mesocycle first."
            ),
        )


@router.get("/", response_model=List[MesocycleListResponse])
async def list_mesocycles(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get list of user's mesocycles and stock mesocycles.

    Returns simplified list without nested workout templates.
    """
    from sqlalchemy import or_
    mesocycles = (
        db.query(Mesocycle)
        .filter(
            or_(
                Mesocycle.user_id == current_user.id,
                Mesocycle.is_stock == 1
            )
        )
        .order_by(Mesocycle.is_stock.desc(), Mesocycle.created_at.desc())
        .all()
    )

    # Convert to list response with workout count
    result = []
    for mesocycle in mesocycles:
        workout_count = len(mesocycle.workout_templates)
        result.append(
            MesocycleListResponse(
                **mesocycle.__dict__,
                workout_count=workout_count,
            )
        )

    return result


@router.get("/{mesocycle_id}", response_model=MesocycleResponse)
async def get_mesocycle(
    mesocycle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get specific mesocycle with full details including workouts and exercises.
    """
    mesocycle = (
        db.query(Mesocycle)
        .filter(Mesocycle.id == mesocycle_id)
        .options(
            joinedload(Mesocycle.workout_templates).joinedload(
                WorkoutTemplate.exercises
            )
        )
        .first()
    )

    if not mesocycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mesocycle template not found."
        )

    # Check ownership (allow access to stock mesocycles)
    if mesocycle.user_id != current_user.id and not mesocycle.is_stock:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to that mesocycle template.",
        )

    # Load exercise details for each workout exercise
    for workout in mesocycle.workout_templates:
        for workout_exercise in workout.exercises:
            exercise = (
                db.query(Exercise).filter(Exercise.id == workout_exercise.exercise_id).first()
            )
            if exercise:
                workout_exercise.exercise = exercise

    return mesocycle


@router.post("/", response_model=MesocycleResponse, status_code=status.HTTP_201_CREATED)
async def create_mesocycle(
    mesocycle_data: MesocycleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new mesocycle with workout templates and exercises.

    Allows creating the entire mesocycle structure in one request.
    """
    # Create mesocycle template
    new_mesocycle = Mesocycle(
        user_id=current_user.id,
        name=mesocycle_data.name,
        description=mesocycle_data.description,
        weeks=mesocycle_data.weeks,
        days_per_week=mesocycle_data.days_per_week,
    )

    db.add(new_mesocycle)
    db.flush()  # Get mesocycle ID without committing

    # Create workout templates
    for workout_data in mesocycle_data.workout_templates:
        workout_template = WorkoutTemplate(
            mesocycle_id=new_mesocycle.id,
            name=workout_data.name,
            description=workout_data.description,
            order_index=workout_data.order_index,
        )

        db.add(workout_template)
        db.flush()  # Get workout template ID

        # Create workout exercises
        _reject_duplicate_exercises(workout_data)
        for exercise_data in workout_data.exercises:
            # Verify exercise exists and user has access
            exercise = db.query(Exercise).filter(Exercise.id == exercise_data.exercise_id).first()
            if not exercise:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="One of the selected exercises no longer exists.",
                )

            # Check if custom exercise belongs to user
            if exercise.is_custom and exercise.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to one of the selected exercises.",
                )

            workout_exercise = WorkoutExercise(
                workout_template_id=workout_template.id,
                exercise_id=exercise_data.exercise_id,
                order_index=exercise_data.order_index,
                target_sets=exercise_data.target_sets,
                weekly_set_increment=exercise_data.weekly_set_increment,
                target_reps_min=exercise_data.target_reps_min,
                target_reps_max=exercise_data.target_reps_max,
                starting_rir=exercise_data.starting_rir,
                ending_rir=exercise_data.ending_rir,
                notes=exercise_data.notes,
            )

            db.add(workout_exercise)

    db.commit()
    db.refresh(new_mesocycle)

    # Load full mesocycle with relationships
    mesocycle = (
        db.query(Mesocycle)
        .filter(Mesocycle.id == new_mesocycle.id)
        .options(
            joinedload(Mesocycle.workout_templates).joinedload(
                WorkoutTemplate.exercises
            )
        )
        .first()
    )

    # Load exercise details
    for workout in mesocycle.workout_templates:
        for workout_exercise in workout.exercises:
            exercise = (
                db.query(Exercise).filter(Exercise.id == workout_exercise.exercise_id).first()
            )
            if exercise:
                workout_exercise.exercise = exercise

    return mesocycle


@router.post("/from-instance/{instance_id}", response_model=MesocycleResponse, status_code=status.HTTP_201_CREATED)
async def create_mesocycle_from_instance(
    instance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new mesocycle template from a completed instance.

    Uses the last week's workout sessions to capture any exercise swaps made during the instance.
    Falls back to the original template for exercise parameters (sets, reps, RIR).
    """
    instance = db.query(MesocycleInstance).filter(
        MesocycleInstance.id == instance_id,
        MesocycleInstance.user_id == current_user.id,
    ).first()

    if not instance:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mesocycle not found.")

    if instance.status != "completed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can only create a template from a completed mesocycle.")

    # Get the original template for exercise parameters (sets, reps, RIR).
    # Keyed by (day, exercise): the same exercise can appear on several days
    # with different parameters (heavy day / light day), and a map keyed by
    # exercise alone let the last day's numbers overwrite every other day's.
    original_template = None
    template_exercise_map: dict[tuple[int, int], dict] = {}  # (day_number, exercise_id) -> params
    template_exercise_fallback: dict[int, dict] = {}  # exercise_id -> params, for exercises that moved days
    if instance.mesocycle_template_id:
        original_template = db.query(Mesocycle).options(
            joinedload(Mesocycle.workout_templates).joinedload(WorkoutTemplate.exercises)
        ).filter(Mesocycle.id == instance.mesocycle_template_id).first()

        if original_template:
            for wt in sorted(original_template.workout_templates, key=lambda w: w.order_index):
                for we in wt.exercises:
                    params = {
                        "target_sets": we.target_sets,
                        "weekly_set_increment": we.weekly_set_increment,
                        "target_reps_min": we.target_reps_min,
                        "target_reps_max": we.target_reps_max,
                        "starting_rir": we.starting_rir,
                        "ending_rir": we.ending_rir,
                        "notes": we.notes,
                    }
                    template_exercise_map[(wt.order_index + 1, we.exercise_id)] = params
                    template_exercise_fallback.setdefault(we.exercise_id, params)

    # Get workout sessions grouped by day_number, pick the latest week for each day
    sessions = db.query(WorkoutSession).filter(
        WorkoutSession.mesocycle_instance_id == instance_id,
        WorkoutSession.user_id == current_user.id,
    ).order_by(WorkoutSession.day_number, WorkoutSession.week_number.desc()).all()

    # For each day_number, get the session with the highest week_number
    latest_sessions: dict[int, WorkoutSession] = {}
    for s in sessions:
        if s.day_number not in latest_sessions:
            latest_sessions[s.day_number] = s

    if not latest_sessions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="That mesocycle has no workouts to copy.",
        )

    # Build the new template. days_per_week is set after the day loop from the
    # count of workouts actually copied: a day emptied during the run is
    # skipped below, and carrying the snapshot's count over would make the
    # copy claim more training days than it has — its instances could then
    # never reach "completed".
    template_name = f"{instance.template_name or 'Mesocycle'} (Copy)"
    weeks = instance.template_weeks or 6

    new_mesocycle = Mesocycle(
        user_id=current_user.id,
        name=template_name,
        weeks=weeks,
        days_per_week=len(latest_sessions),
    )
    db.add(new_mesocycle)
    db.flush()

    # Get original template workout names if available
    original_workout_names: dict[int, str] = {}
    if original_template:
        for wt in sorted(original_template.workout_templates, key=lambda w: w.order_index):
            original_workout_names[wt.order_index + 1] = wt.name  # order_index is 0-based, day_number is 1-based

    created_days = 0
    for day_number in sorted(latest_sessions.keys()):
        session = latest_sessions[day_number]

        # Get sets for this session, ordered by order_index
        sets = db.query(WorkoutSet).filter(
            WorkoutSet.workout_session_id == session.id
        ).order_by(WorkoutSet.order_index, WorkoutSet.set_number).all()

        # Group by exercise, preserving order
        exercise_groups: OrderedDict[int, list] = OrderedDict()
        for ws in sets:
            exercise_groups.setdefault(ws.exercise_id, []).append(ws)

        # A day whose exercises were all removed during the run would copy
        # across as an empty workout, which cannot be trained or started
        if not exercise_groups:
            continue

        workout_name = original_workout_names.get(day_number, f"Day {day_number}")
        # order_index counts created workouts, not the original day: skipped
        # days must not leave gaps, since sessions are generated positionally
        workout_template = WorkoutTemplate(
            mesocycle_id=new_mesocycle.id,
            name=workout_name,
            order_index=created_days,
        )
        created_days += 1
        db.add(workout_template)
        db.flush()

        for order_idx, (exercise_id, exercise_sets) in enumerate(exercise_groups.items()):
            # Use original template params for this day if available, falling
            # back to the exercise's params from whichever day it lived on
            # originally, then to defaults
            params = (
                template_exercise_map.get((day_number, exercise_id))
                or template_exercise_fallback.get(exercise_id)
                or {}
            )

            workout_exercise = WorkoutExercise(
                workout_template_id=workout_template.id,
                exercise_id=exercise_id,
                order_index=order_idx,
                target_sets=params.get("target_sets", 2),
                # Matches the default a new exercise gets everywhere else, so an
                # exercise swapped in mid-block doesn't come back as a flat plan
                weekly_set_increment=params.get("weekly_set_increment", 0.5),
                target_reps_min=params.get("target_reps_min", 8),
                target_reps_max=params.get("target_reps_max", 12),
                starting_rir=params.get("starting_rir", 3),
                ending_rir=params.get("ending_rir", 0),
                notes=params.get("notes"),
            )
            db.add(workout_exercise)

    db.commit()
    db.refresh(new_mesocycle)

    # Load full mesocycle with relationships
    mesocycle = (
        db.query(Mesocycle)
        .filter(Mesocycle.id == new_mesocycle.id)
        .options(
            joinedload(Mesocycle.workout_templates).joinedload(WorkoutTemplate.exercises)
        )
        .first()
    )

    for workout in mesocycle.workout_templates:
        for workout_exercise in workout.exercises:
            exercise = db.query(Exercise).filter(Exercise.id == workout_exercise.exercise_id).first()
            if exercise:
                workout_exercise.exercise = exercise

    return mesocycle


@router.put("/{mesocycle_id}", response_model=MesocycleResponse)
async def update_mesocycle(
    mesocycle_id: int,
    mesocycle_data: MesocycleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update mesocycle details (not including workouts/exercises).

    Use separate endpoints to add/update/delete workout templates.
    """
    mesocycle = db.query(Mesocycle).filter(Mesocycle.id == mesocycle_id).first()

    if not mesocycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mesocycle template not found."
        )

    # Prevent editing of stock mesocycles
    if mesocycle.is_stock:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Stock templates cannot be edited.",
        )

    # Check ownership
    if mesocycle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own templates.",
        )

    # Update fields
    update_data = mesocycle_data.model_dump(exclude_unset=True)

    # Renaming is always safe, but week and day counts define the shape the
    # running instance's sessions were generated from. Changing those made the
    # client compute a workout total the instance can never reach.
    changes_shape = any(
        value != getattr(mesocycle, field)
        for field, value in update_data.items()
        if field in ("weeks", "days_per_week")
    )
    if changes_shape:
        _reject_if_instance_active(db, mesocycle_id, "change the length of")

    apply_update(mesocycle, update_data)

    db.commit()
    db.refresh(mesocycle)

    # Load full mesocycle with relationships
    mesocycle = (
        db.query(Mesocycle)
        .filter(Mesocycle.id == mesocycle_id)
        .options(
            joinedload(Mesocycle.workout_templates).joinedload(
                WorkoutTemplate.exercises
            )
        )
        .first()
    )

    # Load exercise details
    for workout in mesocycle.workout_templates:
        for workout_exercise in workout.exercises:
            exercise = (
                db.query(Exercise).filter(Exercise.id == workout_exercise.exercise_id).first()
            )
            if exercise:
                workout_exercise.exercise = exercise

    return mesocycle


@router.delete("/{mesocycle_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mesocycle(
    mesocycle_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Delete a mesocycle and all associated workout templates and exercises.
    """
    mesocycle = db.query(Mesocycle).filter(Mesocycle.id == mesocycle_id).first()

    if not mesocycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mesocycle template not found."
        )

    # Prevent deletion of stock mesocycles
    if mesocycle.is_stock:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Stock templates cannot be deleted.",
        )

    # Check ownership
    if mesocycle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own templates.",
        )

    # Block deletion if there are active instances
    _reject_if_instance_active(db, mesocycle_id, "delete")

    db.delete(mesocycle)
    db.commit()

    return None


@router.post(
    "/{mesocycle_id}/workout-templates",
    response_model=WorkoutTemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_workout_template(
    mesocycle_id: int,
    workout_data: WorkoutTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Add a workout template to an existing mesocycle.
    """
    mesocycle = db.query(Mesocycle).filter(Mesocycle.id == mesocycle_id).first()

    if not mesocycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mesocycle template not found."
        )

    # Prevent modifying stock mesocycles
    if mesocycle.is_stock:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Stock templates cannot be edited.",
        )

    # Check ownership
    if mesocycle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own templates.",
        )

    # Adding a day gives the template more workouts than the running instance
    # has sessions, so its calendar grows a row nothing can fill and the block
    # never reaches the workout count that marks it complete
    _reject_if_instance_active(db, mesocycle_id, "add a day to")

    # Create workout template
    workout_template = WorkoutTemplate(
        mesocycle_id=mesocycle_id,
        name=workout_data.name,
        description=workout_data.description,
        order_index=workout_data.order_index,
    )

    db.add(workout_template)
    db.flush()

    # Create workout exercises
    _reject_duplicate_exercises(workout_data)
    for exercise_data in workout_data.exercises:
        # Verify exercise exists and user has access
        exercise = db.query(Exercise).filter(Exercise.id == exercise_data.exercise_id).first()
        if not exercise:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="One of the selected exercises no longer exists.",
            )

        if exercise.is_custom and exercise.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to one of the selected exercises.",
            )

        workout_exercise = WorkoutExercise(
            workout_template_id=workout_template.id,
            exercise_id=exercise_data.exercise_id,
            order_index=exercise_data.order_index,
            target_sets=exercise_data.target_sets,
            weekly_set_increment=exercise_data.weekly_set_increment,
            target_reps_min=exercise_data.target_reps_min,
            target_reps_max=exercise_data.target_reps_max,
            starting_rir=exercise_data.starting_rir,
            ending_rir=exercise_data.ending_rir,
            notes=exercise_data.notes,
        )

        db.add(workout_exercise)

    db.commit()
    db.refresh(workout_template)

    # Load exercise details
    for workout_exercise in workout_template.exercises:
        exercise = db.query(Exercise).filter(Exercise.id == workout_exercise.exercise_id).first()
        if exercise:
            workout_exercise.exercise = exercise

    return workout_template


@router.put(
    "/{mesocycle_id}/workout-templates",
    response_model=MesocycleResponse,
)
async def replace_workout_templates(
    mesocycle_id: int,
    workout_templates_data: List[WorkoutTemplateCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Replace all workout templates for a mesocycle.

    Deletes all existing workout templates (and their exercises via cascade)
    and creates new ones from the provided data.
    """
    # Same ceiling the schema puts on days_per_week. Without it, saving 8 days
    # persists the workouts here and then 422s on the metadata write — a
    # half-saved template whose day count disagrees with its day cards.
    if len(workout_templates_data) > 7:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A mesocycle can have at most 7 training days per week.",
        )

    mesocycle = db.query(Mesocycle).filter(Mesocycle.id == mesocycle_id).first()

    if not mesocycle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Mesocycle template not found."
        )

    if mesocycle.is_stock:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Stock templates cannot be edited.",
        )

    if mesocycle.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own templates.",
        )

    # Replacing the templates rewrites them, and every session of a running
    # instance points at those rows — they would be detached from their plan
    _reject_if_instance_active(db, mesocycle_id, "edit")

    # Rows are reused rather than deleted and recreated. Instances key their
    # per-exercise note overrides by workout_exercise_id, so recreating the
    # rows silently orphaned every note the user had written against this
    # template's past runs.
    existing_templates = (
        db.query(WorkoutTemplate)
        .filter(WorkoutTemplate.mesocycle_id == mesocycle_id)
        .order_by(WorkoutTemplate.order_index)
        .all()
    )

    for position, workout_data in enumerate(workout_templates_data):
        _reject_duplicate_exercises(workout_data)

        if position < len(existing_templates):
            workout_template = existing_templates[position]
            workout_template.name = workout_data.name
            workout_template.description = workout_data.description
            workout_template.order_index = workout_data.order_index
        else:
            workout_template = WorkoutTemplate(
                mesocycle_id=mesocycle_id,
                name=workout_data.name,
                description=workout_data.description,
                order_index=workout_data.order_index,
            )
            db.add(workout_template)
            db.flush()

        # Match a row to the same exercise, so a note follows its lift even if
        # the day is reordered
        reusable = {}
        for workout_exercise in workout_template.exercises:
            reusable.setdefault(workout_exercise.exercise_id, []).append(workout_exercise)
        reused = set()

        for exercise_data in workout_data.exercises:
            exercise = db.query(Exercise).filter(Exercise.id == exercise_data.exercise_id).first()
            if not exercise:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="One of the selected exercises no longer exists.",
                )
            if exercise.is_custom and exercise.user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You don't have access to one of the selected exercises.",
                )

            fields = dict(
                exercise_id=exercise_data.exercise_id,
                order_index=exercise_data.order_index,
                target_sets=exercise_data.target_sets,
                weekly_set_increment=exercise_data.weekly_set_increment,
                target_reps_min=exercise_data.target_reps_min,
                target_reps_max=exercise_data.target_reps_max,
                starting_rir=exercise_data.starting_rir,
                ending_rir=exercise_data.ending_rir,
                notes=exercise_data.notes,
            )

            row = next(
                (r for r in reusable.get(exercise_data.exercise_id, []) if r.id not in reused),
                None,
            )
            if row is not None:
                reused.add(row.id)
                for field, value in fields.items():
                    setattr(row, field, value)
            else:
                db.add(WorkoutExercise(workout_template_id=workout_template.id, **fields))

        for workout_exercise in list(workout_template.exercises):
            if workout_exercise.id is not None and workout_exercise.id not in reused:
                db.delete(workout_exercise)

    # Drop days the template no longer has
    for workout_template in existing_templates[len(workout_templates_data):]:
        db.delete(workout_template)

    db.commit()

    # Load and return full mesocycle
    mesocycle = (
        db.query(Mesocycle)
        .filter(Mesocycle.id == mesocycle_id)
        .options(
            joinedload(Mesocycle.workout_templates).joinedload(
                WorkoutTemplate.exercises
            )
        )
        .first()
    )

    for workout in mesocycle.workout_templates:
        for workout_exercise in workout.exercises:
            exercise = (
                db.query(Exercise).filter(Exercise.id == workout_exercise.exercise_id).first()
            )
            if exercise:
                workout_exercise.exercise = exercise

    return mesocycle


