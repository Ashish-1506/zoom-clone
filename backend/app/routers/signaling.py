from collections import defaultdict
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["signaling"])


class MeetingSocketManager:
    """Keep ephemeral signaling sockets grouped by meeting and participant."""

    def __init__(self) -> None:
        self._connections: dict[str, dict[int, WebSocket]] = defaultdict(dict)

    async def connect(self, code: str, participant_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        existing_ids = list(self._connections[code])
        self._connections[code][participant_id] = websocket
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
        if not meeting:
            self._connections.pop(code, None)
            return
        await self.broadcast(code, {"type": "peer-left", "from": participant_id})

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
                await manager.relay(code, message)
    except WebSocketDisconnect:
        await manager.disconnect(code, participant_id)
