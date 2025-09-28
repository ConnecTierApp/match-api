import json

from django.contrib import admin, messages
from django.utils.html import format_html
from django.utils.translation import ngettext

from .models import (
    Document,
    DocumentChunk,
    Entity,
    EntityType,
    Match,
    MatchFeature,
    MatchingEvaluationDetailLog,
    MatchingEvaluationLog,
    MatchingJob,
    MatchingJobRun,
    MatchingJobTarget,
    MatchingJobUpdate,
    MatchingSearchHitLog,
    MatchingSearchLog,
    MatchingTemplate,
    Workspace,
)
from .tasks import chunk_requires_weaviate_sync, embed_document_chunk_task


def _format_json(value) -> str:
    if not value:
        return ""
    try:
        pretty = json.dumps(value, indent=2, sort_keys=True)
    except (TypeError, ValueError):
        pretty = str(value)
    return format_html("<pre style=\"white-space: pre-wrap;\">{}</pre>", pretty)


class MatchingJobRunInline(admin.TabularInline):
    model = MatchingJobRun
    extra = 0
    can_delete = False
    show_change_link = True
    fields = ("status", "started_at", "finished_at", "last_error_snippet")
    readonly_fields = fields
    ordering = ("-created_at",)

    def last_error_snippet(self, obj):
        if not obj.error_message:
            return ""
        return obj.error_message.splitlines()[0][:120]

    last_error_snippet.short_description = "Last error"


class MatchingSearchHitLogInline(admin.TabularInline):
    model = MatchingSearchHitLog
    extra = 0
    can_delete = False
    fields = ("rank", "chunk", "score", "metadata_pretty", "chunk_text", "created_at")
    readonly_fields = fields
    raw_id_fields = ("chunk",)
    ordering = ("rank",)

    def metadata_pretty(self, obj):
        return _format_json(obj.metadata)

    metadata_pretty.short_description = "Metadata"


class MatchingSearchLogInline(admin.TabularInline):
    model = MatchingSearchLog
    extra = 0
    can_delete = False
    show_change_link = True
    fields = (
        "query_type",
        "criterion_label",
        "target_entity",
        "returned_count",
        "metadata_pretty",
        "created_at",
    )
    readonly_fields = fields
    raw_id_fields = ("target_entity",)
    ordering = ("-created_at",)

    def metadata_pretty(self, obj):
        return _format_json(obj.metadata)

    metadata_pretty.short_description = "Metadata"


class MatchingEvaluationDetailLogInline(admin.TabularInline):
    model = MatchingEvaluationDetailLog
    extra = 0
    can_delete = False
    fields = (
        "criterion_id",
        "rating_name",
        "rating_value",
        "rating_prompt",
        "rating_response",
        "reasoning_response",
    )
    readonly_fields = fields
    ordering = ("criterion_id",)


class MatchingEvaluationLogInline(admin.TabularInline):
    model = MatchingEvaluationLog
    extra = 0
    can_delete = False
    show_change_link = True
    fields = (
        "target_entity",
        "average_score",
        "coverage",
        "search_hit_ratio",
        "summary_reason",
        "metadata_pretty",
        "created_at",
    )
    readonly_fields = fields
    raw_id_fields = ("target_entity",)
    ordering = ("-created_at",)

    def metadata_pretty(self, obj):
        return _format_json(obj.metadata)

    metadata_pretty.short_description = "Metadata"


class MatchingJobUpdateInline(admin.TabularInline):
    model = MatchingJobUpdate
    extra = 0
    can_delete = False
    fields = ("event_type", "created_at", "payload_pretty")
    readonly_fields = fields
    ordering = ("-created_at",)

    def payload_pretty(self, obj):
        return _format_json(obj.payload)

    payload_pretty.short_description = "Payload"


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
    actions = ("sync_with_weaviate",)

    def sync_with_weaviate(self, request, queryset):
        synced = 0
        skipped = 0

        for chunk in queryset.select_related("document__entity"):
            if chunk_requires_weaviate_sync(chunk):
                embed_document_chunk_task.delay(str(chunk.id))
                synced += 1
            else:
                skipped += 1

        if not synced and not skipped:
            return

        if synced:
            message = ngettext(
                "Queued %(count)d chunk for Weaviate sync.",
                "Queued %(count)d chunks for Weaviate sync.",
                synced,
            ) % {"count": synced}
            if skipped:
                message += f" Skipped {skipped} up-to-date chunk(s)."
            level = messages.INFO
        else:
            message = f"Skipped {skipped} up-to-date chunk(s)."
            level = messages.WARNING

        self.message_user(request, message, level=level)

    sync_with_weaviate.short_description = "Sync selected chunks with Weaviate"


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
    list_display = ("id", "workspace", "template", "source_entity", "status", "run_count", "created_at")
    list_filter = ("status", "workspace", "created_at")
    search_fields = ("id", "template__name", "source_entity__name")
    list_select_related = ("workspace", "template", "source_entity")
    inlines = [MatchingJobRunInline, MatchingJobUpdateInline]

    def run_count(self, obj):
        return obj.runs.count()

    run_count.short_description = "Runs"


@admin.register(MatchingJobTarget)
class MatchingJobTargetAdmin(admin.ModelAdmin):
    list_display = ("matching_job", "entity", "ranking_hint")
    search_fields = ("matching_job__id", "entity__name")
    raw_id_fields = ("matching_job", "entity")


@admin.register(MatchingJobRun)
class MatchingJobRunAdmin(admin.ModelAdmin):
    list_display = (
        "matching_job",
        "status",
        "started_at",
        "finished_at",
        "search_count",
        "evaluation_count",
    )
    list_filter = ("status", "matching_job__workspace")
    search_fields = (
        "matching_job__id",
        "matching_job__template__name",
        "matching_job__source_entity__name",
    )
    list_select_related = ("matching_job", "matching_job__template", "matching_job__source_entity")
    readonly_fields = (
        "matching_job",
        "status",
        "started_at",
        "finished_at",
        "matching_config_snapshot_pretty",
        "plan_snapshot_pretty",
        "error_message",
        "created_at",
        "updated_at",
    )
    fieldsets = (
        (None, {"fields": ("matching_job", "status", "started_at", "finished_at", "error_message")}),
        ("Configuration", {"fields": ("matching_config_snapshot_pretty", "plan_snapshot_pretty")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )
    inlines = [MatchingSearchLogInline, MatchingEvaluationLogInline]
    raw_id_fields = ("matching_job",)

    def matching_config_snapshot_pretty(self, obj):
        return _format_json(obj.matching_config_snapshot)

    matching_config_snapshot_pretty.short_description = "Matching config"

    def plan_snapshot_pretty(self, obj):
        return _format_json(obj.plan_snapshot)

    plan_snapshot_pretty.short_description = "Plan"

    def search_count(self, obj):
        return obj.searches.count()

    search_count.short_description = "Searches"

    def evaluation_count(self, obj):
        return obj.evaluations.count()

    evaluation_count.short_description = "Evaluations"


@admin.register(MatchingSearchLog)
class MatchingSearchLogAdmin(admin.ModelAdmin):
    list_display = ("run", "criterion_id", "query_type", "target_entity", "returned_count", "created_at")
    list_filter = ("query_type", "run__matching_job__workspace")
    search_fields = ("criterion_id", "query_text")
    list_select_related = ("run", "run__matching_job", "target_entity")
    raw_id_fields = ("run", "target_entity")
    readonly_fields = ("run", "criterion_id", "criterion_label", "query_text", "query_type", "target_entity", "limit", "returned_count", "metadata_pretty", "created_at", "updated_at")
    inlines = [MatchingSearchHitLogInline]

    def metadata_pretty(self, obj):
        return _format_json(obj.metadata)

    metadata_pretty.short_description = "Metadata"


@admin.register(MatchingSearchHitLog)
class MatchingSearchHitLogAdmin(admin.ModelAdmin):
    list_display = ("search", "rank", "chunk", "score")
    list_filter = ("search__query_type",)
    search_fields = ("chunk_text",)
    raw_id_fields = ("search", "chunk")
    readonly_fields = ("search", "rank", "chunk", "chunk_text", "score", "metadata_pretty", "created_at", "updated_at")

    def metadata_pretty(self, obj):
        return _format_json(obj.metadata)

    metadata_pretty.short_description = "Metadata"


@admin.register(MatchingEvaluationLog)
class MatchingEvaluationLogAdmin(admin.ModelAdmin):
    list_display = ("run", "target_entity", "average_score", "coverage", "search_hit_ratio")
    list_filter = ("run__matching_job__workspace",)
    search_fields = ("target_entity__name",)
    list_select_related = ("run", "run__matching_job", "target_entity")
    raw_id_fields = ("run", "target_entity")
    readonly_fields = (
        "run",
        "target_entity",
        "average_score",
        "coverage",
        "search_hit_ratio",
        "summary_reason",
        "metadata_pretty",
        "created_at",
        "updated_at",
    )
    inlines = [MatchingEvaluationDetailLogInline]

    def metadata_pretty(self, obj):
        return _format_json(obj.metadata)

    metadata_pretty.short_description = "Metadata"


@admin.register(MatchingEvaluationDetailLog)
class MatchingEvaluationDetailLogAdmin(admin.ModelAdmin):
    list_display = ("evaluation", "criterion_id", "rating_name", "rating_value")
    list_filter = ("rating_name",)
    search_fields = ("criterion_label", "rating_response", "reasoning_response")
    raw_id_fields = ("evaluation",)
    readonly_fields = (
        "evaluation",
        "criterion_id",
        "criterion_label",
        "rating_value",
        "rating_name",
        "rating_prompt",
        "rating_response",
        "reasoning_prompt",
        "reasoning_response",
        "created_at",
        "updated_at",
    )


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ("matching_job", "source_entity", "target_entity", "score", "rank")
    list_filter = ("matching_job",)
    search_fields = ("source_entity__name", "target_entity__name")
    raw_id_fields = ("matching_job", "source_entity", "target_entity")


@admin.register(MatchFeature)
class MatchFeatureAdmin(admin.ModelAdmin):
    list_display = ("match", "label", "value_numeric")
    search_fields = ("label", "match__id")
    raw_id_fields = ("match",)
