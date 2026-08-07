"""Unit tests for the set-count and target progression helpers."""

import pytest

from app.services.progression import (
    compute_sets_for_week,
    compute_target_rir,
    compute_progression_targets,
    increment_for_equipment,
    round_to_increment,
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

    def test_rounds_half_up_like_the_frontend(self):
        # 7 weeks lands on .5 twice; Python's round() would give 2 and 0 there,
        # disagreeing with Math.round in the workout page.
        assert [compute_target_rir(w, 7) for w in range(1, 8)] == [3, 3, 2, 2, 1, 1, 0]

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

    def test_weight_increase_rounds_to_the_loadable_step(self):
        # 101 * 1.025 = 103.5 -> 105 on 5s (moved up), so reps carry over
        weight, reps = compute_progression_targets(101, 8, 12)
        assert weight == 105
        assert reps == 8

    def test_heavy_weight_moves_by_roughly_the_percentage(self):
        # 225 * 1.025 = 230.6 -> 230, which is +2.2%
        weight, reps = compute_progression_targets(225, 5, 12)
        assert weight == 230
        assert reps == 5

    def test_light_weight_holds_and_asks_for_a_rep(self):
        """The defect this replaces: a min-2.5 floor made every jump a full step.

        15 -> 20 is +33%, unachievable week after week. Below the weight where
        2.5% clears a step, double progression is the right answer.
        """
        for prev in (15, 20, 30, 60, 80):
            weight, reps = compute_progression_targets(prev, 10, 12, rep_ceiling=12)
            assert weight == prev, f"{prev} should hold, got {weight}"
            assert reps == 11

    def test_reps_at_the_ceiling_convert_into_a_step_up(self):
        """Otherwise a held weight would ask for one more rep forever."""
        weight, reps = compute_progression_targets(60, 12, 12, rep_ceiling=12)
        assert weight == 65
        assert reps == 12

    def test_without_a_ceiling_reps_simply_climb(self):
        weight, reps = compute_progression_targets(60, 12, 12)
        assert weight == 60
        assert reps == 13

    @pytest.mark.parametrize(
        "prev,max_pct",
        [(15, 20.0), (20, 20.0), (30, 20.0), (100, 6.0), (225, 4.0)],
    )
    def test_no_jump_is_wildly_out_of_proportion(self, prev, max_pct):
        """The old behaviour gave 15 -> 20 (+33%) but 225 -> 230 (+2.2%)."""
        weight, _ = compute_progression_targets(prev, 10, 12, rep_ceiling=12)
        pct = (weight - prev) / prev * 100
        assert pct <= max_pct, f"{prev} -> {weight} is +{pct:.1f}%"

    def test_a_finer_increment_lets_lighter_weights_move(self):
        # A lift loaded by a single plate takes 2.5, so 100 * 1.025 lands
        # exactly instead of being rounded away
        weight, _ = compute_progression_targets(100, 10, 12, increment=2.5)
        assert weight == 102.5


class TestIncrementForEquipment:
    def test_barbells_dumbbells_and_stacks_use_five(self):
        for equipment in ("Barbell", "Dumbbells", "Cable Machine", "Machine",
                          "Smith Machine", "Trap Bar", "EZ Bar", "Leg Press Machine"):
            assert increment_for_equipment(equipment) == 5.0, equipment

    def test_added_weight_lifts_use_two_and_a_half(self):
        for equipment in ("Bodyweight", "Pull-up Bar", "Parallel Bars", "Plate"):
            assert increment_for_equipment(equipment) == 2.5, equipment

    def test_a_combination_is_only_as_fine_as_its_finest_option(self):
        assert increment_for_equipment("Barbell/Bodyweight") == 2.5
        assert increment_for_equipment("Dumbbells/Bodyweight") == 2.5

    def test_unknown_or_missing_equipment_falls_back_to_five(self):
        assert increment_for_equipment(None) == 5.0
        assert increment_for_equipment("") == 5.0
        assert increment_for_equipment("Sandbag") == 5.0

    def test_every_seeded_equipment_string_maps_to_a_loadable_step(self):
        from app.utils.seed_exercises import DEFAULT_EXERCISES

        for exercise in DEFAULT_EXERCISES:
            step = increment_for_equipment(exercise["equipment"])
            assert step in (2.5, 5.0), f"{exercise['name']}: {step}"


class TestRoundToIncrement:
    def test_halves_round_up(self):
        # Rounding a half-step down would stall the target forever
        assert round_to_increment(102.5, 5) == 105
        assert round_to_increment(101.25, 2.5) == 102.5

    def test_leaves_exact_multiples_alone(self):
        assert round_to_increment(100, 5) == 100
        assert round_to_increment(102.5, 2.5) == 102.5

    def test_carries_no_float_dust(self):
        # 2.5 * 41 in binary floating point is 102.50000000000001
        assert round_to_increment(102.4, 2.5) == 102.5
        assert str(round_to_increment(102.4, 2.5)) == "102.5"
