from django.http import JsonResponse
from rest_framework import viewsets

from .models import (
    Document,
    DocumentChunk,
    Entity,
    Match,
    MatchFeature,
    MatchingJob,
    MatchingJobTarget,
    MatchingTemplate,
)
from .serializers import (
    DocumentChunkSerializer,
    DocumentSerializer,
    EntitySerializer,
    MatchFeatureSerializer,
    MatchSerializer,
    MatchingJobSerializer,
    MatchingJobTargetSerializer,
    MatchingTemplateSerializer,
)


def home(_request):
    """Basic health-check endpoint."""

    return JsonResponse({"status": "ok"})


class EntityViewSet(viewsets.ModelViewSet):
    queryset = Entity.objects.all().order_by("-created_at")
    serializer_class = EntitySerializer


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.select_related("entity").all().order_by("-created_at")
    serializer_class = DocumentSerializer


class DocumentChunkViewSet(viewsets.ModelViewSet):
    queryset = DocumentChunk.objects.select_related("document").all().order_by("chunk_index")
    serializer_class = DocumentChunkSerializer


class MatchingTemplateViewSet(viewsets.ModelViewSet):
    queryset = MatchingTemplate.objects.all().order_by("name")
    serializer_class = MatchingTemplateSerializer


class MatchingJobViewSet(viewsets.ModelViewSet):
    queryset = MatchingJob.objects.select_related("template", "source_entity").all().order_by("-created_at")
    serializer_class = MatchingJobSerializer


class MatchingJobTargetViewSet(viewsets.ModelViewSet):
    queryset = MatchingJobTarget.objects.select_related("matching_job", "entity").all()
    serializer_class = MatchingJobTargetSerializer


class MatchViewSet(viewsets.ModelViewSet):
    queryset = Match.objects.select_related(
        "matching_job",
        "source_entity",
        "target_entity",
    ).all().order_by("rank", "-score")
    serializer_class = MatchSerializer


class MatchFeatureViewSet(viewsets.ModelViewSet):
    queryset = MatchFeature.objects.select_related("match").all()
    serializer_class = MatchFeatureSerializer
