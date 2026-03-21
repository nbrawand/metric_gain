"""Unit tests for the volume prescription algorithm."""

import math

import pytest

from app.services.volume_prescription import (
    MesocycleConfig,
    compute_target_rir,
    compute_weekly_volume_target,
    allocate_to_session,
    _deload_sets,
    _get_muscle_profile,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_config(
    total_weeks=4,
    days_per_week=3,
    frequency=None,
    day_indices=None,
    volume_profile=None,
) -> MesocycleConfig:
    """Build a MesocycleConfig for testing."""
    return MesocycleConfig(
        total_weeks=total_weeks,
        accumulation_weeks=max(total_weeks - 1, 1),
        days_per_week=days_per_week,
        muscle_group_frequency=frequency or {},
        muscle_group_day_indices=day_indices or {},
        volume_profile=volume_profile or {},
    )


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
# _get_muscle_profile
# ---------------------------------------------------------------------------

class TestGetMuscleProfile:
    def test_dict_format_exact_match(self):
        config = _make_config(volume_profile={"Chest": [8.0, 12.0, 16.0, 0.0]})
        assert _get_muscle_profile("Chest", config) == [8.0, 12.0, 16.0, 0.0]

    def test_dict_format_fallback_to_first(self):
        config = _make_config(volume_profile={"Chest": [8.0, 12.0]})
        result = _get_muscle_profile("Biceps", config)
        assert result == [8.0, 12.0]

    def test_list_format_backwards_compat(self):
        config = _make_config(volume_profile=[10.0, 14.0, 18.0, 0.0])
        assert _get_muscle_profile("Chest", config) == [10.0, 14.0, 18.0, 0.0]

    def test_empty_profile(self):
        config = _make_config(volume_profile={})
        assert _get_muscle_profile("Chest", config) == []


# ---------------------------------------------------------------------------
# compute_weekly_volume_target
# ---------------------------------------------------------------------------

class TestComputeWeeklyVolumeTarget:
    def test_dict_profile_per_muscle(self):
        config = _make_config(
            total_weeks=4,
            volume_profile={
                "Chest": [8.0, 11.0, 14.0, 0.0],
                "Biceps": [10.0, 14.0, 18.0, 0.0],
            },
        )
        assert compute_weekly_volume_target("Chest", 1, config) == 8
        assert compute_weekly_volume_target("Chest", 2, config) == 11
        assert compute_weekly_volume_target("Biceps", 1, config) == 10
        assert compute_weekly_volume_target("Biceps", 2, config) == 14

    def test_list_profile_backwards_compat(self):
        config = _make_config(
            total_weeks=4,
            volume_profile=[10.0, 14.0, 18.0, 0.0],
        )
        assert compute_weekly_volume_target("Chest", 1, config) == 10
        assert compute_weekly_volume_target("Chest", 3, config) == 18

    def test_fallback_when_no_profile(self):
        config = _make_config(total_weeks=4, volume_profile={})
        # Fallback: max(1, 4 + (week-1)*2)
        assert compute_weekly_volume_target("Chest", 1, config) == 4
        assert compute_weekly_volume_target("Chest", 2, config) == 6

    def test_minimum_1_set(self):
        config = _make_config(volume_profile={"Chest": [0.4]})
        assert compute_weekly_volume_target("Chest", 1, config) == 1

    def test_rounding(self):
        config = _make_config(volume_profile={"Chest": [10.6]})
        assert compute_weekly_volume_target("Chest", 1, config) == 11


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
# _deload_sets
# ---------------------------------------------------------------------------

class TestDeloadSets:
    def test_zero_deload_volume(self):
        config = _make_config(
            total_weeks=4,
            frequency={"Chest": 2},
            day_indices={"Chest": [1, 3]},
            volume_profile={"Chest": [10.0, 14.0, 18.0, 0.0]},
        )
        # Deload week volume is 0 -> returns 0
        result = _deload_sets("Chest", config)
        assert result == 0

    def test_nonzero_deload_volume(self):
        config = _make_config(
            total_weeks=4,
            frequency={"Chest": 2},
            day_indices={"Chest": [1, 3]},
            volume_profile={"Chest": [10.0, 14.0, 18.0, 4.0]},
        )
        # 4 / 2 = 2 per session
        result = _deload_sets("Chest", config)
        assert result == 2

    def test_fallback_when_no_profile(self):
        config = _make_config(
            total_weeks=4,
            frequency={"Chest": 2},
            day_indices={"Chest": [1, 3]},
            volume_profile={},
        )
        # Fallback: weekly=2, ceil(2/2)=1
        result = _deload_sets("Chest", config)
        assert result == 1

    def test_single_frequency(self):
        config = _make_config(
            total_weeks=3,
            frequency={"Biceps": 1},
            day_indices={"Biceps": [2]},
            volume_profile={"Biceps": [10.0, 14.0, 3.0]},
        )
        # 3 / 1 = 3
        result = _deload_sets("Biceps", config)
        assert result == 3
