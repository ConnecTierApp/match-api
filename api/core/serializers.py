from rest_framework import serializers

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


class EntitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Entity
        fields = [
            "id",
            "external_ref",
            "entity_type",
            "name",
            "metadata",
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
    class Meta:
        model = MatchingTemplate
        fields = [
            "id",
            "name",
            "description",
            "source_entity_type",
            "target_entity_type",
            "config",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


class MatchingJobSerializer(serializers.ModelSerializer):
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
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]


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
