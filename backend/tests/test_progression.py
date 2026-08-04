"""Unit tests for the set-count and target progression helpers."""

from app.services.progression import (
    compute_sets_for_week,
    compute_target_rir,
    compute_progression_targets,
)


class TestComputeSetsForWeek:
    def test_zero_increment_is_flat(self):
        for week in range(1, 7):
            assert compute_sets_for_week(3, 0, week) == 3

    def test_half_set_increment_rounds_half_up(self):
        # 3, 3.5, 4, 4.5, 5, 5.5 -> 3, 4, 4, 5, 5, 6
        assert [compute_sets_for_week(3, 0.5, w) for w in range(1, 7)] == [3, 4, 4, 5, 5, 6]

    def test_week_one_equals_target_sets(self):
        assert compute_sets_for_week(2, 1.5, 1) == 2
        assert compute_sets_for_week(5, 0.25, 1) == 5

    def test_whole_increment(self):
        assert [compute_sets_for_week(2, 1, w) for w in range(1, 5)] == [2, 3, 4, 5]

    def test_minimum_one_set(self):
        assert compute_sets_for_week(0, 0, 1) == 1


class TestComputeTargetRir:
    def test_four_week_ramp(self):
        assert [compute_target_rir(w, 4) for w in range(1, 5)] == [3, 2, 1, 0]

    def test_final_week_is_zero(self):
        for total in (2, 4, 6, 8):
            assert compute_target_rir(total, total) == 0

    def test_first_week_is_three(self):
        for total in (2, 4, 6, 8):
            assert compute_target_rir(1, total) == 3

    def test_single_week_returns_zero(self):
        assert compute_target_rir(1, 1) == 0
        assert compute_target_rir(1, 0) == 0


class TestComputeProgressionTargets:
    def test_no_history_keeps_fallback_reps(self):
        assert compute_progression_targets(None, None, 12) == (None, 12)

    def test_reps_only_history(self):
        assert compute_progression_targets(None, 10, 12) == (None, 10)

    def test_weight_increase_rounds_to_five(self):
        # 101 + max(2.525, 2.5) = 103.525 -> rounds to 105 (moved up), reps carry over
        weight, reps = compute_progression_targets(101, 8, 12)
        assert weight == 105
        assert reps == 8

    def test_no_weight_movement_bumps_reps(self):
        # 60 + max(1.5, 2.5) = 62.5 rounds back to 60, so reps bump instead
        weight, reps = compute_progression_targets(60, 10, 12)
        assert weight == 60
        assert reps == 11
