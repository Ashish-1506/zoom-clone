from datetime import date, timedelta

from fastapi.testclient import TestClient


def _link_payload(slug: str, selected: date) -> dict[str, object]:
    return {
        "slug": slug,
        "title": "Planning session",
        "description": "A session booked from the public page.",
        "duration_minutes": 30,
        "available_days": [selected.weekday()],
        "start_hour": 9,
        "end_hour": 11,
        "timezone": "UTC",
    }


def test_scheduler_seed_contains_links_and_bookings(client: TestClient) -> None:
    links = client.get("/api/scheduler/links")
    bookings = client.get("/api/scheduler/bookings")

    assert links.status_code == 200
    assert len(links.json()) == 2
    assert bookings.status_code == 200
    assert len(bookings.json()) == 3


def test_scheduler_owner_can_create_update_and_delete_link(client: TestClient) -> None:
    selected = date.today() + timedelta(days=30)
    created = client.post(
        "/api/scheduler/links",
        json=_link_payload("review-session", selected),
    )

    assert created.status_code == 201, created.text
    link_id = created.json()["id"]
    updated = client.patch(
        f"/api/scheduler/links/{link_id}",
        json={"slug": "design-review", "is_active": False},
    )
    assert updated.status_code == 200
    assert updated.json()["slug"] == "design-review"
    assert updated.json()["is_active"] is False
    assert client.get("/api/scheduler/public/design-review").status_code == 404

    deleted = client.delete(f"/api/scheduler/links/{link_id}")
    assert deleted.status_code == 204
    assert client.patch(f"/api/scheduler/links/{link_id}", json={"title": "Missing"}).status_code == 404


def test_public_booking_removes_slot_and_creates_upcoming_meeting(client: TestClient) -> None:
    selected = date.today() + timedelta(days=30)
    created = client.post(
        "/api/scheduler/links",
        json=_link_payload("future-planning", selected),
    )
    assert created.status_code == 201, created.text

    slots_response = client.get(
        "/api/scheduler/public/future-planning/slots",
        params={"date": selected.isoformat()},
    )
    assert slots_response.status_code == 200
    slots = slots_response.json()
    assert [slot["label"] for slot in slots] == ["9:00 AM", "9:30 AM", "10:00 AM", "10:30 AM"]

    confirmation = client.post(
        "/api/scheduler/public/future-planning/book",
        json={
            "guest_name": "Casey Guest",
            "guest_email": "casey@example.com",
            "start_time": slots[0]["start_time"],
        },
    )
    assert confirmation.status_code == 201
    booking = confirmation.json()
    assert booking["status"] == "confirmed"
    assert booking["meeting_id"] is not None
    assert "/j/" in booking["meeting_link"]

    remaining = client.get(
        "/api/scheduler/public/future-planning/slots",
        params={"date": selected.isoformat()},
    ).json()
    assert len(remaining) == 3
    assert all(slot["start_time"] != slots[0]["start_time"] for slot in remaining)

    meetings = client.get("/api/meetings", params={"type": "upcoming"}).json()
    assert any(meeting["id"] == booking["meeting_id"] for meeting in meetings)
    duplicate = client.post(
        "/api/scheduler/public/future-planning/book",
        json={
            "guest_name": "Another Guest",
            "guest_email": "another@example.com",
            "start_time": slots[0]["start_time"],
        },
    )
    assert duplicate.status_code == 409


def test_public_booking_rejects_invalid_email_and_unknown_slug(client: TestClient) -> None:
    unavailable = client.get("/api/scheduler/public/not-a-real-link")
    assert unavailable.status_code == 404

    selected = date.today() + timedelta(days=30)
    created = client.post(
        "/api/scheduler/links",
        json=_link_payload("email-validation", selected),
    )
    assert created.status_code == 201, created.text
    slots = client.get(
        "/api/scheduler/public/email-validation/slots",
        params={"date": selected.isoformat()},
    ).json()
    invalid_email = client.post(
        "/api/scheduler/public/email-validation/book",
        json={
            "guest_name": "Guest",
            "guest_email": "not-an-email",
            "start_time": slots[0]["start_time"],
        },
    )
    assert invalid_email.status_code == 422
