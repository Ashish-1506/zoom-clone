from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.utils.ids import normalize_meeting_input


def test_create_instant_meeting_returns_code_and_invite_link(client: TestClient) -> None:
    response = client.post("/api/meetings/instant", json={"title": "Focus Room"})

    assert response.status_code == 201
    payload = response.json()
    assert len(payload["meeting_code"]) == 11
    assert payload["meeting_code"].isdigit()
    assert payload["meeting_code"] in payload["invite_link"]
    assert f"pwd={payload['passcode']}" in payload["invite_link"]


def test_personal_id_instant_meeting_reuses_personal_code(client: TestClient) -> None:
    first = client.post(
        "/api/meetings/instant",
        json={"use_personal_id": True},
    ).json()
    second = client.post(
        "/api/meetings/instant",
        json={"use_personal_id": True},
    ).json()

    assert first["meeting_code"] == second["meeting_code"]
    personal_id = client.get("/api/users/me").json()["personal_meeting_id"]
    assert first["meeting_code"] == personal_id


def test_schedule_in_the_past_returns_422(client: TestClient) -> None:
    response = client.post(
        "/api/meetings/schedule",
        json={
            "title": "Past meeting",
            "start_time": (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat(),
            "duration_minutes": 30,
            "timezone": "UTC",
        },
    )

    assert response.status_code == 422


def test_validate_unknown_and_created_meeting(client: TestClient) -> None:
    unknown = client.get("/api/meetings/12345678901/validate")
    assert unknown.status_code == 200
    assert unknown.json()["exists"] is False

    created = client.post("/api/meetings/instant", json={}).json()
    known = client.get(f"/api/meetings/{created['meeting_code']}/validate")
    assert known.status_code == 200
    assert known.json()["exists"] is True


def test_joining_ended_meeting_returns_409(client: TestClient) -> None:
    created = client.post("/api/meetings/instant", json={}).json()
    host_participant_id = client.get(
        f"/api/meetings/{created['meeting_code']}/participants"
    ).json()[0]["id"]
    ended = client.post(
        f"/api/meetings/{created['meeting_code']}/end",
        headers={"X-Participant-Id": str(host_participant_id)},
    )
    assert ended.status_code == 200

    response = client.post(
        f"/api/meetings/{created['meeting_code']}/join",
        json={"display_name": "Late Guest", "passcode": created["passcode"]},
    )
    assert response.status_code == 409


def test_host_can_lock_meeting_and_locked_meeting_rejects_join(client: TestClient) -> None:
    created = client.post("/api/meetings/instant", json={}).json()
    code = created["meeting_code"]
    host_id = client.get(f"/api/meetings/{code}/participants").json()[0]["id"]

    locked = client.patch(
        f"/api/meetings/{code}/security",
        headers={"X-Participant-Id": str(host_id)},
        json={"is_locked": True, "chat_enabled": True},
    )
    assert locked.status_code == 200
    assert locked.json()["is_locked"] is True

    response = client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "Guest", "passcode": created["passcode"]},
    )
    assert response.status_code == 409
    assert response.json()["detail"] == "Meeting is locked"


def test_meeting_chat_setting_is_enforced(client: TestClient) -> None:
    created = client.post("/api/meetings/instant", json={}).json()
    code = created["meeting_code"]
    host_id = client.get(f"/api/meetings/{code}/participants").json()[0]["id"]
    response = client.patch(
        f"/api/meetings/{code}/security",
        headers={"X-Participant-Id": str(host_id)},
        json={"is_locked": False, "chat_enabled": False},
    )
    assert response.status_code == 200
    chat = client.post(
        f"/api/meetings/{code}/chat",
        headers={"X-Participant-Id": str(host_id)},
        json={"content": "This should be blocked"},
    )
    assert chat.status_code == 403


def test_only_host_can_change_meeting_security(client: TestClient) -> None:
    created = client.post("/api/meetings/instant", json={}).json()
    code = created["meeting_code"]
    guest = client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "Guest", "passcode": created["passcode"]},
    ).json()

    response = client.patch(
        f"/api/meetings/{code}/security",
        headers={"X-Participant-Id": str(guest["id"])},
        json={"is_locked": True, "chat_enabled": False},
    )
    assert response.status_code == 403


def test_only_host_can_mute_all_and_remove_participant(client: TestClient) -> None:
    created = client.post("/api/meetings/instant", json={}).json()
    code = created["meeting_code"]
    host_id = client.get(f"/api/meetings/{code}/participants").json()[0]["id"]
    guest = client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "Guest", "passcode": created["passcode"]},
    ).json()
    guest_id = guest["id"]

    mute_response = client.post(
        f"/api/meetings/{code}/mute-all",
        headers={"X-Participant-Id": str(guest_id)},
    )
    remove_response = client.delete(
        f"/api/meetings/{code}/participants/{host_id}",
        headers={"X-Participant-Id": str(guest_id)},
    )

    assert mute_response.status_code == 403
    assert remove_response.status_code == 403


def test_normalize_meeting_input_accepts_grouped_id_and_invite_link() -> None:
    code = "12345678901"
    assert normalize_meeting_input("123 4567 8901") == code
    assert normalize_meeting_input(f"https://frontend.example.test/j/{code}?pwd=abc123") == code
