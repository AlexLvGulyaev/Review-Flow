from __future__ import annotations

import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.ch_entities import ResponseCase
from app.models.entities import Review
from app.services.ai_provider_runtime import AIProviderRuntime, ResolvedAIProvider
from app.services.prompt_service import PromptService

BOUNDED_SYSTEM_PROMPT = """You adapt a pre-approved customer response for a specific situation.
Follow the response policy strictly. Use the approved response text as the factual and tonal basis.
Do not invent compensation, deadlines, or facts not supported by the policy or approved text.
Output only the final message addressed to the customer."""


class CaseDraftGenerationService:
    def __init__(
        self,
        db: Session,
        resolved: ResolvedAIProvider | None = None,
    ) -> None:
        self.db = db
        if resolved is not None:
            self.ai = resolved.provider
            self._resolved = resolved
        else:
            r = AIProviderRuntime(db).resolve()
            self.ai = r.provider
            self._resolved = r
        self.prompts = PromptService(db)

    def generate(
        self,
        *,
        review: Review,
        response_case: ResponseCase,
        customer_name: str,
    ) -> tuple[str, int, object, dict[str, Any]]:
        prompt_version = self.prompts.get_active(PromptService.PROMPT_KEY_GENERATION)
        system_prompt = prompt_version.system_prompt.strip() or BOUNDED_SYSTEM_PROMPT

        user_prompt = (
            f"Response policy:\n{response_case.response_policy}\n\n"
            f"Approved response basis:\n{response_case.approved_response_text}\n\n"
            f"Customer review:\n{review.review_text}\n\n"
            f"Customer name: {customer_name}\n\n"
            "Adapt the approved basis into a single customer-facing reply."
        )

        draft, latency_ms = self.ai.complete_text(system_prompt, user_prompt)
        draft = draft.replace("{{customer_name}}", customer_name)

        metadata: dict[str, Any] = {
            "pipeline": "controlled_hybrid",
            "provider": self.ai.provider_key,
            "model": self.ai.model_name,
            "response_case_id": str(response_case.id),
            "case_code": response_case.case_code,
            "generation_mode": "case_policy_adaptation",
        }
        if prompt_version:
            metadata["prompt_key"] = prompt_version.prompt_key
            metadata["prompt_version"] = prompt_version.version
            metadata["prompt_version_id"] = str(prompt_version.id)
        if self._resolved:
            metadata["used_fallback"] = self._resolved.used_fallback
            if self._resolved.requested_key:
                metadata["requested_provider"] = self._resolved.requested_key
        return draft, latency_ms, prompt_version, metadata
