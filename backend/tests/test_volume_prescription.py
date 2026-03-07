"""Unit tests for the volume prescription algorithm."""

import math
from datetime import date, timedelta

import pytest

from app.services.volume_prescription import (
    MesocycleConfig,
    MuscleGroupProfile,
    UserState,
    MUSCLE_GROUP_PROFILES,
    DEFAULT_PROFILE,
    estimate_1rm,
    compute_target_rir,
    compute_weekly_volume_target,
    allocate_to_session,
    autoregulate_sets,
    _deload_sets,
    _compute_e1rm_trend_from_sets,
    _get_profile,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_config(
    total_weeks=4,
    days_per_week=3,
    frequency=None,
    day_indices=None,
) -> MesocycleConfig:
    """Build a MesocycleConfig for testing."""
    return MesocycleConfig(
        total_weeks=total_weeks,
        accumulation_weeks=max(total_weeks - 1, 1),
        days_per_week=days_per_week,
        muscle_group_frequency=frequency or {},
        muscle_group_day_indices=day_indices or {},
    )


# ---------------------------------------------------------------------------
# estimate_1rm
# ---------------------------------------------------------------------------

class TestEstimate1RM:
    def test_basic_calculation(self):
        # 100 kg x 10 reps, no RIR -> 100 * (1 + 10/30) = 133.33
        result = estimate_1rm(100, 10)
        assert round(result, 2) == 133.33

    def test_with_rir(self):
        # 100 kg x 8 reps, 2 RIR -> 100 * (1 + (8+2)/30) = 133.33
        result = estimate_1rm(100, 8, rir=2)
        assert round(result, 2) == 133.33

    def test_zero_weight(self):
        assert estimate_1rm(0, 10) == 0.0

    def test_zero_reps(self):
        # 100 kg x 0 reps -> 100 * (1 + 0/30) = 100
        result = estimate_1rm(100, 0)
        assert result == 100.0

    def test_none_rir(self):
        # None RIR treated as 0
        result = estimate_1rm(100, 10, rir=None)
        assert result == estimate_1rm(100, 10, rir=0)

    def test_single_rep(self):
        # 1RM itself: 200 kg x 1 rep, 0 RIR -> 200 * (1 + 1/30) ≈ 206.67
        result = estimate_1rm(200, 1, rir=0)
        assert round(result, 2) == 206.67


# ---------------------------------------------------------------------------
# compute_target_rir
# ---------------------------------------------------------------------------

class TestComputeTargetRIR:
    def test_week_1_of_4(self):
        # round(3 * (3-1) / (3-1)) = round(3) = 3
        assert compute_target_rir(1, 3) == 3

    def test_final_accumulation_week(self):
        # round(3 * (3-3) / (3-1)) = round(0) = 0
        assert compute_target_rir(3, 3) == 0

    def test_mid_week(self):
        # week 2 of 3 accum: round(3 * (3-2) / (3-1)) = round(1.5) = 2
        assert compute_target_rir(2, 3) == 2

    def test_single_accumulation_week(self):
        assert compute_target_rir(1, 1) == 0

    def test_five_accum_weeks(self):
        # week 1: round(3 * 4/4) = 3
        assert compute_target_rir(1, 5) == 3
        # week 3: round(3 * 2/4) = round(1.5) = 2
        assert compute_target_rir(3, 5) == 2
        # week 5: round(3 * 0/4) = 0
        assert compute_target_rir(5, 5) == 0


# ---------------------------------------------------------------------------
# compute_weekly_volume_target
# ---------------------------------------------------------------------------

class TestComputeWeeklyVolumeTarget:
    def test_week_1_chest(self):
        config = _make_config(total_weeks=4)
        # Chest: starting_mav=8, MRV=22
        # Week 1: 8 + (1-1)*2 = 8
        result = compute_weekly_volume_target("Chest", 1, config)
        assert result == 8

    def test_week_2_chest(self):
        config = _make_config(total_weeks=4)
        # Week 2: 8 + (2-1)*2 = 10
        result = compute_weekly_volume_target("Chest", 2, config)
        assert result == 10

    def test_week_3_chest(self):
        config = _make_config(total_weeks=4)
        # Week 3: 8 + (3-1)*2 = 12
        result = compute_weekly_volume_target("Chest", 3, config)
        assert result == 12

    def test_never_exceeds_mrv(self):
        config = _make_config(total_weeks=4)
        # Even with a very high week, should clamp to MRV (22)
        result = compute_weekly_volume_target("Chest", 10, config)
        assert result <= MUSCLE_GROUP_PROFILES["Chest"].mrv

    def test_never_below_starting_mav(self):
        config = _make_config(total_weeks=4)
        result = compute_weekly_volume_target("Chest", 0, config)
        assert result >= MUSCLE_GROUP_PROFILES["Chest"].starting_mav

    def test_unknown_muscle_group_uses_fallback(self):
        config = _make_config(total_weeks=4)
        # Week 1 starts at starting_mav for unknown group (default profile starting_mav=5)
        result = compute_weekly_volume_target("Unknown", 1, config)
        assert result == DEFAULT_PROFILE.starting_mav

    def test_quads_week_progression(self):
        config = _make_config(total_weeks=6)
        # starting_mav=8, MRV=20, +2/week: 8, 10, 12, 14, 16
        results = [compute_weekly_volume_target("Quadriceps", w, config) for w in range(1, 6)]
        assert results == [8, 10, 12, 14, 16]
        # Should be monotonically non-decreasing
        for i in range(1, len(results)):
            assert results[i] >= results[i - 1]

    def test_mrv_cap_reached(self):
        config = _make_config(total_weeks=10)
        # Quadriceps: starting_mav=8, MRV=20
        # Week 7: 8 + 6*2 = 20 (hits MRV)
        # Week 8: 8 + 7*2 = 22 -> capped at 20
        assert compute_weekly_volume_target("Quadriceps", 7, config) == 20
        assert compute_weekly_volume_target("Quadriceps", 8, config) == 20


# ---------------------------------------------------------------------------
# allocate_to_session
# ---------------------------------------------------------------------------

class TestAllocateToSession:
    def test_even_split(self):
        config = _make_config(
            frequency={"Chest": 2},
            day_indices={"Chest": [1, 3]},
        )
        # 12 / 2 = 6 each, no remainder
        assert allocate_to_session(12, "Chest", 1, config) == 6
        assert allocate_to_session(12, "Chest", 3, config) == 6

    def test_remainder_to_earlier_days(self):
        config = _make_config(
            frequency={"Chest": 2},
            day_indices={"Chest": [1, 3]},
        )
        # 13 / 2 = 6 base, remainder 1 -> day 1 gets 7, day 3 gets 6
        assert allocate_to_session(13, "Chest", 1, config) == 7
        assert allocate_to_session(13, "Chest", 3, config) == 6

    def test_session_cap_enforcement(self, caplog):
        config = _make_config(
            frequency={"Calves": 1},
            day_indices={"Calves": [1]},
        )
        # Calves cap = 100, prescribe 150 in 1 session -> capped at 100
        import logging
        with caplog.at_level(logging.WARNING, logger="app.services.volume_prescription"):
            result = allocate_to_session(150, "Calves", 1, config)
        assert result == 100
        assert "Session cap hit" in caplog.text

    def test_day_not_in_template_returns_0(self):
        config = _make_config(
            frequency={"Chest": 1},
            day_indices={"Chest": [1]},
        )
        assert allocate_to_session(10, "Chest", 2, config) == 0

    def test_never_returns_0_for_included_day(self):
        config = _make_config(
            frequency={"Core": 3},
            day_indices={"Core": [1, 2, 3]},
        )
        # Even with very low weekly target, should return at least 1
        result = allocate_to_session(1, "Core", 3, config)
        assert result >= 1

    def test_three_way_split_with_remainder(self):
        config = _make_config(
            frequency={"Back": 3},
            day_indices={"Back": [1, 3, 5]},
        )
        # 14 / 3 = 4 base, remainder 2 -> days 1,3 get 5, day 5 gets 4
        assert allocate_to_session(14, "Back", 1, config) == 5
        assert allocate_to_session(14, "Back", 3, config) == 5
        assert allocate_to_session(14, "Back", 5, config) == 4


# ---------------------------------------------------------------------------
# autoregulate_sets
# ---------------------------------------------------------------------------

class TestAutoregulateSets:
    def test_cold_start_no_change(self):
        config = _make_config(total_weeks=4)
        state = UserState(completed_sessions_count=1)
        result = autoregulate_sets(6, "Chest", 1, state, config)
        assert result == 6

    def test_mild_rir_reduction(self):
        config = _make_config(
            total_weeks=4,
            frequency={"Chest": 2},
            day_indices={"Chest": [1, 3]},
        )
        # target RIR for week 1, accum_weeks=3: 3
        # recent_avg_rir = 2.0 -> deviation = 3 - 2.0 = 1.0 > 0.75 -> -8%
        state = UserState(completed_sessions_count=5, recent_avg_rir=2.0)
        result = autoregulate_sets(10, "Chest", 1, state, config)
        # round(10 * 0.92) = round(9.2) = 9
        assert result == 9

    def test_strong_rir_reduction(self):
        config = _make_config(
            total_weeks=4,
            frequency={"Chest": 2},
            day_indices={"Chest": [1, 3]},
        )
        # target RIR for week 1: 3
        # recent_avg_rir = 1.0 -> deviation = 2.0 > 1.5 -> -15%
        state = UserState(completed_sessions_count=5, recent_avg_rir=1.0)
        result = autoregulate_sets(10, "Chest", 1, state, config)
        # round(10 * 0.85) = round(8.5) = 8
        assert result == 8

    def test_e1rm_decline(self):
        config = _make_config(
            total_weeks=4,
            frequency={"Chest": 2},
            day_indices={"Chest": [1, 3]},
        )
        # e1RM trend -2% -> -8%
        state = UserState(completed_sessions_count=5, e1rm_trend=-0.02)
        result = autoregulate_sets(10, "Chest", 1, state, config)
        # round(10 * 0.92) = 9
        assert result == 9

    def test_both_signals_stacking(self):
        config = _make_config(
            total_weeks=4,
            frequency={"Chest": 2},
            day_indices={"Chest": [1, 3]},
        )
        # RIR deviation 2.0 > 1.5 -> -15%
        # e1RM trend -4% -> -15%
        # total adjustment = 1.0 - 0.15 - 0.15 = 0.70
        state = UserState(
            completed_sessions_count=5,
            recent_avg_rir=1.0,
            e1rm_trend=-0.04,
        )
        result = autoregulate_sets(10, "Chest", 1, state, config)
        # round(10 * 0.70) = 7
        assert result == 7

    def test_floor_at_starting_mav_over_frequency(self):
        config = _make_config(
            total_weeks=4,
            frequency={"Chest": 2},
            day_indices={"Chest": [1, 3]},
        )
        # Chest starting_mav=8, freq=2 -> min = ceil(8/2) = 4
        # With heavy adjustments on small planned_sets
        state = UserState(
            completed_sessions_count=5,
            recent_avg_rir=0.5,
            e1rm_trend=-0.05,
        )
        # round(5 * 0.70) = round(3.5) = 4, floor = 4
        result = autoregulate_sets(5, "Chest", 1, state, config)
        assert result == 4


# ---------------------------------------------------------------------------
# _deload_sets
# ---------------------------------------------------------------------------

class TestDeloadSets:
    def test_normal_muscle_group(self):
        config = _make_config(
            frequency={"Chest": 2},
            day_indices={"Chest": [1, 3]},
        )
        # Chest starting_mav=8 -> weekly = max(8-2, 8//2) = max(6, 4) = 6
        # per session = ceil(6/2) = 3
        result = _deload_sets("Chest", config)
        assert result == 3

    def test_low_starting_mav_muscle_group(self):
        config = _make_config(
            frequency={"Core": 2},
            day_indices={"Core": [1, 3]},
        )
        # Core starting_mav=8 -> weekly = max(8-2, 8//2) = max(6, 4) = 6
        # per session = ceil(6/2) = 3
        result = _deload_sets("Core", config)
        assert result == 3

    def test_single_frequency(self):
        config = _make_config(
            frequency={"Biceps": 1},
            day_indices={"Biceps": [2]},
        )
        # Biceps starting_mav=9 -> weekly = max(9-2, 9//2) = max(7, 4) = 7
        # per session = ceil(7/1) = 7
        result = _deload_sets("Biceps", config)
        assert result == 7


# ---------------------------------------------------------------------------
# _compute_e1rm_trend_from_sets
# ---------------------------------------------------------------------------

class TestComputeE1rmTrend:
    def test_improving_trend(self):
        today = date.today()
        sets = [
            # Prior week (8-14 days ago): lighter
            (100.0, 10, 2, today - timedelta(days=10)),
            (100.0, 10, 2, today - timedelta(days=12)),
            # Recent week (0-6 days ago): heavier
            (110.0, 10, 2, today - timedelta(days=2)),
            (110.0, 10, 2, today - timedelta(days=4)),
        ]
        trend = _compute_e1rm_trend_from_sets(sets)
        assert trend is not None
        assert trend > 0  # Improving

    def test_declining_trend(self):
        today = date.today()
        sets = [
            # Prior week: heavier
            (110.0, 10, 2, today - timedelta(days=10)),
            (110.0, 10, 2, today - timedelta(days=12)),
            # Recent week: lighter
            (100.0, 10, 2, today - timedelta(days=2)),
            (100.0, 10, 2, today - timedelta(days=4)),
        ]
        trend = _compute_e1rm_trend_from_sets(sets)
        assert trend is not None
        assert trend < 0  # Declining

    def test_insufficient_data_returns_none(self):
        today = date.today()
        # Only recent data, no prior week
        sets = [
            (100.0, 10, 2, today - timedelta(days=2)),
        ]
        trend = _compute_e1rm_trend_from_sets(sets)
        assert trend is None

    def test_empty_sets(self):
        assert _compute_e1rm_trend_from_sets([]) is None

    def test_skips_zero_weight_sets(self):
        today = date.today()
        sets = [
            (0.0, 10, 2, today - timedelta(days=2)),
            (0.0, 10, 2, today - timedelta(days=10)),
        ]
        assert _compute_e1rm_trend_from_sets(sets) is None


# ---------------------------------------------------------------------------
# Integration: profile lookup
# ---------------------------------------------------------------------------

class TestProfileLookup:
    def test_all_12_groups_have_profiles(self):
        expected_groups = {
            "Quadriceps", "Hamstrings", "Chest", "Back", "Shoulders",
            "Biceps", "Triceps", "Glutes", "Calves", "Core", "Traps", "Forearms",
        }
        assert set(MUSCLE_GROUP_PROFILES.keys()) == expected_groups

    def test_unknown_group_returns_default(self):
        profile = _get_profile("Mythical Muscle")
        assert profile == DEFAULT_PROFILE
