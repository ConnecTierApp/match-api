from channels.generic.websocket import AsyncWebsocketConsumer

import uuid

class MatchingJobConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Generate a safe, unique group name for this connection
        self.group_name = f"matching_job_{uuid.uuid4().hex}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        # Updates on the matching job
        pass
