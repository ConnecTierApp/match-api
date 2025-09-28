from rest_framework import serializers

from matching.configuration import ConfigurationError, normalize_matching_config

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


class WorkspaceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Workspace
        fields = [
            "id",
            "slug",
            "name",
            "description",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class EntityTypeSerializer(serializers.ModelSerializer):
    workspace = serializers.SlugRelatedField(
        slug_field="slug",
        queryset=Workspace.objects.all(),
    )

    class Meta:
        model = EntityType
        fields = [
            "id",
            "slug",
            "display_name",
            "description",
            "metadata",
            "workspace",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class EntitySerializer(serializers.ModelSerializer):
    entity_type = serializers.SlugRelatedField(
        queryset=EntityType.objects.all(),
        slug_field="slug",
    )
    workspace = serializers.SlugRelatedField(
        slug_field="slug",
        read_only=True,
    )

    class Meta:
        model = Entity
        fields = [
            "id",
            "external_ref",
            "entity_type",
            "name",
            "metadata",
            "workspace",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


from .lightpanda import LightpandaError
from .services.document_ingestion import ensure_document_body


class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = [
            "id",
            "entity",
            "source",
            "title",
            "body",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
        extra_kwargs = {
            "body": {"required": False, "allow_blank": True},
        }

    def create(self, validated_data):
        instance = Document(**validated_data)
        try:
            ensure_document_body(instance, raise_on_failure=True)
        except LightpandaError as exc:
            raise serializers.ValidationError({"body": str(exc)}) from exc

        if not instance.body.strip():
            raise serializers.ValidationError(
                {"body": "Document body is required when no source is provided."}
            )

        instance.save()
        return instance


class DocumentChunkSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentChunk
        fields = [
            "id",
            "document",
            "chunk_index",
            "text",
            "weaviate_vector_id",
            "metadata",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MatchingTemplateSerializer(serializers.ModelSerializer):
    source_entity_type = serializers.SlugRelatedField(
        queryset=EntityType.objects.all(),
        slug_field="slug",
    )
    target_entity_type = serializers.SlugRelatedField(
        queryset=EntityType.objects.all(),
        slug_field="slug",
    )
    workspace = serializers.SlugRelatedField(
        slug_field="slug",
        read_only=True,
    )

    class Meta:
        model = MatchingTemplate
        fields = [
            "id",
            "name",
            "description",
            "source_entity_type",
            "target_entity_type",
            "config",
            "workspace",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_config(self, value):
        try:
            normalized, _ = normalize_matching_config(value, context="Template", require_criteria=True)
        except ConfigurationError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return normalized


class MatchingJobSerializer(serializers.ModelSerializer):
    workspace = serializers.SlugRelatedField(
        slug_field="slug",
        read_only=True,
    )

    class Meta:
        model = MatchingJob
        fields = [
            "id",
            "template",
            "source_entity",
            "status",
            "config_override",
            "started_at",
            "finished_at",
            "error_message",
            "workspace",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_config_override(self, value):
        if value in (None, {}):
            return value
        try:
            normalized, _ = normalize_matching_config(value, context="Job override", require_criteria=False)
        except ConfigurationError as exc:
            raise serializers.ValidationError(str(exc)) from exc
        return normalized


class MatchingJobTargetSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchingJobTarget
        fields = [
            "id",
            "matching_job",
            "entity",
            "ranking_hint",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MatchSerializer(serializers.ModelSerializer):
    class Meta:
        model = Match
        fields = [
            "id",
            "matching_job",
            "source_entity",
            "target_entity",
            "score",
            "explanation",
            "rank",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MatchFeatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = MatchFeature
        fields = [
            "id",
            "match",
            "label",
            "value_numeric",
            "value_text",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
