import asyncio
from typing import Any

from fastapi.testclient import TestClient

from app.routers.signaling import MeetingSocketManager


class FakeWebSocket:
    def __init__(self) -> None:
        self.messages: list[dict[str, Any]] = []
        self.accepted = False

    async def accept(self) -> None:
        self.accepted = True

    async def send_json(self, message: dict[str, Any]) -> None:
        self.messages.append(message)


def test_active_screen_share_is_announced_to_late_joiners() -> None:
    async def scenario() -> None:
        manager = MeetingSocketManager()
        host = FakeWebSocket()
        guest = FakeWebSocket()
        await manager.connect("meeting", 1, host)
        assert await manager.set_screen_share("meeting", 1, True)

        await manager.connect("meeting", 2, guest)

        assert guest.messages[0] == {
            "type": "screen-share-started",
            "from": 1,
        }
        assert {"type": "peer-joined", "from": 1} in guest.messages

    asyncio.run(scenario())


def test_only_one_participant_can_share_at_a_time() -> None:
    async def scenario() -> None:
        manager = MeetingSocketManager()
        first = FakeWebSocket()
        second = FakeWebSocket()
        await manager.connect("meeting", 1, first)
        await manager.connect("meeting", 2, second)

        assert await manager.set_screen_share("meeting", 1, True)
        assert not await manager.set_screen_share("meeting", 2, True)

        assert second.messages[-1] == {
            "type": "screen-share-rejected",
            "from": 1,
        }
        assert first.messages[-1] == {
            "type": "screen-share-started",
            "from": 1,
        }

    asyncio.run(scenario())


def test_stop_and_disconnect_clear_share_state() -> None:
    async def scenario() -> None:
        manager = MeetingSocketManager()
        host = FakeWebSocket()
        guest = FakeWebSocket()
        await manager.connect("meeting", 1, host)
        await manager.connect("meeting", 2, guest)
        assert await manager.set_screen_share("meeting", 1, True)
        guest.messages.clear()

        await manager.disconnect("meeting", 1)
        await manager.connect("meeting", 3, FakeWebSocket())

        assert guest.messages[:2] == [
            {"type": "screen-share-stopped", "from": 1},
            {"type": "peer-left", "from": 1},
        ]

    asyncio.run(scenario())


def test_websocket_endpoint_announces_share_to_late_joiners(
    client: TestClient,
) -> None:
    code = "screen-share-route-test"
    with client.websocket_connect(
        f"/ws/meetings/{code}?participant_id=101"
    ) as host:
        with client.websocket_connect(
            f"/ws/meetings/{code}?participant_id=102"
        ) as guest:
            assert host.receive_json() == {"type": "peer-joined", "from": 102}
            assert guest.receive_json() == {"type": "peer-joined", "from": 101}
            host.send_json({"type": "screen-share-start", "from": 999})
            assert host.receive_json() == {
                "type": "screen-share-started",
                "from": 101,
            }
            assert guest.receive_json() == {
                "type": "screen-share-started",
                "from": 101,
            }
            with client.websocket_connect(
                f"/ws/meetings/{code}?participant_id=103"
            ) as late_joiner:
                assert late_joiner.receive_json() == {
                    "type": "screen-share-started",
                    "from": 101,
                }
