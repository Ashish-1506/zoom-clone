from fastapi.testclient import TestClient


def create_meeting_and_host(client: TestClient) -> tuple[str, int, str, str]:
    meeting = client.post("/api/meetings/instant", json={"title": "Chat test"}).json()
    host = client.get(
        f"/api/meetings/{meeting['meeting_code']}/participants"
    ).json()[0]
    return meeting["meeting_code"], host["id"], meeting["passcode"], host["display_name"]


def test_chat_send_and_after_id_polling_use_the_participant_header(
    client: TestClient,
) -> None:
    code, host_id, _, host_name = create_meeting_and_host(client)
    sent = client.post(
        f"/api/meetings/{code}/chat",
        headers={"X-Participant-Id": str(host_id)},
        json={"content": "Hello from host"},
    )

    assert sent.status_code == 201
    message = sent.json()
    assert message["participant_id"] == host_id
    assert message["sender_name"] == host_name
    assert message["type"] == "user"

    polled = client.get(f"/api/meetings/{code}/chat?after_id={message['id'] - 1}")
    assert polled.status_code == 200
    assert [item["id"] for item in polled.json()] == [message["id"]]
    assert client.get(f"/api/meetings/{code}/chat?after_id={message['id']}").json() == []


def test_messages_from_both_participants_are_visible_to_each_other(
    client: TestClient,
) -> None:
    code, host_id, passcode, _ = create_meeting_and_host(client)
    guest = client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "Guest One", "passcode": passcode},
    ).json()
    host_message = client.post(
        f"/api/meetings/{code}/chat",
        headers={"X-Participant-Id": str(host_id)},
        json={"content": "Hello guest"},
    ).json()
    guest_message = client.post(
        f"/api/meetings/{code}/chat",
        headers={"X-Participant-Id": str(guest["id"])},
        json={"content": "Hello host"},
    ).json()

    host_poll = client.get(
        f"/api/meetings/{code}/chat?after_id={host_message['id']}"
    )
    assert host_poll.status_code == 200
    assert host_poll.json() == [guest_message]


def test_chat_requires_valid_sender_and_one_to_one_thousand_characters(
    client: TestClient,
) -> None:
    code, host_id, _, _ = create_meeting_and_host(client)
    assert (
        client.post(
            f"/api/meetings/{code}/chat",
            json={"content": "Missing sender header"},
        ).status_code
        == 422
    )
    assert (
        client.post(
            f"/api/meetings/{code}/chat",
            headers={"X-Participant-Id": "99999"},
            json={"content": "Not in this meeting"},
        ).status_code
        == 403
    )
    for content in (" ", "x" * 1001):
        response = client.post(
            f"/api/meetings/{code}/chat",
            headers={"X-Participant-Id": str(host_id)},
            json={"content": content},
        )
        assert response.status_code == 422

    maximum = client.post(
        f"/api/meetings/{code}/chat",
        headers={"X-Participant-Id": str(host_id)},
        json={"content": "x" * 1000},
    )
    assert maximum.status_code == 201


def test_join_and_leave_create_system_chat_messages(client: TestClient) -> None:
    code, _, passcode, _ = create_meeting_and_host(client)
    joined = client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "Alex", "passcode": passcode},
    )
    assert joined.status_code == 201
    participant = joined.json()

    chat = client.get(f"/api/meetings/{code}/chat").json()
    assert any(
        message["type"] == "system"
        and message["content"] == "Alex joined the meeting"
        for message in chat
    )

    left = client.post(
        f"/api/meetings/{code}/leave",
        headers={"X-Participant-Id": str(participant["id"])},
    )
    assert left.status_code == 200
    chat = client.get(f"/api/meetings/{code}/chat").json()
    assert any(
        message["type"] == "system"
        and message["content"] == "Alex left the meeting"
        for message in chat
    )
