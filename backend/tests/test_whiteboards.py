import json


def test_whiteboard_crud_is_scoped_to_owner(client):
    seeded = client.get("/api/whiteboards")
    assert seeded.status_code == 200
    assert len(seeded.json()) == 2

    created = client.post(
        "/api/whiteboards",
        json={"title": "Planning board", "data_json": "[]"},
    )
    assert created.status_code == 201
    board = created.json()
    assert board["title"] == "Planning board"

    listed = client.get("/api/whiteboards")
    assert any(item["id"] == board["id"] for item in listed.json())

    changed = client.patch(
        f"/api/whiteboards/{board['id']}",
        json={"title": "Updated plan", "data_json": json.dumps([{"kind": "line"}])},
    )
    assert changed.status_code == 200
    assert changed.json()["title"] == "Updated plan"

    assert client.delete(f"/api/whiteboards/{board['id']}").status_code == 204
    assert client.get(f"/api/whiteboards/{board['id']}").status_code == 404


def test_whiteboard_rejects_invalid_document(client):
    invalid_json = client.post(
        "/api/whiteboards",
        json={"title": "Broken", "data_json": "{not-json"},
    )
    too_many_shapes = client.post(
        "/api/whiteboards",
        json={"title": "Too large", "data_json": json.dumps([{}] * 5001)},
    )
    assert invalid_json.status_code == 422
    assert too_many_shapes.status_code == 422

    created = client.post("/api/whiteboards", json={"title": "Valid board"})
    board_id = created.json()["id"]
    assert client.patch(
        f"/api/whiteboards/{board_id}",
        json={"data_json": None},
    ).status_code == 422
    assert client.patch(
        f"/api/whiteboards/{board_id}",
        json={"title": None},
    ).status_code == 422


def test_meeting_whiteboard_requires_active_participant(client):
    created = client.post("/api/meetings/instant", json={"title": "Board test"})
    code = created.json()["meeting_code"]
    joined = client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "Board guest", "passcode": created.json()["passcode"]},
    )
    participant_id = joined.json()["id"]
    headers = {"X-Participant-Id": str(participant_id)}

    initial = client.get(f"/api/meetings/{code}/whiteboard", headers=headers)
    assert initial.status_code == 200
    assert initial.json()["data_json"] == "[]"

    changed = client.put(
        f"/api/meetings/{code}/whiteboard",
        headers=headers,
        json={"data_json": json.dumps([{"type": "sticky", "text": "Hello"}])},
    )
    assert changed.status_code == 200
    assert client.get(f"/api/meetings/{code}/whiteboard", headers=headers).json()[
        "data_json"
    ] == changed.json()["data_json"]
    assert client.get(f"/api/meetings/{code}/whiteboard").status_code == 400


def test_meeting_whiteboard_changes_are_visible_to_other_participants(client):
    meeting = client.post("/api/meetings/instant", json={"title": "Shared drawing"})
    code = meeting.json()["meeting_code"]
    passcode = meeting.json()["passcode"]
    first = client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "First collaborator", "passcode": passcode},
    ).json()
    second = client.post(
        f"/api/meetings/{code}/join",
        json={"display_name": "Second collaborator", "passcode": passcode},
    ).json()
    drawing = json.dumps(
        [
            {
                "id": "shared-1",
                "type": "sticky",
                "x": 20,
                "y": 30,
                "text": "Visible to both",
                "color": "#FDE68A",
                "strokeWidth": 3,
            }
        ]
    )

    saved = client.put(
        f"/api/meetings/{code}/whiteboard",
        headers={"X-Participant-Id": str(first["id"])},
        json={"data_json": drawing},
    )
    observed = client.get(
        f"/api/meetings/{code}/whiteboard",
        headers={"X-Participant-Id": str(second["id"])},
    )
    assert saved.status_code == 200
    assert observed.status_code == 200
    assert observed.json()["data_json"] == drawing
