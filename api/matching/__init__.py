"""Matching domain package.

This package encapsulates the orchestration logic for executing a matching job
against configured target entities. The public entrypoint is
``matching.run_matching_job``.
"""

from .engine import run_matching_job

__all__ = ["run_matching_job"]
