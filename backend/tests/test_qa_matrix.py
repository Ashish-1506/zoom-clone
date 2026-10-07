from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient

from app.db.session import get_db
from app.main import app
from app.utils.ids import generate_meeting_code, normalize_meeting_input


def _as_utc(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed.astimezone(timezone.utc)


def _instant(client: TestClient) -> dict[str, object]:
    response = client.post("/api/meetings/instant", json={"title": "QA meeting"})
    assert response.status_code == 201, response.text
    return response.json()


def test_meeting_crud_duration_filtering_and_cancelled_join(client: TestClient) -> None:
    instant = _instant(client)
    code = str(instant["meeting_code"])
    assert len(code) == 11 and code.isdigit()
    assert code in str(instant["invite_link"])
    assert client.get(f"/api/meetings/{code}").status_code == 200
    assert client.get("/api/meetings/12345678901").status_code == 404
    assert client.get(f"/api/meetings/{code}/validate").json()["exists"] is True
    assert client.get("/api/meetings/12345678901/validate").json()["exists"] is False

    start = datetime.now(timezone.utc) + timedelta(days=2)
    payload = {
        "title": "Future scheduled meeting",
        "description": "Scheduled by the QA suite",
        "start_time": start.isoformat(),
        "duration_minutes": 5,
        "timezone": "UTC",
    }
    scheduled = client.post("/api/meetings/schedule", json=payload)
    assert scheduled.status_code == 201, scheduled.text
    scheduled_data = scheduled.json()
    assert scheduled_data["duration_minutes"] == 5
    assert scheduled_data["description"] == payload["description"]

    for duration in (4, 1441):
        invalid = client.post(
            "/api/meetings/schedule",
            json={**payload, "duration_minutes": duration},
        )
        assert invalid.status_code == 422
    past = client.post(
        "/api/meetings/schedule",
        json={**payload, "start_time": (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()},
    )
    assert past.status_code == 422

    upcoming = client.get("/api/meetings?type=upcoming").json()
    assert scheduled_data["meeting_code"] in {item["meeting_code"] for item in upcoming}
    assert [item["start_time"] for item in upcoming] == sorted(
        item["start_time"] for item in upcoming
    )
    assert all(item["status"] == "scheduled" for item in upcoming)
    assert client.get("/api/meetings?type=invalid").status_code == 422

    updated = client.patch(
        f"/api/meetings/{scheduled_data['meeting_code']}",
        json={"title": "Updated QA meeting", "duration_minutes": 60},
    )
    assert updated.status_code == 200
    assert updated.json()["title"] == "Updated QA meeting"
    assert updated.json()["duration_minutes"] == 60

    recent_before = client.get("/api/meetings?type=recent").json()
    assert all(
        item["status"] in {"ended", "scheduled"} for item in recent_before
    )
    recent_times = [
        item["started_at"] or item["start_time"] or item["created_at"]
        for item in recent_before
    ]
    assert recent_times == sorted(recent_times, reverse=True)
    assert all(
        item["status"] == "ended"
        or _as_utc(item["start_time"]) <= datetime.now(timezone.utc)
        for item in recent_before
    )
    cancelled = client.delete(f"/api/meetings/{scheduled_data['meeting_code']}")
    assert cancelled.status_code == 200
    assert cancelled.json()["status"] == "cancelled"
    assert scheduled_data["meeting_code"] not in {
        item["meeting_code"] for item in client.get("/api/meetings?type=upcoming").json()
    }
    blocked_join = client.post(
        f"/api/meetings/{scheduled_data['meeting_code']}/join",
        json={"display_name": "Guest"},
    )
    assert blocked_join.status_code == 409


def test_join_ended_empty_name_and_invalid_id(client: TestClient) -> None:
    meeting = _instant(client)
    code = str(meeting["meeting_code"])
    assert client.post("/api/meetings/00000000000/join", json={"display_name": "Guest"}).status_code == 404
    assert client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "   ", "passcode": meeting["passcode"]},
    ).status_code == 422
    assert client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "Guest", "passcode": "wrong"},
    ).status_code == 403

    participants = client.get(f"/api/meetings/{code}/participants").json()
    assert len(participants) == 1
    host_id = participants[0]["id"]
    guest = client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "Actual guest", "passcode": meeting["passcode"]},
    ).json()
    assert client.post(
        f"/api/meetings/{code}/end",
        headers={"X-Participant-Id": str(guest["id"])},
    ).status_code == 403
    ended = client.post(f"/api/meetings/{code}/end", headers={"X-Participant-Id": str(host_id)})
    assert ended.status_code == 200
    assert client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "Too late", "passcode": meeting["passcode"]},
    ).status_code == 409


def test_participant_media_mute_remove_host_and_leave(client: TestClient) -> None:
    meeting = _instant(client)
    code = str(meeting["meeting_code"])
    host = client.get(f"/api/meetings/{code}/participants").json()[0]
    host_id = host["id"]
    guest_response = client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "QA guest", "passcode": meeting["passcode"]},
    )
    assert guest_response.status_code == 201
    guest_id = guest_response.json()["id"]
    participants = client.get(f"/api/meetings/{code}/participants").json()
    assert {item["id"] for item in participants} == {host_id, guest_id}

    guest_media = client.patch(
        f"/api/meetings/{code}/participants/{guest_id}/media",
        headers={"X-Participant-Id": str(guest_id)},
        json={"is_muted": True, "is_video_on": False},
    )
    assert guest_media.status_code == 200
    assert guest_media.json()["is_muted"] is True
    assert guest_media.json()["is_video_on"] is False

    non_host_mute = client.post(
        f"/api/meetings/{code}/mute-all",
        headers={"X-Participant-Id": str(guest_id)},
    )
    assert non_host_mute.status_code == 403
    muted = client.post(f"/api/meetings/{code}/mute-all", headers={"X-Participant-Id": str(host_id)})
    assert muted.status_code == 200
    assert next(item for item in muted.json() if item["id"] == guest_id)["is_muted"] is True

    remove_host = client.delete(
        f"/api/meetings/{code}/participants/{host_id}",
        headers={"X-Participant-Id": str(host_id)},
    )
    assert remove_host.status_code == 409
    removed = client.delete(
        f"/api/meetings/{code}/participants/{guest_id}",
        headers={"X-Participant-Id": str(host_id)},
    )
    assert removed.status_code == 200
    assert removed.json()["is_removed"] is True
    assert [item["id"] for item in client.get(f"/api/meetings/{code}/participants").json()] == [host_id]
    assert client.post(f"/api/meetings/{code}/leave", headers={"X-Participant-Id": str(host_id)}).status_code == 200
    assert client.get(f"/api/meetings/{code}/participants").json() == []


def test_id_normalization_and_code_generation_no_collisions(client: TestClient) -> None:
    code = "12345678901"
    assert normalize_meeting_input(code) == code
    assert normalize_meeting_input("123 4567 8901") == code
    assert normalize_meeting_input(f"https://zoom.example.test/j/{code}?pwd=abc123") == code
    assert normalize_meeting_input("invalid") is None

    db_generator = app.dependency_overrides[get_db]()
    db = next(db_generator)
    try:
        generated = [generate_meeting_code(db) for _ in range(1000)]
    finally:
        db_generator.close()
    assert len(set(generated)) == 1000
    assert all(len(item) == 11 and item.isdigit() for item in generated)


def test_seed_is_idempotent_and_upcoming_seed_meetings_are_future(client: TestClient) -> None:
    from app.seed import seed_database, seed_phone, seed_scheduler, seed_team_chat, seed_whiteboards

    db_generator = app.dependency_overrides[get_db]()
    db = next(db_generator)
    try:
        assert seed_database(db) == {"users": 0, "meetings": 0, "participants": 0, "messages": 0}
        assert seed_whiteboards(db, 1) == 0
        assert seed_team_chat(db) == 0
        assert seed_phone(db, 1) == 0
        assert seed_scheduler(db, 1) == 0
    finally:
        db_generator.close()

    upcoming = client.get("/api/meetings?type=upcoming").json()
    assert upcoming
    assert all(_as_utc(item["start_time"]) > datetime.now(timezone.utc) for item in upcoming)


def test_cors_accepts_vercel_previews_but_rejects_suffix_spoofing(client: TestClient) -> None:
    allowed = client.options(
        "/api/health",
        headers={
            "Origin": "https://qa-preview.vercel.app",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert allowed.status_code == 200
    assert allowed.headers["access-control-allow-origin"] == "https://qa-preview.vercel.app"

    rejected = client.options(
        "/api/health",
        headers={
            "Origin": "https://qa-preview.vercel.app.attacker.invalid",
            "Access-Control-Request-Method": "GET",
        },
    )
    assert rejected.status_code == 400
