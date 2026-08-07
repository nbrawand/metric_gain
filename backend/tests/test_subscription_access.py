"""Tests for the subscription/trial gate on the training endpoints."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi import status

from app.models.user import User
from app.utils.auth import as_utc, create_access_token
from tests.conftest import TestingSessionLocal


@pytest.fixture
def make_user_with_trial():
    """Create a trialing user whose trial ends at a given offset from now."""

    def _make(email, days_from_now, tzinfo=None):
        db = TestingSessionLocal()
        try:
            ends_at = datetime.now(timezone.utc) + timedelta(days=days_from_now)
            if tzinfo is None:
                # How SQLite hands the column back: naive, meaning UTC
                ends_at = ends_at.replace(tzinfo=None)
            else:
                ends_at = ends_at.astimezone(tzinfo)
            user = User(
                email=email,
                full_name="Trial User",
                subscription_status="trialing",
                trial_ends_at=ends_at,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            token = create_access_token({"sub": str(user.id)})
        finally:
            db.close()
        return {"Authorization": f"Bearer {token}"}

    return _make


def test_as_utc_normalizes_without_shifting_the_instant():
    """A naive value is read as UTC; an aware one is converted, not relabelled."""
    assert as_utc(None) is None

    naive = datetime(2026, 1, 1, 12, 0, 0)
    assert as_utc(naive) == datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)

    # Same instant, expressed at a +5 offset — must stay the same instant
    aware = datetime(2026, 1, 1, 17, 0, 0, tzinfo=timezone(timedelta(hours=5)))
    assert as_utc(aware) == datetime(2026, 1, 1, 12, 0, 0, tzinfo=timezone.utc)


def test_live_trial_can_train(client, make_user_with_trial):
    headers = make_user_with_trial("live_trial@example.com", days_from_now=3)
    assert client.get("/v1/exercises/", headers=headers).status_code == status.HTTP_200_OK


def test_expired_trial_is_locked_out(client, make_user_with_trial):
    headers = make_user_with_trial("dead_trial@example.com", days_from_now=-1)
    assert client.get("/v1/exercises/", headers=headers).status_code == status.HTTP_403_FORBIDDEN


def test_trial_stored_at_a_non_utc_offset_is_not_shifted(client, make_user_with_trial):
    """A trial ending in 2 hours is live no matter what offset it is stored at.

    replace(tzinfo=utc) kept the wall-clock reading instead of the instant, so
    a timestamp returned at a positive offset read hours later than it was.
    """
    headers = make_user_with_trial(
        "offset_trial@example.com",
        days_from_now=0,
        tzinfo=timezone(timedelta(hours=9)),
    )
    assert client.get("/v1/exercises/", headers=headers).status_code == status.HTTP_200_OK

    expired = make_user_with_trial(
        "offset_expired@example.com",
        days_from_now=-2,
        tzinfo=timezone(timedelta(hours=-8)),
    )
    assert client.get("/v1/exercises/", headers=expired).status_code == status.HTTP_403_FORBIDDEN
