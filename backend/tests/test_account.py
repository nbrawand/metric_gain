"""Self-service export and deletion.

The privacy policy promised both of these in writing while they were handled
by email. These cover the two things that make the promise real: an export
that actually contains the user's training history, and a delete that removes
it without taking anyone else's with it.
"""

import pytest
import stripe
from fastapi import status

from app.models.exercise import Exercise
from app.models.mesocycle import Mesocycle, MesocycleInstance
from app.models.user import User
from app.models.workout_session import WorkoutSession, WorkoutSet
from tests.conftest import TestingSessionLocal
from tests.test_workout_sessions import (  # noqa: F401 - fixtures
    auth_headers,
    sample_exercise_id,
)

EMAIL = "workout_test@example.com"


@pytest.fixture(autouse=True)
def clean_limiter():
    """The limiter is process-global and both endpoints allow only 5/minute.

    Without this the sixth test in the file gets a 429 instead of the thing it
    was written to check.
    """
    from app.utils.ratelimit import limiter

    limiter.reset()
    yield
    limiter.reset()


@pytest.fixture
def trained_account(client, auth_headers, sample_exercise_id):
    """An account with a template, a running block and logged sets."""
    template = client.post(
        "/v1/mesocycles/",
        json={
            "name": "Block To Delete",
            "weeks": 3,
            "days_per_week": 1,
            "workout_templates": [
                {
                    "name": "Day 1",
                    "order_index": 0,
                    "exercises": [
                        {
                            "exercise_id": sample_exercise_id,
                            "order_index": 0,
                            "target_sets": 3,
                            "weekly_set_increment": 0.0,
                            "target_reps_min": 8,
                            "target_reps_max": 10,
                            "starting_rir": 3,
                            "ending_rir": 0,
                        }
                    ],
                }
            ],
        },
        headers=auth_headers,
    ).json()
    instance = client.post(
        "/v1/mesocycle-instances/",
        json={"mesocycle_template_id": template["id"]},
        headers=auth_headers,
    ).json()
    sessions = client.get(
        f"/v1/workout-sessions/?mesocycle_instance_id={instance['id']}",
        headers=auth_headers,
    ).json()
    # By week number, not by position: the list comes back newest first, and
    # the last week is the deload, which carries fewer sets than the plan
    first = next(s["id"] for s in sessions if s["week_number"] == 1)
    detail = client.get(f"/v1/workout-sessions/{first}", headers=auth_headers).json()
    for workout_set in detail["workout_sets"]:
        client.patch(
            f"/v1/workout-sessions/{first}/sets/{workout_set['id']}",
            json={"weight": 185, "reps": 9, "rir": 2},
            headers=auth_headers,
        )

    client.post(
        "/v1/exercises/",
        json={
            "name": "My Own Lift",
            "muscle_group": "Chest",
            "equipment": "Barbell",
        },
        headers=auth_headers,
    )
    return {"template": template, "instance": instance}


class TestExport:
    def test_export_carries_the_training_history(
        self, client, auth_headers, trained_account
    ):
        response = client.get("/v1/account/export", headers=auth_headers)
        assert response.status_code == status.HTTP_200_OK

        data = response.json()
        assert data["profile"]["email"] == EMAIL
        assert [t["name"] for t in data["mesocycle_templates"]] == ["Block To Delete"]
        assert len(data["mesocycle_instances"]) == 1
        assert data["workout_sessions"], "the block's sessions are missing"
        assert [e["name"] for e in data["custom_exercises"]] == ["My Own Lift"]

        logged = [s for s in data["workout_sets"] if s["weight"]]
        assert len(logged) == 3
        assert {s["reps"] for s in logged} == {9}

    def test_export_is_served_as_a_file(self, client, auth_headers):
        """The point of the right is to walk away with a copy."""
        response = client.get("/v1/account/export", headers=auth_headers)
        assert "attachment" in response.headers["content-disposition"]
        assert ".json" in response.headers["content-disposition"]

    def test_export_leaves_out_the_stock_library(self, client, auth_headers):
        """Hundreds of rows that are identical for every user are not their data."""
        data = client.get("/v1/account/export", headers=auth_headers).json()
        assert data["custom_exercises"] == []

    def test_export_holds_no_other_account(
        self, client, make_auth_headers, trained_account
    ):
        stranger = make_auth_headers("stranger@example.com", "Stranger")
        data = client.get("/v1/account/export", headers=stranger).json()

        assert data["profile"]["email"] == "stranger@example.com"
        assert data["mesocycle_templates"] == []
        assert data["workout_sessions"] == []
        assert data["workout_sets"] == []

    def test_export_needs_a_token(self, client):
        assert client.get("/v1/account/export").status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )


class TestDeletion:
    def test_the_typed_email_has_to_match(self, client, auth_headers, trained_account):
        response = client.request(
            "DELETE",
            "/v1/account",
            json={"confirm_email": "someone.else@example.com"},
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

        db = TestingSessionLocal()
        try:
            assert db.query(User).filter(User.email == EMAIL).first() is not None
        finally:
            db.close()

    def test_confirmation_ignores_case_and_padding(self, client, auth_headers):
        response = client.request(
            "DELETE",
            "/v1/account",
            json={"confirm_email": f"  {EMAIL.upper()}  "},
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_deletion_takes_the_training_data_with_it(
        self, client, auth_headers, trained_account
    ):
        response = client.request(
            "DELETE",
            "/v1/account",
            json={"confirm_email": EMAIL},
            headers=auth_headers,
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT

        db = TestingSessionLocal()
        try:
            user = db.query(User).filter(User.email == EMAIL).first()
            assert user is None

            # Nothing may outlive the account it belonged to
            assert db.query(Mesocycle).filter(Mesocycle.user_id.isnot(None)).count() == 0
            assert db.query(MesocycleInstance).count() == 0
            assert db.query(WorkoutSession).count() == 0
            assert db.query(WorkoutSet).count() == 0
            assert db.query(Exercise).filter(Exercise.user_id.isnot(None)).count() == 0
        finally:
            db.close()

    def test_the_stock_library_survives_a_deletion(self, client, auth_headers):
        """The cascade must reach the user's rows and stop there."""
        db = TestingSessionLocal()
        try:
            before = db.query(Exercise).filter(Exercise.user_id.is_(None)).count()
        finally:
            db.close()
        assert before > 0

        client.request(
            "DELETE", "/v1/account", json={"confirm_email": EMAIL}, headers=auth_headers
        )

        db = TestingSessionLocal()
        try:
            assert db.query(Exercise).filter(Exercise.user_id.is_(None)).count() == before
        finally:
            db.close()

    def test_one_deletion_does_not_touch_another_account(
        self, client, auth_headers, make_auth_headers, trained_account
    ):
        other = make_auth_headers("keeper@example.com", "Keeper")
        client.post(
            "/v1/exercises/",
            json={"name": "Keeper Lift", "muscle_group": "Back", "equipment": "Cable"},
            headers=other,
        )

        client.request(
            "DELETE", "/v1/account", json={"confirm_email": EMAIL}, headers=auth_headers
        )

        db = TestingSessionLocal()
        try:
            keeper = db.query(User).filter(User.email == "keeper@example.com").first()
            assert keeper is not None
            assert (
                db.query(Exercise).filter(Exercise.user_id == keeper.id).count() == 1
            )
        finally:
            db.close()

    def test_an_admin_action_log_outlives_the_account(self, client, auth_headers):
        """The policy says so, so it needs to keep being true.

        An audit entry records what an administrator did to an account. A
        deletion request from that account is not a reason to lose it.

        Note the test DB does not enforce foreign keys, so this covers the
        row surviving, not the ON DELETE SET NULL that blanks target_user_id
        in Postgres.
        """
        from app.models.admin_audit import AdminAuditLog

        db = TestingSessionLocal()
        try:
            user = db.query(User).filter(User.email == EMAIL).first()
            db.add(
                AdminAuditLog(
                    actor_email="admin@example.com",
                    action="grant_trial",
                    target_user_id=user.id,
                    target_email=EMAIL,
                )
            )
            db.commit()
        finally:
            db.close()

        client.request(
            "DELETE", "/v1/account", json={"confirm_email": EMAIL}, headers=auth_headers
        )

        db = TestingSessionLocal()
        try:
            assert db.query(AdminAuditLog).count() == 1
        finally:
            db.close()

    def test_the_token_stops_working_afterwards(self, client, auth_headers):
        client.request(
            "DELETE", "/v1/account", json={"confirm_email": EMAIL}, headers=auth_headers
        )
        assert client.get("/v1/account/export", headers=auth_headers).status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )

    def test_deletion_needs_a_token(self, client):
        response = client.request(
            "DELETE", "/v1/account", json={"confirm_email": EMAIL}
        )
        assert response.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )


class TestBillingIsClosedFirst:
    """A deleted account must not leave a subscription charging a card."""

    def _with_customer(self, customer_id="cus_test123"):
        db = TestingSessionLocal()
        try:
            user = db.query(User).filter(User.email == EMAIL).first()
            user.stripe_customer_id = customer_id
            user.stripe_subscription_id = "sub_test123"
            db.commit()
        finally:
            db.close()

    def test_the_stripe_customer_is_deleted_too(
        self, client, auth_headers, monkeypatch
    ):
        from app.config import settings

        self._with_customer()
        monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_x")

        deleted = []
        monkeypatch.setattr(
            "app.routers.account.stripe.Customer.delete",
            lambda cid: deleted.append(cid),
        )

        response = client.request(
            "DELETE", "/v1/account", json={"confirm_email": EMAIL}, headers=auth_headers
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
        assert deleted == ["cus_test123"], "the subscription would keep billing"

    def test_nothing_is_deleted_when_stripe_fails(
        self, client, auth_headers, monkeypatch
    ):
        """Failing closed is the kinder failure.

        Deleting the row loses the only link between this person and their
        Stripe customer, so a card that is still being charged every month
        becomes untraceable. Better to refuse and let them retry.
        """
        from app.config import settings

        self._with_customer()
        monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_x")

        def boom(_cid):
            raise RuntimeError("stripe is down")

        monkeypatch.setattr("app.routers.account.stripe.Customer.delete", boom)

        response = client.request(
            "DELETE", "/v1/account", json={"confirm_email": EMAIL}, headers=auth_headers
        )
        assert response.status_code == status.HTTP_502_BAD_GATEWAY

        db = TestingSessionLocal()
        try:
            assert db.query(User).filter(User.email == EMAIL).first() is not None
        finally:
            db.close()

    def test_an_already_deleted_customer_is_not_an_error(
        self, client, auth_headers, monkeypatch
    ):
        from app.config import settings

        self._with_customer()
        monkeypatch.setattr(settings, "STRIPE_SECRET_KEY", "sk_test_x")

        def gone(_cid):
            raise stripe.InvalidRequestError("No such customer: cus_test123", "id")

        monkeypatch.setattr("app.routers.account.stripe.Customer.delete", gone)

        response = client.request(
            "DELETE", "/v1/account", json={"confirm_email": EMAIL}, headers=auth_headers
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_an_account_without_billing_deletes_cleanly(self, client, auth_headers):
        response = client.request(
            "DELETE", "/v1/account", json={"confirm_email": EMAIL}, headers=auth_headers
        )
        assert response.status_code == status.HTTP_204_NO_CONTENT
