import logging

from django.db import transaction
from django.http import JsonResponse
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from .models import (
    Document,
    DocumentChunk,
    Entity,
    EntityType,
    Match,
    MatchFeature,
    MatchingJob,
    MatchingJobTarget,
    MatchingJobUpdate,
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
    MatchingJobUpdateSerializer,
    MatchingTemplateSerializer,
    WorkspaceSerializer,
)
from .services.matching_jobs import populate_job_targets_from_config

logger = logging.getLogger(__name__)


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

    def perform_create(self, serializer):
        with transaction.atomic():
            job = serializer.save()

            try:
                created_targets = populate_job_targets_from_config(job)
            except ValidationError:
                logger.exception(
                    "Failed to populate targets for job %s due to invalid configuration", job.id
                )
                raise

            logger.debug("Job %s auto-populated %s targets", job.id, created_targets)

    @action(detail=True, methods=["get"])
    def updates(self, request, pk=None):
        job = self.get_object()
        try:
            limit = int(request.query_params.get("limit", 50))
        except (TypeError, ValueError):  # pragma: no cover - defensive
            limit = 50
        limit = max(1, min(limit, 200))

        queryset = job.updates.order_by("-created_at")[:limit]
        serializer = MatchingJobUpdateSerializer(queryset, many=True)
        return Response(serializer.data)


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
