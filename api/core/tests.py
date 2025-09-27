from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient, APITestCase


class CoreCrudFlowTests(APITestCase):
    def setUp(self):
        super().setUp()
        self.client = APIClient()

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
            "body": "Jane is a great engineer.",
            "metadata": {"pages": 1},
        }
        document_response = self.client.post(
            reverse("core:document-list"),
            data=document_payload,
            format="json",
        )
        self.assertEqual(document_response.status_code, status.HTTP_201_CREATED)
        document_id = document_response.data["id"]

        chunk_payload = {
            "document": document_id,
            "chunk_index": 0,
            "text": "Jane has 10 years of experience.",
            "weaviate_vector_id": "vec-1",
            "metadata": {"tokens": 32},
        }
        chunk_response = self.client.post(
            reverse("core:documentchunk-list"),
            data=chunk_payload,
            format="json",
        )
        self.assertEqual(chunk_response.status_code, status.HTTP_201_CREATED)

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

        job_target_payload = {
            "matching_job": job_id,
            "entity": target_entity_id,
            "ranking_hint": 0.5,
        }
        target_response = self.client.post(
            reverse("core:matchingjobtarget-list"),
            data=job_target_payload,
            format="json",
        )
        self.assertEqual(target_response.status_code, status.HTTP_201_CREATED)

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
