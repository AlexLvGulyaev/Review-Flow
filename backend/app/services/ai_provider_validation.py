"""Structural validation for AI provider settings (model name)."""

from __future__ import annotations

import re

MODEL_NAME_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
MODEL_NAME_MAX_LEN = 128

GIGACHAT_MODEL_WHITELIST: frozenset[str] = frozenset(
    {
        "GigaChat",
        "GigaChat-Max",
        "GigaChat-Pro",
        "GigaChat-Plus",
    }
)


def validate_model_name(provider_key: str, model_name: str) -> str:
    """Return normalized model name or raise ValueError."""
    normalized = model_name.strip()
    if not normalized:
        raise ValueError("Model name is required")
    if len(normalized) > MODEL_NAME_MAX_LEN:
        raise ValueError(f"Model name must be at most {MODEL_NAME_MAX_LEN} characters")
    if not MODEL_NAME_PATTERN.match(normalized):
        raise ValueError(
            "Model name may only contain Latin letters, digits, dot, hyphen, and underscore"
        )
    if provider_key == "gigachat" and normalized not in GIGACHAT_MODEL_WHITELIST:
        allowed = ", ".join(sorted(GIGACHAT_MODEL_WHITELIST))
        raise ValueError(f"Unknown GigaChat model. Allowed: {allowed}")
    return normalized
