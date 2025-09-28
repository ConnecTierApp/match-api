"""Schema and validation helpers for matching configuration payloads."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Iterable, Mapping

from django.utils.text import slugify

from .exceptions import MatchingError


class ConfigurationError(MatchingError):
    """Raised when matching configuration payloads are invalid."""


@dataclass(slots=True)
class CriterionDefinition:
    """Normalized representation of a search criterion."""

    id: str
    label: str
    prompt: str
    weight: float = 1.0
    guidance: str | None = None
    source_snippet_limit: int = 3
    target_snippet_limit: int = 3

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "label": self.label,
            "prompt": self.prompt,
            "weight": self.weight,
            "guidance": self.guidance,
            "source_snippet_limit": self.source_snippet_limit,
            "target_snippet_limit": self.target_snippet_limit,
        }


@dataclass(slots=True)
class MatchingConfiguration:
    """Full matching configuration shared between template and job override."""

    scoring_strategy: str | None = None
    description: str | None = None
    search_criteria: list[CriterionDefinition] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "scoring_strategy": self.scoring_strategy,
            "description": self.description,
            "search_criteria": [criterion.to_dict() for criterion in self.search_criteria],
        }


_ALLOWED_EXTRA_KEYS = {
    "display_name",
    "source_entity_type",
    "target_entity_type",
    "source_count",
    "target_count",
    "notes",
}


def _as_mapping(value: Any, *, context: str) -> Mapping[str, Any]:
    if value is None:
        return {}
    if not isinstance(value, Mapping):
        raise ConfigurationError(f"Expected {context} configuration to be an object.")
    return value


def _normalize_string(value: Any, *, field_name: str, context: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ConfigurationError(f"{context} {field_name} must be a non-empty string.")
    return value.strip()


def _normalize_optional_string(value: Any) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        return None
    cleaned = value.strip()
    return cleaned or None


def _normalize_weight(value: Any, *, context: str) -> float:
    if value is None:
        return 1.0
    try:
        weight = float(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise ConfigurationError(f"{context} weight must be numeric.") from exc
    if weight <= 0:
        raise ConfigurationError(f"{context} weight must be positive.")
    return weight


def _normalize_limit(value: Any, *, field_name: str, context: str, default: int = 3) -> int:
    if value is None:
        return default
    try:
        integer = int(value)
    except (TypeError, ValueError) as exc:  # pragma: no cover - defensive
        raise ConfigurationError(f"{context} {field_name} must be an integer.") from exc
    if integer <= 0 or integer > 10:
        raise ConfigurationError(
            f"{context} {field_name} must be between 1 and 10 (received {integer})."
        )
    return integer


def _normalize_criterion(data: Mapping[str, Any], *, index: int, context: str) -> CriterionDefinition:
    label = _normalize_string(data.get("label") or data.get("name"), field_name="label", context=context)
    prompt = _normalize_string(data.get("prompt") or data.get("query") or data.get("description"), field_name="prompt", context=context)
    weight = _normalize_weight(data.get("weight"), context=context)
    guidance = _normalize_optional_string(data.get("guidance"))
    source_limit = _normalize_limit(
        data.get("source_snippet_limit") or data.get("source_limit"),
        field_name="source_snippet_limit",
        context=context,
    )
    target_limit = _normalize_limit(
        data.get("target_snippet_limit") or data.get("target_limit"),
        field_name="target_snippet_limit",
        context=context,
    )

    raw_id = data.get("id") or data.get("key") or slugify(label) or f"criterion-{index + 1}"
    criterion_id = slugify(str(raw_id)) or f"criterion-{index + 1}"

    return CriterionDefinition(
        id=criterion_id,
        label=label,
        prompt=prompt,
        weight=weight,
        guidance=guidance,
        source_snippet_limit=source_limit,
        target_snippet_limit=target_limit,
    )


def normalize_search_criteria(config: Mapping[str, Any], *, context: str, require: bool) -> list[CriterionDefinition]:
    raw = config.get("search_criteria")
    if raw in (None, ""):
        return []
    if not isinstance(raw, Iterable):
        raise ConfigurationError(f"{context} search_criteria must be a list.")

    criteria = []
    for index, item in enumerate(raw):
        if not isinstance(item, Mapping):
            raise ConfigurationError("Each search criterion must be an object.")
        criterion = _normalize_criterion(item, index=index, context=context)
        criteria.append(criterion)

    if require and not criteria:
        raise ConfigurationError(f"{context} configuration must include at least one search criterion.")

    if len(criteria) > 20:
        raise ConfigurationError("A maximum of 20 search criteria are supported.")

    seen_ids: set[str] = set()
    for criterion in criteria:
        if criterion.id in seen_ids:
            raise ConfigurationError(f"Duplicate criterion id '{criterion.id}' detected.")
        seen_ids.add(criterion.id)

    return criteria


def normalize_matching_config(
    config: Mapping[str, Any] | None,
    *,
    context: str,
    require_criteria: bool,
) -> tuple[dict[str, Any], MatchingConfiguration]:
    config_mapping = dict(_as_mapping(config, context=context))

    criteria = normalize_search_criteria(config_mapping, context=context, require=require_criteria)

    scoring_strategy = _normalize_optional_string(config_mapping.get("scoring_strategy"))
    description = _normalize_optional_string(config_mapping.get("description"))

    normalized = dict(config_mapping)
    if criteria:
        normalized["search_criteria"] = [criterion.to_dict() for criterion in criteria]

    return (
        normalized,
        MatchingConfiguration(
            scoring_strategy=scoring_strategy,
            description=description,
            search_criteria=criteria,
        ),
    )


def merge_configurations(
    template_config: Mapping[str, Any] | None,
    job_override: Mapping[str, Any] | None,
) -> tuple[dict[str, Any], dict[str, Any], MatchingConfiguration]:
    """Return normalized template config, job override, and the effective configuration."""

    normalized_template, template_definition = normalize_matching_config(
        template_config,
        context="Template",
        require_criteria=True,
    )

    normalized_override, override_definition = normalize_matching_config(
        job_override,
        context="Job override",
        require_criteria=False,
    )

    search_criteria = override_definition.search_criteria or template_definition.search_criteria

    # Build the effective configuration by layering override fields on top.
    effective = MatchingConfiguration(
        scoring_strategy=override_definition.scoring_strategy or template_definition.scoring_strategy,
        description=override_definition.description or template_definition.description,
        search_criteria=list(search_criteria),
    )

    return normalized_template, normalized_override, effective
