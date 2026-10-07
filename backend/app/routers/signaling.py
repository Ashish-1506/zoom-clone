from collections import defaultdict
from typing import Any, Protocol

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["signaling"])


class SignalingSocket(Protocol):
    async def accept(self) -> None: ...

    async def send_json(self, message: dict[str, Any]) -> None: ...


class MeetingSocketManager:
    """Keep ephemeral signaling sockets grouped by meeting and participant."""

    def __init__(self) -> None:
        self._connections: dict[str, dict[int, SignalingSocket]] = defaultdict(dict)
        self._screen_shares: dict[str, int] = {}

    async def connect(
        self,
        code: str,
        participant_id: int,
        websocket: SignalingSocket,
    ) -> None:
        await websocket.accept()
        existing_ids = list(self._connections[code])
        self._connections[code][participant_id] = websocket
        active_sharer = self._screen_shares.get(code)
        if active_sharer is not None:
            await websocket.send_json(
                {"type": "screen-share-started", "from": active_sharer}
            )
        for existing_id in existing_ids:
            await websocket.send_json({"type": "peer-joined", "from": existing_id})
        await self.broadcast(
            code,
            {"type": "peer-joined", "from": participant_id},
            exclude=participant_id,
        )

    async def disconnect(self, code: str, participant_id: int) -> None:
        meeting = self._connections.get(code)
        if not meeting:
            return
        meeting.pop(participant_id, None)
        if self._screen_shares.get(code) == participant_id:
            self._screen_shares.pop(code, None)
            await self.broadcast(
                code,
                {"type": "screen-share-stopped", "from": participant_id},
            )
        if not meeting:
            self._connections.pop(code, None)
            self._screen_shares.pop(code, None)
            return
        await self.broadcast(code, {"type": "peer-left", "from": participant_id})

    async def set_screen_share(
        self,
        code: str,
        participant_id: int,
        sharing: bool,
    ) -> bool:
        """Broadcast the active presenter and restore its state for later joiners."""
        if sharing:
            active_sharer = self._screen_shares.get(code)
            if active_sharer is not None and active_sharer != participant_id:
                websocket = self._connections.get(code, {}).get(participant_id)
                if websocket is not None:
                    await websocket.send_json(
                        {"type": "screen-share-rejected", "from": active_sharer}
                    )
                return False
            self._screen_shares[code] = participant_id
            await self.broadcast(
                code,
                {"type": "screen-share-started", "from": participant_id},
            )
            return True

        if self._screen_shares.get(code) == participant_id:
            self._screen_shares.pop(code, None)
            await self.broadcast(
                code,
                {"type": "screen-share-stopped", "from": participant_id},
            )
        return True

    async def relay(self, code: str, message: dict[str, Any]) -> None:
        target = message.get("to")
        if not isinstance(target, int):
            return
        websocket = self._connections.get(code, {}).get(target)
        if websocket is not None:
            await websocket.send_json(message)

    async def broadcast(
        self,
        code: str,
        message: dict[str, Any],
        exclude: int | None = None,
    ) -> None:
        for participant_id, websocket in list(self._connections.get(code, {}).items()):
            if participant_id != exclude:
                await websocket.send_json(message)


manager = MeetingSocketManager()


@router.websocket("/ws/meetings/{code}")
async def signaling_socket(websocket: WebSocket, code: str, participant_id: int) -> None:
    await manager.connect(code, participant_id, websocket)
    try:
        while True:
            message = await websocket.receive_json()
            if isinstance(message, dict):
                if message.get("type") in {"screen-share-start", "screen-share-stop"}:
                    await manager.set_screen_share(
                        code,
                        participant_id,
                        message["type"] == "screen-share-start",
                    )
                    continue
                await manager.relay(code, message)
    except WebSocketDisconnect:
        await manager.disconnect(code, participant_id)
