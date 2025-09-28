from dataclasses import asdict

from django.test import TestCase

from core.models import (
    Document,
    DocumentChunk,
    Entity,
    EntityType,
    MatchingSearchLog,
    MatchingJob,
    MatchingTemplate,
    Workspace,
)
from matching.audit import MatchingJobAuditRecorder, build_search_context
from matching.evaluation import CriterionEvaluation, MatchRating, TargetEvaluation
from matching.interfaces import VectorSearchHit
from matching.planning import SearchCriterion, SearchPlan
from matching.search import CriterionHit, TargetSearchSummary


class MatchingJobAuditRecorderTests(TestCase):
    def setUp(self) -> None:
        self.workspace = Workspace.objects.create(slug="audit", name="Audit")
        self.entity_type = EntityType.objects.create(
            workspace=self.workspace,
            slug="candidate",
            display_name="Candidate",
        )
        self.template = MatchingTemplate.objects.create(
            workspace=self.workspace,
            name="Template",
            description="",
            source_entity_type=self.entity_type,
            target_entity_type=self.entity_type,
            config={
                "search_criteria": [
                    {
                        "id": "fit",
                        "label": "Fit",
                        "prompt": "Check fit",
                    }
                ]
            },
        )
        self.source_entity = Entity.objects.create(
            workspace=self.workspace,
            entity_type=self.entity_type,
            name="Source",
        )
        self.target_entity = Entity.objects.create(
            workspace=self.workspace,
            entity_type=self.entity_type,
            name="Target",
        )
        self.job = MatchingJob.objects.create(
            workspace=self.workspace,
            template=self.template,
            source_entity=self.source_entity,
        )
        self.document = Document.objects.create(
            entity=self.target_entity,
            source="manual",
            title="Doc",
        )
        self.chunk = DocumentChunk.objects.create(
            document=self.document,
            chunk_index=0,
            text="Target chunk",
        )

    def test_records_search_hits_and_evaluations(self) -> None:
        criterion = SearchCriterion(
            id="fit",
            label="Fit",
            prompt="Check fit",
            source_snippet_limit=3,
            target_snippet_limit=3,
        )
        plan = SearchPlan(criteria=[criterion])
        recorder = MatchingJobAuditRecorder.start(
            job=self.job,
            plan=plan,
            matching_config_snapshot={
                "matching": {
                    "search_criteria": [asdict(criterion)],
                }
            },
        )

        context = build_search_context(
            criterion=criterion,
            query_type=MatchingSearchLog.QueryType.SOURCE,
            query_text=criterion.prompt,
            limit=3,
            filters={"entity_id": str(self.source_entity.id)},
        )
        hit = VectorSearchHit(chunk=self.chunk, score=0.42, metadata={"distance": 0.58})
        recorder.record_search(context=context, hits=[hit])

        evaluation = TargetEvaluation(
            target_id=str(self.target_entity.id),
            evaluations=[
                CriterionEvaluation(
                    criterion_id="fit",
                    criterion_label="Fit",
                    rating=MatchRating.GOOD,
                    reason="Strong fit",
                    rating_prompt="prompt",
                    rating_response="GOOD",
                    reasoning_prompt="reasoning",
                    reasoning_response="Strong fit",
                )
            ],
        )
        summary = TargetSearchSummary(
            target=self.target_entity,
            hits=[CriterionHit(criterion=criterion, chunk=self.chunk, score=0.42)],
        )
        recorder.record_evaluation(summary=summary, evaluation=evaluation, hit_ratio=1.0)
        recorder.finalize_success(candidates=[])

        self.assertEqual(self.job.runs.count(), 1)
        run = self.job.runs.first()
        self.assertEqual(run.searches.count(), 1)
        search_log = run.searches.first()
        self.assertEqual(search_log.hits.count(), 1)
        detail = run.evaluations.first().details.first()
        self.assertEqual(detail.rating_name, MatchRating.GOOD.name)
        self.assertEqual(run.status, run.Status.COMPLETE)
