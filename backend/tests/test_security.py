"""Regression tests for the security fixes.

Each test here maps to a hole that was open at some point: a private exercise
readable through a session endpoint, an unverified Google email creating a
session, a token that outlived the sign-out that was supposed to kill it.
"""

import pytest
from fastapi import status

from app.config import Settings
from app.models.user import User
from app.utils.auth import create_access_token, create_refresh_token


# --- Cross-user custom exercise access -------------------------------------


@pytest.fixture
def victim_headers(make_auth_headers):
    return make_auth_headers("security_victim@example.com", "Victim")


@pytest.fixture
def attacker_headers(make_auth_headers):
    return make_auth_headers("security_attacker@example.com", "Attacker")


@pytest.fixture
def victim_exercise(client, victim_headers):
    response = client.post(
        "/v1/exercises/",
        json={
            "name": "Victim Private Lift",
            "description": "private note",
            "muscle_group": "SecretGroup",
            "equipment": "Barbell",
        },
        headers=victim_headers,
    )
    assert response.status_code == status.HTTP_201_CREATED
    return response.json()


@pytest.fixture
def attacker_session_id(client, attacker_headers):
    exercise_id = client.get("/v1/exercises/", headers=attacker_headers).json()[0]["id"]
    mesocycle = client.post(
        "/v1/mesocycles/",
        json={
            "name": "Attacker Block",
            "weeks": 4,
            "days_per_week": 1,
            "workout_templates": [
                {
                    "name": "Day 1",
                    "order_index": 0,
                    "exercises": [
                        {
                            "exercise_id": exercise_id,
                            "order_index": 0,
                            "target_sets": 3,
                            "weekly_set_increment": 0.0,
                            "target_reps_min": 8,
                            "target_reps_max": 12,
                            "starting_rir": 3,
                            "ending_rir": 0,
                        }
                    ],
                }
            ],
        },
        headers=attacker_headers,
    ).json()
    instance = client.post(
        "/v1/mesocycle-instances/",
        json={"mesocycle_template_id": mesocycle["id"]},
        headers=attacker_headers,
    ).json()
    sessions = client.get(
        f"/v1/workout-sessions/?mesocycle_instance_id={instance['id']}",
        headers=attacker_headers,
    ).json()
    return sessions[0]["id"]


def test_add_exercise_rejects_another_users_custom_exercise(
    client, attacker_headers, attacker_session_id, victim_exercise
):
    response = client.post(
        f"/v1/workout-sessions/{attacker_session_id}/exercises/add",
        json={"exercise_id": victim_exercise["id"]},
        headers=attacker_headers,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Victim Private Lift" not in response.text


def test_swap_exercise_rejects_another_users_custom_exercise(
    client, attacker_headers, attacker_session_id, victim_exercise
):
    sets = client.get(
        f"/v1/workout-sessions/{attacker_session_id}", headers=attacker_headers
    ).json()["workout_sets"]

    response = client.post(
        f"/v1/workout-sessions/{attacker_session_id}/exercises/swap",
        json={
            "old_exercise_id": sets[0]["exercise_id"],
            "new_exercise_id": victim_exercise["id"],
        },
        headers=attacker_headers,
    )
    assert response.status_code == status.HTTP_403_FORBIDDEN
    assert "Victim Private Lift" not in response.text


def test_updating_a_set_cannot_move_it_to_another_exercise(
    client, attacker_headers, attacker_session_id, victim_exercise
):
    """exercise_id is not an updatable field, so the leak has no way in."""
    sets = client.get(
        f"/v1/workout-sessions/{attacker_session_id}", headers=attacker_headers
    ).json()["workout_sets"]

    response = client.patch(
        f"/v1/workout-sessions/{attacker_session_id}/sets/{sets[0]['id']}",
        json={"exercise_id": victim_exercise["id"]},
        headers=attacker_headers,
    )
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["exercise_id"] == sets[0]["exercise_id"]
    assert "Victim Private Lift" not in response.text


def test_muscle_groups_does_not_leak_other_users_custom_groups(
    client, attacker_headers, victim_exercise
):
    response = client.get("/v1/exercises/muscle-groups", headers=attacker_headers)
    assert response.status_code == status.HTTP_200_OK
    assert "SecretGroup" not in response.json()


def test_another_users_reference_cannot_block_deletion(
    client, victim_headers, victim_exercise, attacker_headers, attacker_session_id
):
    """The in-use check counts only the owner's own rows."""
    response = client.delete(
        f"/v1/exercises/{victim_exercise['id']}", headers=victim_headers
    )
    assert response.status_code == status.HTTP_204_NO_CONTENT


# --- Token revocation -------------------------------------------------------


def _user_by_email(email: str) -> User:
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    try:
        return db.query(User).filter(User.email == email).first()
    finally:
        db.close()


def test_logout_revokes_the_access_token(client, make_auth_headers):
    headers = make_auth_headers("revoke_me@example.com", "Revoker")

    assert client.get("/v1/auth/users/me", headers=headers).status_code == 200

    assert client.post("/v1/auth/logout", headers=headers).status_code == 204

    # The same bearer token is now dead rather than good for another 90 minutes
    assert client.get("/v1/auth/users/me", headers=headers).status_code == 401


def test_logout_revokes_the_refresh_token(client, make_auth_headers):
    headers = make_auth_headers("revoke_refresh@example.com", "Revoker")
    user = _user_by_email("revoke_refresh@example.com")
    refresh = create_refresh_token(
        {"sub": str(user.id), "email": user.email, "tv": user.token_version}
    )

    assert (
        client.post("/v1/auth/refresh", json={"refresh_token": refresh}).status_code
        == 200
    )

    client.post("/v1/auth/logout", headers=headers)

    # Without this the refresh token would keep minting access tokens for 7 days
    assert (
        client.post("/v1/auth/refresh", json={"refresh_token": refresh}).status_code
        == 401
    )


def test_admin_can_revoke_another_users_sessions(client, make_auth_headers):
    victim = make_auth_headers("compromised@example.com", "Compromised")
    admin = make_auth_headers("session_admin@example.com", "Admin")

    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    try:
        db.query(User).filter(User.email == "session_admin@example.com").update(
            {"is_admin": True}
        )
        db.commit()
    finally:
        db.close()

    assert client.get("/v1/auth/users/me", headers=victim).status_code == 200

    response = client.post(
        "/v1/admin/revoke-sessions",
        json={"email": "compromised@example.com"},
        headers=admin,
    )
    assert response.status_code == 200

    assert client.get("/v1/auth/users/me", headers=victim).status_code == 401
    # The admin's own session is untouched
    assert client.get("/v1/auth/users/me", headers=admin).status_code == 200


def test_revoke_sessions_requires_admin(client, make_auth_headers):
    headers = make_auth_headers("not_admin@example.com", "Regular")
    response = client.post(
        "/v1/admin/revoke-sessions",
        json={"email": "not_admin@example.com"},
        headers=headers,
    )
    assert response.status_code == 403


def test_token_from_a_stale_version_is_rejected(client, make_auth_headers):
    make_auth_headers("stale_tv@example.com", "Stale")
    user = _user_by_email("stale_tv@example.com")
    stale = create_access_token(
        {"sub": str(user.id), "email": user.email, "tv": user.token_version + 5}
    )

    response = client.get(
        "/v1/auth/users/me", headers={"Authorization": f"Bearer {stale}"}
    )
    assert response.status_code == 401


def test_token_with_a_non_numeric_subject_is_rejected_not_a_500(client, test_db):
    token = create_access_token({"sub": "not-an-int"})

    response = client.get(
        "/v1/auth/users/me", headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 401


# --- Google sign-in ---------------------------------------------------------


def test_unverified_google_email_is_rejected(client, monkeypatch, test_db):
    """Accounts are keyed on email, so an unverified one is a takeover."""
    from app.config import settings

    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setattr(
        "app.routers.auth.google_id_token.verify_oauth2_token",
        lambda *a, **kw: {
            "email": "someone_elses@example.com",
            "email_verified": False,
            "name": "Impostor",
        },
    )

    response = client.post("/v1/auth/google", json={"id_token": "stub"})
    assert response.status_code == 401
    assert "not verified" in response.json()["detail"]

    assert _user_by_email("someone_elses@example.com") is None


def test_verified_google_email_is_accepted(client, monkeypatch, test_db):
    from app.config import settings

    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "test-client-id")
    monkeypatch.setattr(
        "app.routers.auth.google_id_token.verify_oauth2_token",
        lambda *a, **kw: {
            "email": "verified_user@example.com",
            "email_verified": True,
            "name": "Real User",
        },
    )

    response = client.post("/v1/auth/google", json={"id_token": "stub"})
    assert response.status_code == 200
    assert response.json()["user"]["email"] == "verified_user@example.com"


# --- Deployment configuration ----------------------------------------------


def _prod_settings(**overrides):
    base = dict(
        DATABASE_URL="postgresql://u:p@localhost/db",
        SECRET_KEY="a" * 64,
        ENVIRONMENT="production",
        CORS_ORIGINS="https://strengthguider.com",
        _env_file=None,
    )
    base.update(overrides)
    return Settings(**base)


def test_production_rejects_a_placeholder_secret_key():
    with pytest.raises(ValueError, match="SECRET_KEY"):
        _prod_settings(SECRET_KEY="your-secret-key-change-in-production")


def test_production_rejects_a_short_secret_key():
    with pytest.raises(ValueError, match="SECRET_KEY"):
        _prod_settings(SECRET_KEY="tooshort")


def test_production_rejects_wildcard_cors():
    with pytest.raises(ValueError, match="CORS_ORIGINS"):
        _prod_settings(CORS_ORIGINS="*")


def test_production_accepts_a_real_configuration():
    settings = _prod_settings()
    assert settings.is_production
    assert settings.cors_origins_list == ["https://strengthguider.com"]


def test_development_tolerates_the_example_values():
    """Local setup must not be blocked by the production-only checks."""
    settings = Settings(
        DATABASE_URL="postgresql://u:p@localhost/db",
        SECRET_KEY="your-secret-key-change-in-production",
        ENVIRONMENT="development",
        CORS_ORIGINS="http://localhost:5173",
        _env_file=None,
    )
    assert not settings.is_production


def test_security_headers_are_present(client):
    response = client.get("/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["Referrer-Policy"] == "no-referrer"


# --- Rate limiting ----------------------------------------------------------


@pytest.fixture
def clean_limiter():
    """Give the test the whole per-IP budget, and hand it back afterwards.

    The limiter is process-global, so without this the burst below would eat
    into the allowance of any other test that touches the same endpoint.
    """
    from app.utils.ratelimit import limiter

    limiter.reset()
    yield
    limiter.reset()


def test_refresh_endpoint_is_rate_limited(client, clean_limiter, test_db):
    """Unauthenticated token minting cannot be hammered for free."""
    saw_429 = False
    for _ in range(40):
        response = client.post("/v1/auth/refresh", json={"refresh_token": "bogus"})
        if response.status_code == 429:
            saw_429 = True
            break

    assert saw_429, "refresh accepted 40 requests from one IP without throttling"


def test_client_ip_uses_the_proxy_written_forwarded_hop():
    """Behind Render's proxy every request shares one socket peer address.

    Keying on that would put all users in a single bucket, so one abuser could
    lock everyone else out. But only the right-most X-Forwarded-For hop was
    written by our own proxy, the left-most is attacker-supplied, and keying
    on it made every rate limit bypassable (fresh bucket per request) and
    weaponizable (spoof a victim's IP to drain their bucket).
    """
    from starlette.requests import Request

    from app.utils.ratelimit import client_ip

    def make_request(headers):
        scope = {
            "type": "http",
            "headers": [(k.encode(), v.encode()) for k, v in headers.items()],
            "client": ("10.0.0.1", 5000),
        }
        return Request(scope)

    # The proxy appended 198.51.100.7; the spoofed 203.0.113.9 must be ignored
    assert client_ip(make_request({"x-forwarded-for": "203.0.113.9, 198.51.100.7"})) == "198.51.100.7"
    assert client_ip(make_request({"x-forwarded-for": "198.51.100.7"})) == "198.51.100.7"
    assert client_ip(make_request({})) == "10.0.0.1"


# --- Admin surface ----------------------------------------------------------


@pytest.fixture
def admin_headers(client, make_auth_headers):
    """An authenticated admin."""
    headers = make_auth_headers("audit_admin@example.com", "Audit Admin")

    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    try:
        db.query(User).filter(User.email == "audit_admin@example.com").update(
            {"is_admin": True}
        )
        db.commit()
    finally:
        db.close()
    return headers


def _set_status(email: str, subscription_status: str) -> None:
    from tests.conftest import TestingSessionLocal

    db = TestingSessionLocal()
    try:
        db.query(User).filter(User.email == email).update(
            {"subscription_status": subscription_status}
        )
        db.commit()
    finally:
        db.close()


def _admin_routes():
    """Every route currently mounted under /v1/admin, with a callable path."""
    import re

    from app.main import app

    routes = []
    for route in app.routes:
        path = getattr(route, "path", "")
        if not path.startswith("/v1/admin"):
            continue
        # Substitute any path params so the URL is requestable
        concrete = re.sub(r"\{[^}]+\}", "1", path)
        for method in sorted(getattr(route, "methods", set()) - {"HEAD", "OPTIONS"}):
            routes.append((method, concrete))
    return routes


def test_every_admin_route_rejects_a_non_admin(client, make_auth_headers):
    """Enumerated from the app, so a route added later is covered for free.

    The guard used to live only in each endpoint's own signature, which meant a
    new endpoint that forgot it would be open to any signed-in user with
    nothing to catch it.
    """
    headers = make_auth_headers("nosy_user@example.com", "Nosy User")
    routes = _admin_routes()
    assert routes, "no admin routes found; the enumeration is broken, not the app"

    for method, path in routes:
        response = client.request(method, path, json={}, headers=headers)
        assert response.status_code == status.HTTP_403_FORBIDDEN, (
            f"{method} {path} returned {response.status_code} to a non-admin"
        )


def test_every_admin_route_rejects_an_anonymous_caller(client, test_db):
    for method, path in _admin_routes():
        response = client.request(method, path, json={})
        assert response.status_code in (401, 403), (
            f"{method} {path} returned {response.status_code} with no credentials"
        )


def test_grant_trial_is_audited(client, admin_headers, make_auth_headers):
    make_auth_headers("audited_target@example.com", "Target")
    # make_auth_headers creates active subscribers, and grant-trial rightly
    # refuses those, move the target off "active" first
    _set_status("audited_target@example.com", "none")

    response = client.post(
        "/v1/admin/grant-trial",
        json={"email": "audited_target@example.com", "days": 14},
        headers=admin_headers,
    )
    assert response.status_code == 200

    log = client.get(
        "/v1/admin/audit-log?target_email=audited_target@example.com",
        headers=admin_headers,
    ).json()

    assert len(log) == 1
    assert log[0]["action"] == "grant_trial"
    assert log[0]["actor_email"] == "audit_admin@example.com"
    assert log[0]["target_email"] == "audited_target@example.com"
    assert log[0]["details"]["days"] == 14


def test_set_subscription_records_the_status_it_moved_from(
    client, admin_headers, make_auth_headers
):
    """from_status is what makes the entry useful in a billing dispute."""
    make_auth_headers("status_target@example.com", "Target")

    client.post(
        "/v1/admin/set-subscription",
        json={"email": "status_target@example.com", "status": "canceled"},
        headers=admin_headers,
    )

    log = client.get(
        "/v1/admin/audit-log?target_email=status_target@example.com",
        headers=admin_headers,
    ).json()

    assert log[0]["action"] == "set_subscription"
    assert log[0]["details"] == {"from_status": "active", "to_status": "canceled"}


def test_revoke_sessions_is_audited(client, admin_headers, make_auth_headers):
    make_auth_headers("revoked_target@example.com", "Target")

    client.post(
        "/v1/admin/revoke-sessions",
        json={"email": "revoked_target@example.com"},
        headers=admin_headers,
    )

    log = client.get(
        "/v1/admin/audit-log?target_email=revoked_target@example.com",
        headers=admin_headers,
    ).json()

    assert log[0]["action"] == "revoke_sessions"
    assert log[0]["actor_email"] == "audit_admin@example.com"


def test_a_failed_admin_action_writes_no_audit_row(
    client, admin_headers, make_auth_headers
):
    """The log must not claim a change that never happened.

    grant-trial refuses a paying customer; the audit row is added to the same
    transaction as the change, so a rejected call leaves nothing behind.
    """
    make_auth_headers("paying_customer@example.com", "Payer")

    response = client.post(
        "/v1/admin/grant-trial",
        json={"email": "paying_customer@example.com", "days": 30},
        headers=admin_headers,
    )
    assert response.status_code == 400

    log = client.get(
        "/v1/admin/audit-log?target_email=paying_customer@example.com",
        headers=admin_headers,
    ).json()
    assert log == []


def test_missing_and_insufficient_credentials_are_distinguishable(
    client, make_auth_headers
):
    """401 means "who are you", 403 means "not you".

    HTTPBearer's default turned a missing header into 403, which made an
    unauthenticated caller indistinguishable from a signed-in one who lacked
    rights, and stopped the frontend from trying a token refresh, because it
    only refreshes on 401.
    """
    anonymous = client.get("/v1/auth/users/me")
    assert anonymous.status_code == 401
    assert anonymous.headers["WWW-Authenticate"] == "Bearer"

    # Signed in, but not an admin: genuinely forbidden
    headers = make_auth_headers("plain_person@example.com", "Plain")
    forbidden = client.get("/v1/admin/users", headers=headers)
    assert forbidden.status_code == 403


def test_malformed_authorization_header_is_401(client, test_db):
    for value in ("", "Bearer", "Basic abc123", "NotBearer xyz"):
        response = client.get(
            "/v1/auth/users/me", headers={"Authorization": value}
        )
        assert response.status_code == 401, f"{value!r} returned {response.status_code}"
