"""Tests for authentication endpoints.

Sign-in is Google OAuth only — there is no registration or password login.
"""

from fastapi import status


def test_google_client_id_is_public(client):
    """The frontend fetches the client id before anyone is signed in."""
    response = client.get("/v1/auth/google-client-id")
    assert response.status_code == status.HTTP_200_OK
    assert "client_id" in response.json()


def test_google_login_rejects_an_invalid_token(client):
    """A bad id_token must not authenticate anyone."""
    response = client.post("/v1/auth/google", json={"id_token": "not-a-real-token"})
    assert response.status_code in (
        status.HTTP_401_UNAUTHORIZED,
        status.HTTP_501_NOT_IMPLEMENTED,  # when no client id is configured
    )


def test_current_user_requires_a_token(client):
    """401, not 403: nothing was presented, so nothing was refused."""
    response = client.get("/v1/auth/users/me")
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert response.headers["WWW-Authenticate"] == "Bearer"


def test_current_user_rejects_an_invalid_token(client):
    response = client.get(
        "/v1/auth/users/me", headers={"Authorization": "Bearer invalid-token"}
    )
    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_current_user_returns_the_signed_in_user(client, make_auth_headers):
    headers = make_auth_headers("auth_test@example.com", "Auth Tester")
    response = client.get("/v1/auth/users/me", headers=headers)

    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert data["email"] == "auth_test@example.com"
    assert "password_hash" not in data


def test_refresh_rejects_an_access_token(client, make_auth_headers):
    """Token types must not be interchangeable."""
    from app.utils.auth import create_access_token

    access_token = create_access_token({"sub": "1"})
    response = client.post("/v1/auth/refresh", json={"refresh_token": access_token})
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
