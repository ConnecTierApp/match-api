import uuid

from django.db import migrations

DEFAULT_WORKSPACE_ID = uuid.UUID("11111111-2222-3333-4444-555555555555")


def create_default_workspace(apps, schema_editor):
    Workspace = apps.get_model("core", "Workspace")
    Workspace.objects.get_or_create(
        id=DEFAULT_WORKSPACE_ID,
        defaults={
            "slug": "default",
            "name": "Default Workspace",
            "description": "Auto-generated default workspace.",
        },
    )


def remove_default_workspace(apps, schema_editor):
    Workspace = apps.get_model("core", "Workspace")
    Workspace.objects.filter(id=DEFAULT_WORKSPACE_ID).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0003_create_workspace"),
    ]

    operations = [
        migrations.RunPython(create_default_workspace, remove_default_workspace),
    ]
