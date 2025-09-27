from django.contrib import admin

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


@admin.register(Workspace)
class WorkspaceAdmin(admin.ModelAdmin):
    list_display = ("slug", "name", "created_at", "updated_at")
    search_fields = ("slug", "name")


@admin.register(EntityType)
class EntityTypeAdmin(admin.ModelAdmin):
    list_display = ("slug", "workspace", "display_name", "created_at")
    search_fields = ("slug", "display_name", "workspace__slug")
    list_filter = ("workspace",)


@admin.register(Entity)
class EntityAdmin(admin.ModelAdmin):
    list_display = ("name", "entity_type", "workspace", "external_ref", "created_at")
    search_fields = ("name", "external_ref", "entity_type__slug", "workspace__slug")
    list_filter = ("entity_type", "workspace")


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ("title", "entity", "source", "created_at")
    search_fields = ("title", "source")
    list_filter = ("source", "created_at")


@admin.register(DocumentChunk)
class DocumentChunkAdmin(admin.ModelAdmin):
    list_display = ("document", "chunk_index", "weaviate_vector_id")
    search_fields = ("weaviate_vector_id", "text")
    list_filter = ("chunk_index",)


@admin.register(MatchingTemplate)
class MatchingTemplateAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "workspace",
        "source_entity_type",
        "target_entity_type",
        "created_at",
    )
    search_fields = (
        "name",
        "workspace__slug",
        "source_entity_type__slug",
        "target_entity_type__slug",
    )
    list_filter = ("workspace", "source_entity_type", "target_entity_type")


@admin.register(MatchingJob)
class MatchingJobAdmin(admin.ModelAdmin):
    list_display = ("id", "workspace", "template", "source_entity", "status", "created_at")
    list_filter = ("status", "workspace", "created_at")
    search_fields = ("id",)


@admin.register(MatchingJobTarget)
class MatchingJobTargetAdmin(admin.ModelAdmin):
    list_display = ("matching_job", "entity", "ranking_hint")
    search_fields = ("matching_job__id", "entity__name")


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ("matching_job", "source_entity", "target_entity", "score", "rank")
    list_filter = ("matching_job",)
    search_fields = ("source_entity__name", "target_entity__name")


@admin.register(MatchFeature)
class MatchFeatureAdmin(admin.ModelAdmin):
    list_display = ("match", "label", "value_numeric")
    search_fields = ("label", "match__id")
