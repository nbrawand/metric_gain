Do the following. After each make sure to check your work, commit, push it, and
check it off the list

[x] make the days collapsable during the mesocycle creation screen
[x] When a user adds, removes, swaps an exercise during a workout, the same day
of future weeks in the mesocycle should keep those changes.
[x] Go online and do research for missing mesocycle templates if you find
reputable ones then add them to the library. Do the same for the exercise
library.


## Competitive roadmap (vs RP Hypertrophy)

Ordered deliberately. Everything under "Correctness" is a defect — the plan we
hand lifters is wrong today — and the autoregulation bet automates those same
numbers, so building it first would just automate the wrong answer. Work the
sections in order.

Positioning these serve: *"it adapts from what you lifted, not from a survey."*
RP charges $34.99/mo and asks 5 subjective questions per muscle per session
(soreness, pump, workload, joint pain, disruption) to approximate what our
logged sets already measure objectively. Don't copy the survey.

### Correctness — the current plan is wrong

[x] Size the weight jump to the lift instead of always rounding up to the next
multiple of 5. `compute_progression_targets` in
`backend/app/services/progression.py` advertises +2.5% but the `min 2.5` floor
plus `round_to_nearest_5` makes every jump +5 lb. Measured: 15->20 (+33%),
20->25 (+25%), 30->35 (+17%), but 225->230 (+2.2%). That is backwards — light
isolation work gets an unachievable target every week while heavy compounds
barely move. Round to the increment actually available for that exercise
(barbell 5, dumbbell 5, machine/cable per-stack, microplates where relevant),
and keep the percentage as the driver rather than the floor.

[x] Only add weight when the last performance actually hit its target.
`compute_progression_targets` takes prev weight/reps but ignores `target_reps`
and `target_rir`, so missing 8 reps at 0 RIR still earns a heavier target next
week. Hold (or back off) on a miss.

[x] Add kg support. `lbs` is hardcoded in
`frontend/src/pages/WorkoutExecution.tsx` (search `target: ${...} lbs`) and
`round_to_nearest_5` is meaningless on kg plates, which go in 2.5/1.25 steps.
Needs a user-level unit preference; `users.preferences` JSON already exists.
    Stored in preferences as `weight_unit`. Weights are kept as the number the
    lifter typed, so switching units converts the logged history server-side —
    otherwise a 225 lb squat silently becomes 225 kg and feeds every future
    target. Rounding happens in the chosen unit, never by converting a pounds
    answer. Toggle lives in the nav menu.

[x] Add a deload week. `compute_target_rir` ramps `[3,2,2,1,1,0]` over a 6-week
block, so RIR hits 0 on the final week and the block just ends — the next block
then starts with a fully fatigued lifter. RP's final week *is* the deload
(volume drops to maintenance, ~6 sets/muscle/week). Decide whether the deload
is an extra week or the last planned week, and make the calendar and the
"blocks complete when every session is done" logic agree with the choice.
    Decided: an extra week. `weeks` still means training weeks; instances carry
    `includes_deload` and expose `total_weeks`. Blocks already in flight keep
    their old span (the flag is stored, not derived) since they have no
    sessions for that week.

[x] Warn on unrecoverable volume at plan time. There is no ceiling at all — the
old auto-volume setup and per-session cap were removed in `2812ab0`/`855754d`.
Five chest exercises at 3 starting sets +2/week generates 15/25/35/45/55/65
sets per week; RP's chest MRV is ~22. The volume chart
(`frontend/src/utils/volume.ts`, `MuscleGroupVolumeChart`) already computes
these totals for the review step — flag the muscle groups that blow past a
sane weekly ceiling instead of rendering the number silently.
    Ceilings live in `volume.ts` as `WEEKLY_SET_CEILINGS`, roughly where the
    published MRV ranges top out. The review step lists the offending groups
    (first week crossed, plus the peak) and the chart draws the ceiling as a
    dashed line with over-cap weeks in amber. It warns rather than blocks — it
    is still the lifter's plan.

### The strategic bet

[x] Performance-driven volume autoregulation, from data we already store. Every
set records target weight/reps/RIR and actual weight/reps, which is enough to
score performance vs target with **zero extra taps from the lifter**. Replace
the fixed `weekly_set_increment` (chosen once at creation, replayed for the
whole block by `compute_sets_for_week`) with: hit targets on all sets -> +1 set
next week; missed on one -> hold; missed on most -> drop a set. Cap against a
per-muscle-group ceiling. Note RP manages volume per *muscle group* while we
increment per *exercise* — recovery happens per muscle, so the cap belongs at
the muscle-group level. Keep the manual increment as an override for lifters
who want to drive it themselves.
    Done. On by default for new blocks (toggle when starting one), which also
    means sessions generate flat instead of pre-ramped — pre-ramping and then
    autoregulating would apply two increases to the same week. Cap enforced at
    the muscle-group level; ceilings are duplicated in
    `backend/app/services/autoregulation.py` and `frontend/src/utils/volume.ts`
    with a test asserting they match. Blocks already running keep their fixed
    plan (`autoregulate_volume` is stored, not derived).

### Table stakes we're missing

[ ] Progress analytics. There is no route for it at all (see the `Route` list
in `frontend/src/App.tsx`) — we store every set ever logged and show none of it
back. Estimated 1RM over time, weekly volume per muscle group across blocks,
PR history. Reviewers ding RP for weak analytics, so this is cheap ground.

[ ] Optional rest timer. **Product decision needed first — don't just build
it.** The rest/log info modals in `frontend/src/pages/WorkoutExecution.tsx`
currently say "No timer here on purpose," which is a defensible stance, but a
missing timer is one of the most-requested features in RP's own App Store
reviews. Suggest opt-in and off by default, so the philosophy stays the default
without being a reason to churn.

[ ] Plate calculator and warmup-set guidance. Both are recurring complaints
about RP; both are self-contained and need no backend work.

[ ] Exercise demo media. RP ships 250+ technique videos. Do not try to match
that — producing and hosting them is a cost we can't amortize. Link out to a
reputable demo per exercise instead; `exercises` already has a `description`
column and adding a `demo_url` is cheap.

[x] Bodypart-specialization templates (chest focus, arm focus, glute focus).
RP has 100+ templates against our 10 — the answer is a strong builder plus a
handful of good blocks, not 100 we can't maintain. Overlaps with the template
research item above; do them together.
    Done with the template research item: Chest Focus Upper/Lower and Arm Focus
    Upper/Lower added (Glute & Lower Body Focus already existed). Both hold
    everything outside the focus at maintenance rather than adding volume on
    top, and say so in the description. Library is now 16 templates.

### Marketing, not code

[ ] Say "works offline" on the landing page. Neither `Landing.tsx` nor
`HowItWorks.tsx` mentions it at all today, and it is our one clear head-to-head
win: RP has no offline mode and their top App Store complaint is verbatim
"needs to work without internet." We already have the sync queue and it's
hardened.
