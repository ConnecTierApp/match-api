from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/matching-jobs/(?P<job_id>[0-9a-fA-F-]{32,36})/?$", consumers.MatchingJobConsumer.as_asgi()),
]
