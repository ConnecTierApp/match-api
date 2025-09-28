"""Matching domain package.

This package encapsulates the orchestration logic for executing a matching job
against configured target entities. The public entrypoints are
``matching.run_matching_job`` for synchronous usage and
``matching.tasks.run_matching_job_task`` when executed via Celery.
"""

from .engine import run_matching_job
from .tasks import run_matching_job_task
from .configuration import MatchingConfiguration, CriterionDefinition

__all__ = ["run_matching_job", "run_matching_job_task", "MatchingConfiguration", "CriterionDefinition"]
