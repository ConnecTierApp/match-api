from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/summary/?$", consumers.MatchingJobConsumer.as_asgi()),
]
