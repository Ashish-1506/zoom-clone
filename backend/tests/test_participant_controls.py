from fastapi.testclient import TestClient


def _meeting_with_guest(client: TestClient) -> tuple[str, int, int]:
    meeting = client.post("/api/meetings/instant", json={"title": "Controls test"}).json()
    code = meeting["meeting_code"]
    host = client.get(f"/api/meetings/{code}/participants").json()[0]
    guest = client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "Guest", "passcode": meeting["passcode"]},
    ).json()
    return code, host["id"], guest["id"]


def test_participant_can_raise_hand_and_host_can_lower_it(client: TestClient) -> None:
    code, host_id, guest_id = _meeting_with_guest(client)
    headers = {"X-Participant-Id": str(guest_id)}

    raised = client.patch(
        f"/api/meetings/{code}/participants/{guest_id}/hand",
        headers=headers,
        json={"raised": True},
    )
    assert raised.status_code == 200
    assert raised.json()["hand_raised"] is True
    assert raised.json()["hand_raised_at"] is not None
    participants = client.get(f"/api/meetings/{code}/participants").json()
    listed_guest = next(item for item in participants if item["id"] == guest_id)
    assert listed_guest["hand_raised"] is True
    assert listed_guest["hand_raised_at"] is not None
    assert "last_reaction" in listed_guest
    assert "last_reaction_at" in listed_guest

    lowered = client.patch(
        f"/api/meetings/{code}/participants/{guest_id}/hand",
        headers={"X-Participant-Id": str(host_id)},
        json={"raised": False},
    )
    assert lowered.status_code == 200
    assert lowered.json()["hand_raised"] is False
    assert lowered.json()["hand_raised_at"] is None


def test_guest_cannot_lower_another_participants_hand(client: TestClient) -> None:
    code, host_id, guest_id = _meeting_with_guest(client)

    response = client.patch(
        f"/api/meetings/{code}/participants/{host_id}/hand",
        headers={"X-Participant-Id": str(guest_id)},
        json={"raised": False},
    )
    assert response.status_code == 403


def test_participant_can_send_allowed_reaction_and_invalid_reaction_is_rejected(
    client: TestClient,
) -> None:
    code, _, guest_id = _meeting_with_guest(client)
    response = client.post(
        f"/api/meetings/{code}/participants/{guest_id}/reaction",
        headers={"X-Participant-Id": str(guest_id)},
        json={"emoji": "thumbs_up"},
    )

    assert response.status_code == 200
    assert response.json()["last_reaction"] == "thumbs_up"
    assert response.json()["last_reaction_at"] is not None

    invalid = client.post(
        f"/api/meetings/{code}/participants/{guest_id}/reaction",
        headers={"X-Participant-Id": str(guest_id)},
        json={"emoji": "party_parrot"},
    )
    assert invalid.status_code == 422


def test_participant_cannot_send_reaction_for_someone_else(client: TestClient) -> None:
    code, host_id, guest_id = _meeting_with_guest(client)

    response = client.post(
        f"/api/meetings/{code}/participants/{host_id}/reaction",
        headers={"X-Participant-Id": str(guest_id)},
        json={"emoji": "clap"},
    )
    assert response.status_code == 403
