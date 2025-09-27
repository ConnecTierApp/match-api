from django.http import JsonResponse
from rest_framework import viewsets

from .models import (
    Document,
    DocumentChunk,
    Entity,
    EntityType,
    Match,
    MatchFeature,
    MatchingJob,
    MatchingJobTarget,
    MatchingTemplate,
    Workspace,
)
from .serializers import (
    DocumentChunkSerializer,
    DocumentSerializer,
    EntitySerializer,
    EntityTypeSerializer,
    MatchFeatureSerializer,
    MatchSerializer,
    MatchingJobSerializer,
    MatchingJobTargetSerializer,
    MatchingTemplateSerializer,
    WorkspaceSerializer,
)


def home(_request):
    """Basic health-check endpoint."""

    return JsonResponse({"status": "ok"})


class WorkspaceViewSet(viewsets.ModelViewSet):
    queryset = Workspace.objects.all().order_by("slug")
    serializer_class = WorkspaceSerializer


class EntityTypeViewSet(viewsets.ModelViewSet):
    queryset = (
        EntityType.objects.select_related("workspace")
        .all()
        .order_by("slug")
    )
    serializer_class = EntityTypeSerializer


class EntityViewSet(viewsets.ModelViewSet):
    queryset = (
        Entity.objects.select_related("workspace", "entity_type")
        .all()
        .order_by("-created_at")
    )
    serializer_class = EntitySerializer


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.select_related("entity").all().order_by("-created_at")
    serializer_class = DocumentSerializer


class DocumentChunkViewSet(viewsets.ModelViewSet):
    queryset = DocumentChunk.objects.select_related("document").all().order_by("chunk_index")
    serializer_class = DocumentChunkSerializer


class MatchingTemplateViewSet(viewsets.ModelViewSet):
    queryset = (
        MatchingTemplate.objects.select_related(
            "workspace",
            "source_entity_type",
            "target_entity_type",
        )
        .all()
        .order_by("name")
    )
    serializer_class = MatchingTemplateSerializer


class MatchingJobViewSet(viewsets.ModelViewSet):
    queryset = (
        MatchingJob.objects.select_related(
            "workspace",
            "template",
            "template__workspace",
            "source_entity",
        )
        .all()
        .order_by("-created_at")
    )
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
