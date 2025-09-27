"""Package-specific exceptions for the matching system."""


class MatchingError(Exception):
    """Base exception raised for any matching orchestration issue."""


class PlanningError(MatchingError):
    """Raised when we cannot derive a search plan from the job configuration."""


class ProviderConfigurationError(MatchingError):
    """Raised when we cannot initialise required external providers (LLM, vector store)."""
