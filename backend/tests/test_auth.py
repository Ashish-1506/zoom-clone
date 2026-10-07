from fastapi.testclient import TestClient


def test_signup_and_login_issue_a_token_for_the_created_user(client: TestClient) -> None:
    signup = client.post(
        "/api/auth/signup",
        json={
            "full_name": "Test Person",
            "email": "person@example.com",
            "password": "secure-password",
        },
    )
    assert signup.status_code == 201
    auth_data = signup.json()
    assert auth_data["user"]["email"] == "person@example.com"
    assert auth_data["access_token"]

    login = client.post(
        "/api/auth/login",
        json={"email": "person@example.com", "password": "secure-password"},
    )
    assert login.status_code == 200
    current_user = client.get(
        "/api/users/me",
        headers={"Authorization": f"Bearer {login.json()['access_token']}"},
    )
    assert current_user.status_code == 200
    assert current_user.json()["id"] == auth_data["user"]["id"]


def test_auth_rejects_duplicate_signup_bad_password_and_invalid_token(
    client: TestClient,
) -> None:
    payload = {
        "full_name": "Test Person",
        "email": "person@example.com",
        "password": "secure-password",
    }
    assert client.post("/api/auth/signup", json=payload).status_code == 201
    assert client.post("/api/auth/signup", json=payload).status_code == 409
    assert (
        client.post(
            "/api/auth/login",
            json={"email": payload["email"], "password": "wrong-password"},
        ).status_code
        == 401
    )
    assert (
        client.get(
            "/api/users/me",
            headers={"Authorization": "Bearer invalid.token.value"},
        ).status_code
        == 401
    )


def test_current_user_falls_back_to_default_identity_without_token(
    client: TestClient,
) -> None:
    response = client.get("/api/users/me")
    assert response.status_code == 200
    assert response.json()["id"] == 1
