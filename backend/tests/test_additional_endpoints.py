from fastapi.testclient import TestClient


def test_team_chat_channels_messages_edits_deletes_and_direct_messages(client: TestClient) -> None:
    channels = client.get("/api/chat/channels")
    assert channels.status_code == 200
    assert channels.json()
    channel = next(item for item in channels.json() if item["name"] == "general")
    channel_id = channel["id"]

    created_channel = client.post(
        "/api/chat/channels",
        json={"name": " QA Review ", "description": "Testing collaboration", "is_private": True},
    )
    assert created_channel.status_code == 201
    assert created_channel.json()["name"] == "qa-review"
    assert created_channel.json()["is_private"] is True
    assert client.post("/api/chat/channels", json={"name": " "}).status_code == 422

    history = client.get(f"/api/chat/channels/{channel_id}/messages")
    assert history.status_code == 200
    sent = client.post(
        f"/api/chat/channels/{channel_id}/messages",
        json={"content": "  QA message  "},
    )
    assert sent.status_code == 201
    assert sent.json()["content"] == "QA message"
    message_id = sent.json()["id"]
    reply = client.post(
        f"/api/chat/channels/{channel_id}/messages",
        json={"content": "Reply", "reply_to_id": message_id},
    )
    assert reply.status_code == 201
    assert reply.json()["reply_to_id"] == message_id
    polled = client.get(
        f"/api/chat/channels/{channel_id}/messages",
        params={"after_id": message_id},
    )
    assert [item["id"] for item in polled.json()] == [reply.json()["id"]]

    edited = client.patch(
        f"/api/chat/messages/{message_id}",
        json={"content": "Updated QA message"},
    )
    assert edited.status_code == 200
    assert edited.json()["content"] == "Updated QA message"
    assert edited.json()["edited_at"] is not None
    assert client.patch(f"/api/chat/messages/{message_id}", json={"content": " "}).status_code == 422
    assert client.delete(f"/api/chat/messages/{message_id}").status_code == 204
    assert client.delete(f"/api/chat/messages/{message_id}").status_code == 404

    direct = client.post("/api/chat/dm", json={"user_id": 2})
    assert direct.status_code == 200
    assert direct.json()["is_direct"] is True
    assert client.post("/api/chat/dm", json={"user_id": 99999}).status_code == 404
    assert client.get("/api/users").status_code == 200


def test_phone_call_log_contact_and_voicemail_endpoints(client: TestClient) -> None:
    logs = client.get("/api/phone/call-logs")
    assert logs.status_code == 200
    assert logs.json()
    created_log = client.post(
        "/api/phone/call-logs",
        json={
            "contact_name": "QA Caller",
            "phone_number": "+1 555 0100",
            "direction": "out",
            "duration_seconds": 24,
        },
    )
    assert created_log.status_code == 201
    assert created_log.json()["contact_name"] == "QA Caller"
    assert client.post(
        "/api/phone/call-logs",
        json={"phone_number": "12", "direction": "invalid", "duration_seconds": -1},
    ).status_code == 422

    contacts = client.get("/api/phone/contacts")
    assert contacts.status_code == 200
    new_contact = client.post(
        "/api/phone/contacts",
        json={"name": "QA Contact", "phone": "+1 555 0101", "email": "qa@example.com"},
    )
    assert new_contact.status_code == 201
    contact_id = new_contact.json()["id"]
    changed_contact = client.patch(
        f"/api/phone/contacts/{contact_id}",
        json={"name": "Updated QA Contact"},
    )
    assert changed_contact.status_code == 200
    assert changed_contact.json()["name"] == "Updated QA Contact"
    assert client.patch(f"/api/phone/contacts/{contact_id}", json={"name": " "}).status_code == 422
    assert client.delete(f"/api/phone/contacts/{contact_id}").status_code == 204
    assert client.delete(f"/api/phone/contacts/{contact_id}").status_code == 404

    voicemails = client.get("/api/phone/voicemails")
    assert voicemails.status_code == 200
    assert voicemails.json()
    voicemail_id = voicemails.json()[0]["id"]
    listened = client.patch(
        f"/api/phone/voicemails/{voicemail_id}",
        json={"is_listened": True},
    )
    assert listened.status_code == 200
    assert listened.json()["is_listened"] is True
    assert client.patch(
        "/api/phone/voicemails/999999",
        json={"is_listened": True},
    ).status_code == 404
