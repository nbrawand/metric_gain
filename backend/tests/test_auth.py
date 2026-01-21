"""Tests for authentication endpoints."""

import pytest
from fastapi import status


def test_register_new_user(client):
    """Test user registration with valid data."""
    response = client.post(
        "/v1/auth/register",
        json={
            "email": "test@example.com",
            "password": "testpass123",
            "full_name": "Test User"
        }
    )

    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()

    assert "user" in data
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

    assert data["user"]["email"] == "test@example.com"
    assert data["user"]["full_name"] == "Test User"
    assert "password" not in data["user"]
    assert "password_hash" not in data["user"]


def test_register_duplicate_email(client):
    """Test registration with already existing email."""
    # Register first user
    client.post(
        "/v1/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "testpass123",
            "full_name": "First User"
        }
    )

    # Try to register with same email
    response = client.post(
        "/v1/auth/register",
        json={
            "email": "duplicate@example.com",
            "password": "differentpass",
            "full_name": "Second User"
        }
    )

    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "already registered" in response.json()["detail"].lower()


def test_register_weak_password(client):
    """Test registration with password less than 8 characters."""
    response = client.post(
        "/v1/auth/register",
        json={
            "email": "weak@example.com",
            "password": "short",  # Less than 8 characters
            "full_name": "Weak Password User"
        }
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_register_invalid_email(client):
    """Test registration with invalid email format."""
    response = client.post(
        "/v1/auth/register",
        json={
            "email": "not-an-email",
            "password": "testpass123",
            "full_name": "Invalid Email User"
        }
    )

    assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY


def test_login_with_correct_credentials(client):
    """Test login with correct email and password."""
    # Register user first
    client.post(
        "/v1/auth/register",
        json={
            "email": "login@example.com",
            "password": "testpass123",
            "full_name": "Login Test"
        }
    )

    # Login with correct credentials
    response = client.post(
        "/v1/auth/login",
        json={
            "email": "login@example.com",
            "password": "testpass123"
        }
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert "user" in data
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == "login@example.com"


def test_login_with_wrong_password(client):
    """Test login with incorrect password."""
    # Register user
    client.post(
        "/v1/auth/register",
        json={
            "email": "wrongpass@example.com",
            "password": "correctpass",
            "full_name": "Wrong Pass Test"
        }
    )

    # Try to login with wrong password
    response = client.post(
        "/v1/auth/login",
        json={
            "email": "wrongpass@example.com",
            "password": "wrongpassword"
        }
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_login_with_nonexistent_user(client):
    """Test login with email that doesn't exist."""
    response = client.post(
        "/v1/auth/login",
        json={
            "email": "notexist@example.com",
            "password": "somepassword"
        }
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED


def test_get_current_user_with_valid_token(client):
    """Test accessing /users/me with valid authentication token."""
    # Register and get token
    register_response = client.post(
        "/v1/auth/register",
        json={
            "email": "currentuser@example.com",
            "password": "testpass123",
            "full_name": "Current User"
        }
    )
    token = register_response.json()["access_token"]

    # Access protected endpoint
    response = client.get(
        "/v1/auth/users/me",
        headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == status.HTTP_200_OK
    data = response.json()

    assert data["email"] == "currentuser@example.com"
    assert data["full_name"] == "Current User"


def test_get_current_user_without_token(client):
    """Test accessing /users/me without authentication token."""
    response = client.get("/v1/auth/users/me")

    assert response.status_code == status.HTTP_403_FORBIDDEN


def test_get_current_user_with_invalid_token(client):
    """Test accessing /users/me with invalid token."""
    response = client.get(
        "/v1/auth/users/me",
        headers={"Authorization": "Bearer invalid_token_here"}
    )

    assert response.status_code == status.HTTP_401_UNAUTHORIZED
