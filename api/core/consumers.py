from __future__ import annotations

import uuid

from channels.generic.websocket import AsyncJsonWebsocketConsumer

from matching.events import group_name_for_job


class MatchingJobConsumer(AsyncJsonWebsocketConsumer):
    """Subscribe clients to realtime updates for a specific matching job."""

    async def connect(self):
        job_id = (self.scope.get("url_route") or {}).get("kwargs", {}).get("job_id")
        if not self.channel_layer or not job_id:
            await self.close(code=4000)
            return

        try:
            uuid.UUID(str(job_id))
        except (TypeError, ValueError):
            await self.close(code=4001)
            return

        self.job_id = str(job_id)
        self.group_name = group_name_for_job(self.job_id)
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if self.channel_layer and hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):  # pragma: no cover - inbound messages not supported
        """Ignore inbound messages; the socket is broadcast-only."""

    async def matching_job_event(self, event):
        await self.send_json(event.get("payload", {}))
