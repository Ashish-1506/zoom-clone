from fastapi.testclient import TestClient


def test_profile_update_validates_and_returns_optional_profile_fields(
    client: TestClient,
) -> None:
    updated = client.patch(
        "/api/users/me",
        json={
            "full_name": "  Ada Lovelace  ",
            "email": "ADA@example.com",
            "avatar_color": "#7C3AED",
            "department": " Engineering ",
            "job_title": " Staff Engineer ",
            "location": "Remote",
            "phone": "+1 555 0100",
        },
    )

    assert updated.status_code == 200
    assert updated.json()["full_name"] == "Ada Lovelace"
    assert updated.json()["email"] == "ada@example.com"
    assert updated.json()["department"] == "Engineering"
    assert updated.json()["job_title"] == "Staff Engineer"
    assert updated.json()["location"] == "Remote"
    assert updated.json()["phone"] == "+1 555 0100"


def test_profile_update_rejects_invalid_email_and_duplicate_email(
    client: TestClient,
) -> None:
    current = client.get("/api/users/me").json()
    invalid = client.patch(
        "/api/users/me",
        json={
            "full_name": "Updated name",
            "email": "not-an-email",
            "avatar_color": "#0B5CFF",
        },
    )
    duplicate = client.patch(
        "/api/users/me",
        json={
            "full_name": "Updated name",
            "email": "priya.shah@example.com",
            "avatar_color": "#0B5CFF",
        },
    )

    assert invalid.status_code == 422
    assert duplicate.status_code == 409
    assert client.get("/api/users/me").json()["email"] == current["email"]


def test_user_settings_get_put_and_validation(client: TestClient) -> None:
    defaults = client.get("/api/users/me/settings")
    assert defaults.status_code == 200
    assert defaults.json()["settings"]["start_video_on"] is True
    assert defaults.json()["settings"]["theme"] == "light"

    settings = defaults.json()["settings"]
    settings.update(
        {
            "start_video_on": False,
            "mute_mic_on_join": True,
            "mirror_video": False,
            "theme": "dark",
            "virtual_background": "gradient-3",
        }
    )
    updated = client.put("/api/users/me/settings", json={"settings": settings})
    reloaded = client.get("/api/users/me/settings")

    assert updated.status_code == 200
    assert reloaded.json()["settings"]["start_video_on"] is False
    assert reloaded.json()["settings"]["mute_mic_on_join"] is True
    assert reloaded.json()["settings"]["theme"] == "dark"
    assert reloaded.json()["settings"]["virtual_background"] == "gradient-3"

    settings["input_volume"] = 101
    assert client.put("/api/users/me/settings", json={"settings": settings}).status_code == 422
