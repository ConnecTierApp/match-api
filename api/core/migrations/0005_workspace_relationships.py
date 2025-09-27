import uuid

from django.db import migrations, models

DEFAULT_WORKSPACE_ID = uuid.UUID("11111111-2222-3333-4444-555555555555")


def populate_entity_types(apps, schema_editor):
    Workspace = apps.get_model("core", "Workspace")
    EntityType = apps.get_model("core", "EntityType")
    Entity = apps.get_model("core", "Entity")
    MatchingTemplate = apps.get_model("core", "MatchingTemplate")
    MatchingJob = apps.get_model("core", "MatchingJob")

    default_workspace = Workspace.objects.get(id=DEFAULT_WORKSPACE_ID)

    entity_slug_map = {}
    template_source_map = {}
    template_target_map = {}
    normalized_slugs = set()

    for entity in Entity.objects.all():
        raw_slug = (entity.entity_type_slug or "").strip().lower()
        normalized_slug = raw_slug or "default"
        entity_slug_map[entity.id] = normalized_slug
        normalized_slugs.add(normalized_slug)

    for template in MatchingTemplate.objects.all():
        raw_source = (template.source_entity_type_slug or "").strip().lower()
        source_normalized = raw_source or "default"
        template_source_map[template.id] = source_normalized
        normalized_slugs.add(source_normalized)

        raw_target = (template.target_entity_type_slug or "").strip().lower()
        target_normalized = raw_target or "default"
        template_target_map[template.id] = target_normalized
        normalized_slugs.add(target_normalized)

    normalized_slugs.add("default")

    slug_to_id = {}
    for normalized_slug in sorted(normalized_slugs):
        display_name = normalized_slug.replace("_", " ").title()
        entity_type, _ = EntityType.objects.get_or_create(
            workspace=default_workspace,
            slug=normalized_slug,
            defaults={"display_name": display_name},
        )
        slug_to_id[normalized_slug] = entity_type.id

    for entity_id, normalized_slug in entity_slug_map.items():
        Entity.objects.filter(id=entity_id).update(
            entity_type_id=slug_to_id[normalized_slug],
            workspace_id=default_workspace.id,
        )

    for template_id, normalized_slug in template_source_map.items():
        MatchingTemplate.objects.filter(id=template_id).update(
            source_entity_type_id=slug_to_id[normalized_slug],
        )
    for template_id, normalized_slug in template_target_map.items():
        MatchingTemplate.objects.filter(id=template_id).update(
            target_entity_type_id=slug_to_id[normalized_slug],
            workspace_id=default_workspace.id,
        )

    MatchingTemplate.objects.filter(workspace_id__isnull=True).update(
        workspace_id=default_workspace.id
    )

    for job in MatchingJob.objects.all():
        template_workspace_id = None
        if job.template_id:
            template = MatchingTemplate.objects.filter(id=job.template_id).first()
            if template:
                template_workspace_id = template.workspace_id
        MatchingJob.objects.filter(id=job.id).update(
            workspace_id=template_workspace_id or default_workspace.id
        )


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0004_default_workspace"),
    ]

    operations = [
        migrations.RemoveIndex(
            model_name="entity",
            name="core_entity_entity__5ca551_idx",
        ),
        migrations.CreateModel(
            name="EntityType",
            fields=[
                (
                    "id",
                    models.UUIDField(
                        default=uuid.uuid4,
                        editable=False,
                        primary_key=True,
                        serialize=False,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("slug", models.SlugField(max_length=64)),
                ("display_name", models.CharField(blank=True, max_length=255)),
                ("description", models.TextField(blank=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                (
                    "workspace",
                    models.ForeignKey(
                        on_delete=models.CASCADE,
                        related_name="entity_types",
                        to="core.workspace",
                    ),
                ),
            ],
            options={
                "ordering": ["slug"],
                "unique_together": {("workspace", "slug")},
            },
        ),
        migrations.AddField(
            model_name="entity",
            name="workspace",
            field=models.ForeignKey(
                default=DEFAULT_WORKSPACE_ID,
                on_delete=models.CASCADE,
                related_name="entities",
                to="core.workspace",
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="matchingtemplate",
            name="workspace",
            field=models.ForeignKey(
                default=DEFAULT_WORKSPACE_ID,
                on_delete=models.CASCADE,
                related_name="matching_templates",
                to="core.workspace",
            ),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name="matchingjob",
            name="workspace",
            field=models.ForeignKey(
                default=DEFAULT_WORKSPACE_ID,
                on_delete=models.CASCADE,
                related_name="matching_jobs",
                to="core.workspace",
            ),
            preserve_default=False,
        ),
        migrations.RenameField(
            model_name="entity",
            old_name="entity_type",
            new_name="entity_type_slug",
        ),
        migrations.RenameField(
            model_name="matchingtemplate",
            old_name="source_entity_type",
            new_name="source_entity_type_slug",
        ),
        migrations.RenameField(
            model_name="matchingtemplate",
            old_name="target_entity_type",
            new_name="target_entity_type_slug",
        ),
        migrations.AlterUniqueTogether(
            name="matchingtemplate",
            unique_together=set(),
        ),
        migrations.AddField(
            model_name="entity",
            name="entity_type",
            field=models.ForeignKey(
                null=True,
                on_delete=models.PROTECT,
                related_name="entities",
                to="core.entitytype",
            ),
        ),
        migrations.AddField(
            model_name="matchingtemplate",
            name="source_entity_type",
            field=models.ForeignKey(
                null=True,
                on_delete=models.PROTECT,
                related_name="source_templates",
                to="core.entitytype",
            ),
        ),
        migrations.AddField(
            model_name="matchingtemplate",
            name="target_entity_type",
            field=models.ForeignKey(
                null=True,
                on_delete=models.PROTECT,
                related_name="target_templates",
                to="core.entitytype",
            ),
        ),
        migrations.RunPython(populate_entity_types, migrations.RunPython.noop),
        migrations.AlterField(
            model_name="entity",
            name="entity_type",
            field=models.ForeignKey(
                on_delete=models.PROTECT,
                related_name="entities",
                to="core.entitytype",
            ),
        ),
        migrations.AlterField(
            model_name="matchingtemplate",
            name="source_entity_type",
            field=models.ForeignKey(
                on_delete=models.PROTECT,
                related_name="source_templates",
                to="core.entitytype",
            ),
        ),
        migrations.AlterField(
            model_name="matchingtemplate",
            name="target_entity_type",
            field=models.ForeignKey(
                on_delete=models.PROTECT,
                related_name="target_templates",
                to="core.entitytype",
            ),
        ),
        migrations.RemoveField(
            model_name="entity",
            name="entity_type_slug",
        ),
        migrations.RemoveField(
            model_name="matchingtemplate",
            name="source_entity_type_slug",
        ),
        migrations.RemoveField(
            model_name="matchingtemplate",
            name="target_entity_type_slug",
        ),
        migrations.AlterUniqueTogether(
            name="matchingtemplate",
            unique_together={
                ("workspace", "name", "source_entity_type", "target_entity_type")
            },
        ),
        migrations.AddIndex(
            model_name="entity",
            index=models.Index(
                fields=["entity_type"],
                name="entity_entity_type_idx",
            ),
        ),
    ]
