"""
Optimal Training Volume Algorithm

Computes the optimal number of sets per week per body part across a mesocycle.
Uses a 5-state model (fitness, fatigue, fatigue sensitivity, adaptation threshold,
performance) to search for the linear ramp profile that maximizes end-of-block
performance.
"""

import math

# Muscle groups that get higher fatigue multipliers (compound movement fatigue)
BIG_MUSCLE_GROUPS = {"Chest", "Back", "Quadriceps", "Hamstrings", "Glutes"}
BIG_MUSCLE_FATIGUE_MULTIPLIER = 1.5  # k3 and kappa0 are 1.5x for big groups


DEFAULT_PROFILES = {
    "beginner": {
        "k1": 7.0, "k3": 0.045, "kappa0": 0.15,
        "tau1": 10.0, "tau2": 1.0, "tau3": 2.0, "tau_alpha": 3.5,
        "alpha0": 0.0,
    },
    "intermediate": {
        "k1": 3.5, "k3": 0.012, "kappa0": 0.05,
        "tau1": 10.0, "tau2": 1.0, "tau3": 2.0, "tau_alpha": 3.5,
        "alpha0": 0.0,
    },
    "advanced": {
        "k1": 2.5, "k3": 0.006, "kappa0": 0.05,
        "tau1": 10.0, "tau2": 1.0, "tau3": 2.0, "tau_alpha": 3.5,
        "alpha0": 2.0,
    },
}


def simulate(params: dict, volume_profile: list[float]) -> dict:
    """
    Run the model forward given a volume profile.

    Returns dict with arrays: g, h, kappa, alpha, eff, p
    """
    k1 = params["k1"]
    k3 = params["k3"]
    kappa0 = params["kappa0"]
    tau1 = params["tau1"]
    tau2 = params["tau2"]
    tau3 = params["tau3"]
    tau_alpha = params["tau_alpha"]
    alpha0 = params["alpha0"]

    d1 = math.exp(-1.0 / tau1)
    d2 = math.exp(-1.0 / tau2)
    d3 = math.exp(-1.0 / tau3)
    d_a = math.exp(-1.0 / tau_alpha)

    n_weeks = len(volume_profile)
    result = {
        "g": [0.0] * n_weeks,
        "h": [0.0] * n_weeks,
        "kappa": [0.0] * n_weeks,
        "alpha": [0.0] * n_weeks,
        "eff": [0.0] * n_weeks,
        "p": [0.0] * n_weeks,
    }

    g = 0.0
    h = 0.0
    kap = kappa0
    alpha = alpha0
    p0 = 100.0

    for n in range(n_weeks):
        w = volume_profile[n]

        if n > 0:
            kap = kap * d3 + k3 * volume_profile[n - 1]
            alpha = alpha * d_a + (1.0 - d_a) * volume_profile[n - 1]

        eff = max(w - alpha, 0.0)
        g = g * d1 + k1 * math.log(eff + 1.0)
        h = h * d2 + w * kap
        p = p0 + g - h

        result["g"][n] = round(g, 4)
        result["h"][n] = round(h, 4)
        result["kappa"][n] = round(kap, 4)
        result["alpha"][n] = round(alpha, 4)
        result["eff"][n] = round(eff, 4)
        result["p"][n] = round(p, 4)

    return result


def _frange(start: float, stop: float, step: float) -> list[float]:
    """Float range helper."""
    vals = []
    v = start
    while v < stop + 1e-9:
        vals.append(round(v, 4))
        v += step
    return vals


def compute_optimal_profile(
    params: dict,
    total_weeks: int,
    w_max: float = 30.0,
) -> dict:
    """
    Compute optimal sets/week for each week of a mesocycle.
    Last week is always deload.

    Returns dict with volume_profile, simulation, peak_performance, peak_week.
    """
    ramp_weeks = total_weeks - 1  # last week is deload
    deload_count = 1

    if ramp_weeks < 1:
        raise ValueError("total_weeks must be >= 2")

    d1 = math.exp(-1.0 / params["tau1"])
    d2 = math.exp(-1.0 / params["tau2"])
    d3 = math.exp(-1.0 / params["tau3"])
    d_a = math.exp(-1.0 / params["tau_alpha"])
    k1 = params["k1"]
    k3 = params["k3"]
    kappa0 = params["kappa0"]
    alpha0 = params["alpha0"]

    best_score = -1e9
    best_profile = None

    step = 0.5
    w_starts = _frange(max(2.0, 0.0), min(w_max, 18.0), step)
    w_ends = _frange(max(2.0, 0.0), w_max + step, step)
    deload_vols = [0.0, 2.0, 3.0, 4.0]

    for w_start in w_starts:
        for w_end in w_ends:
            if w_end < w_start:
                continue

            for deload_vol in deload_vols:
                # Build profile
                profile = []
                for n in range(ramp_weeks):
                    if ramp_weeks == 1:
                        profile.append(w_start)
                    else:
                        w = w_start + (w_end - w_start) * n / (ramp_weeks - 1)
                        profile.append(w)
                for _ in range(deload_count):
                    profile.append(deload_vol)

                # Inline simulation for speed
                g = 0.0
                h = 0.0
                kap = kappa0
                alpha = alpha0

                for n in range(total_weeks):
                    w = profile[n]
                    if n > 0:
                        kap = kap * d3 + k3 * profile[n - 1]
                        alpha = alpha * d_a + (1.0 - d_a) * profile[n - 1]
                    eff = max(w - alpha, 0.0)
                    g = g * d1 + k1 * math.log(eff + 1.0)
                    h = h * d2 + w * kap

                p_final = 100.0 + g - h

                if p_final > best_score:
                    best_score = p_final
                    best_profile = profile[:]

    # Clamp output sets to sane range
    MIN_TRAINING_SETS = 4.0
    MAX_TRAINING_SETS = 25.0
    for i in range(len(best_profile)):
        if i < total_weeks - 1:  # training weeks only, not deload
            best_profile[i] = max(MIN_TRAINING_SETS, min(best_profile[i], MAX_TRAINING_SETS))

    # Full simulation on the clamped profile
    sim = simulate(params, best_profile)

    peak_val = max(sim["p"])
    peak_idx = sim["p"].index(peak_val)

    display_profile = [round(v, 1) for v in best_profile]

    return {
        "volume_profile": display_profile,
        "simulation": sim,
        "peak_performance": round(peak_val, 2),
        "peak_week": peak_idx + 1,
    }


def create_mesocycle_volume(
    experience_level: str,
    total_weeks: int,
    w_max: float = 30.0,
) -> dict:
    """
    High-level API: given an experience level and total weeks, return the
    optimal volume profile with simulation data.

    Last week is always deload.
    """
    params = DEFAULT_PROFILES.get(experience_level)
    if not params:
        raise ValueError(f"Unknown experience level: {experience_level}")

    result = compute_optimal_profile(params, total_weeks, w_max=w_max)
    sim = result["simulation"]

    weeks = []
    for i in range(total_weeks):
        is_deload = i == total_weeks - 1
        weeks.append({
            "week": i + 1,
            "sets": result["volume_profile"][i],
            "type": "deload" if is_deload else "training",
            "performance": sim["p"][i],
            "fitness": sim["g"][i],
            "fatigue": sim["h"][i],
            "kappa": sim["kappa"][i],
            "alpha": sim["alpha"][i],
            "effective_volume": sim["eff"][i],
        })

    return {
        "weeks": weeks,
        "peak_performance": result["peak_performance"],
        "peak_week": result["peak_week"],
    }


def get_default_muscle_params(experience_level: str, muscle_group: str) -> dict:
    """Return default params for a muscle group, with big-muscle fatigue scaling."""
    base = DEFAULT_PROFILES.get(experience_level)
    if not base:
        base = DEFAULT_PROFILES["intermediate"]
    params = base.copy()
    if muscle_group in BIG_MUSCLE_GROUPS:
        params["k3"] *= BIG_MUSCLE_FATIGUE_MULTIPLIER
        params["kappa0"] *= BIG_MUSCLE_FATIGUE_MULTIPLIER
    return params


def create_mesocycle_volume_for_params(params: dict, total_weeks: int, w_max: float = 30.0) -> dict:
    """Like create_mesocycle_volume but accepts raw params dict instead of experience_level."""
    result = compute_optimal_profile(params, total_weeks, w_max=w_max)
    sim = result["simulation"]

    weeks = []
    for i in range(total_weeks):
        is_deload = i == total_weeks - 1
        weeks.append({
            "week": i + 1,
            "sets": result["volume_profile"][i],
            "type": "deload" if is_deload else "training",
            "performance": sim["p"][i],
            "fitness": sim["g"][i],
            "fatigue": sim["h"][i],
            "kappa": sim["kappa"][i],
            "alpha": sim["alpha"][i],
            "effective_volume": sim["eff"][i],
        })

    return {
        "weeks": weeks,
        "peak_performance": result["peak_performance"],
        "peak_week": result["peak_week"],
    }


def ensure_user_muscle_params(db, user, muscle_groups: list[str]) -> dict:
    """Load or create UserMuscleParams for the given muscle groups.

    Returns dict of muscle_group -> UserMuscleParams.
    """
    from app.models.user_muscle_params import UserMuscleParams

    existing = db.query(UserMuscleParams).filter(
        UserMuscleParams.user_id == user.id,
        UserMuscleParams.muscle_group.in_(muscle_groups)
    ).all()
    existing_map = {p.muscle_group: p for p in existing}

    created = False
    for mg in muscle_groups:
        if mg not in existing_map:
            defaults = get_default_muscle_params(user.experience_level, mg)
            param = UserMuscleParams(user_id=user.id, muscle_group=mg, **defaults)
            db.add(param)
            existing_map[mg] = param
            created = True

    if created:
        db.flush()
    return existing_map
