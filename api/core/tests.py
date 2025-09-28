from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from .models import Document, DocumentChunk, EntityType, MatchingJobTarget, Workspace


@override_settings(CELERY_TASK_ALWAYS_EAGER=True, CELERY_TASK_EAGER_PROPAGATES=True)
class CoreCrudFlowTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()

        self.embedding_patcher = patch("core.tasks.get_embedding_client")
        self.weaviate_patcher = patch("core.tasks.get_weaviate_client")
        self.ensure_collection_patcher = patch(
            "core.tasks._ensure_weaviate_collection_for_document_chunks"
        )
        self.lightpanda_patcher = patch(
            "core.services.document_ingestion.fetch_markdown"
        )
        self.matching_task_patcher = patch(
            "core.signals.run_matching_job_task.delay"
        )
        self.mock_get_embedding = self.embedding_patcher.start()
        self.mock_get_weaviate = self.weaviate_patcher.start()
        self.mock_ensure_collection = self.ensure_collection_patcher.start()
        self.mock_fetch_markdown = self.lightpanda_patcher.start()
        self.mock_run_matching_job = self.matching_task_patcher.start()
        self.addCleanup(self.embedding_patcher.stop)
        self.addCleanup(self.weaviate_patcher.stop)
        self.addCleanup(self.ensure_collection_patcher.stop)
        self.addCleanup(self.lightpanda_patcher.stop)
        self.addCleanup(self.matching_task_patcher.stop)

        self.embedding_client = MagicMock()
        self.embedding_client.embeddings.create.return_value = SimpleNamespace(
            data=[SimpleNamespace(embedding=[0.1, 0.2, 0.3])]
        )
        self.mock_get_embedding.return_value = self.embedding_client

        self.weaviate_client = MagicMock()
        self.mock_collection = MagicMock()
        self.mock_collection.data.insert = MagicMock()
        self.mock_collection.data.replace = MagicMock()
        self.weaviate_client.collections = MagicMock()
        self.weaviate_client.collections.get.return_value = self.mock_collection
        self.mock_get_weaviate.return_value = self.weaviate_client

        self.mock_fetch_markdown.return_value = "# Auto Fetched Body"

        self.workspace, _ = Workspace.objects.get_or_create(
            slug="default",
            defaults={"name": "Default Workspace"},
        )
        self.candidate_type, _ = EntityType.objects.get_or_create(
            workspace=self.workspace,
            slug="candidate",
            defaults={"display_name": "Candidate"},
        )
        self.job_type, _ = EntityType.objects.get_or_create(
            workspace=self.workspace,
            slug="job",
            defaults={"display_name": "Job"},
        )

    def test_full_crud_flow(self):
        entity_payload = {
            "external_ref": "ext-123",
            "entity_type": "candidate",
            "name": "Jane Doe",
            "metadata": {"city": "NYC"},
        }
        entity_response = self.client.post(
            reverse("core:entity-list"),
            data=entity_payload,
            format="json",
        )
        self.assertEqual(entity_response.status_code, status.HTTP_201_CREATED)
        source_entity_id = entity_response.data["id"]

        target_entity_payload = {
            "external_ref": "job-5",
            "entity_type": "job",
            "name": "Senior Engineer",
            "metadata": {"remote": True},
        }
        target_entity_response = self.client.post(
            reverse("core:entity-list"),
            data=target_entity_payload,
            format="json",
        )
        self.assertEqual(target_entity_response.status_code, status.HTTP_201_CREATED)
        target_entity_id = target_entity_response.data["id"]

        document_payload = {
            "entity": source_entity_id,
            "source": "upload",
            "title": "Resume",
            "metadata": {"pages": 1},
        }
        document_response = self.client.post(
            reverse("core:document-list"),
            data=document_payload,
            format="json",
        )
        self.assertEqual(document_response.status_code, status.HTTP_201_CREATED)
        document_id = document_response.data["id"]
        self.mock_fetch_markdown.assert_called_once_with("upload")
        # Response shows initial pending state; async task updates status shortly after.
        self.assertEqual(document_response.data["scrape_status"], "pending")

        document = Document.objects.get(id=document_id)
        self.assertEqual(document.scrape_status, Document.ScrapeStatus.COMPLETED)
        self.assertTrue((document.body or "").strip())

        chunks = DocumentChunk.objects.filter(document_id=document_id)
        self.assertEqual(chunks.count(), 1)
        chunk = chunks.first()
        self.assertEqual(chunk.chunk_index, 0)
        self.assertEqual(chunk.weaviate_vector_id, str(chunk.id))
        self.embedding_client.embeddings.create.assert_called_once()
        self.mock_ensure_collection.assert_called_once_with(self.weaviate_client)
        self.mock_collection.data.insert.assert_called_once()

        template_payload = {
            "name": "Candidate to Job",
            "description": "Match candidates to jobs",
            "source_entity_type": "candidate",
            "target_entity_type": "job",
            "config": {"prompt": "Explain match."},
        }
        template_response = self.client.post(
            reverse("core:matchingtemplate-list"),
            data=template_payload,
            format="json",
        )
        self.assertEqual(template_response.status_code, status.HTTP_201_CREATED)
        template_id = template_response.data["id"]

        matching_job_payload = {
            "template": template_id,
            "source_entity": source_entity_id,
            "status": "queued",
            "config_override": {"batch_size": 5},
        }
        job_response = self.client.post(
            reverse("core:matchingjob-list"),
            data=matching_job_payload,
            format="json",
        )
        self.assertEqual(job_response.status_code, status.HTTP_201_CREATED)
        job_id = job_response.data["id"]

        targets = MatchingJobTarget.objects.filter(matching_job_id=job_id)
        self.assertEqual(targets.count(), 1)
        self.assertEqual(str(targets.first().entity_id), target_entity_id)

        match_payload = {
            "matching_job": job_id,
            "source_entity": source_entity_id,
            "target_entity": target_entity_id,
            "score": 0.87,
            "explanation": "Strong skill overlap",
            "rank": 1,
        }
        match_response = self.client.post(
            reverse("core:match-list"),
            data=match_payload,
            format="json",
        )
        self.assertEqual(match_response.status_code, status.HTTP_201_CREATED)
        match_id = match_response.data["id"]

        feature_payload = {
            "match": match_id,
            "label": "skills_overlap",
            "value_numeric": 0.9,
            "value_text": "Shared Python and ML",
        }
        feature_response = self.client.post(
            reverse("core:matchfeature-list"),
            data=feature_payload,
            format="json",
        )
        self.assertEqual(feature_response.status_code, status.HTTP_201_CREATED)

        # sanity check list endpoints respond
        list_response = self.client.get(reverse("core:match-list"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
