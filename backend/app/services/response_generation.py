import json
from typing import Any

from sqlalchemy.orm import Session

from app.models.entities import ResponseTemplate, Review
from app.schemas.classification import ClassificationResult
from app.services.ai_providers.base import AIProvider
from app.services.ai_provider_runtime import ResolvedAIProvider
from app.services.prompt_service import PromptService


class ResponseGenerationService:
    def __init__(
        self,
        db: Session,
        ai_provider: AIProvider | None = None,
        resolved: ResolvedAIProvider | None = None,
    ) -> None:
        self.db = db
        if resolved is not None:
            self.ai = resolved.provider
            self._resolved = resolved
        elif ai_provider is not None:
            self.ai = ai_provider
            self._resolved = None
        else:
            from app.services.ai_provider_runtime import AIProviderRuntime

            r = AIProviderRuntime(db).resolve()
            self.ai = r.provider
            self._resolved = r
        self.prompts = PromptService(db)

    def generate(
        self,
        *,
        review: Review,
        classification: ClassificationResult,
        template: ResponseTemplate,
        customer_name: str,
    ) -> tuple[str, int, object, dict[str, Any]]:
        prompt_version = self.prompts.get_active(PromptService.PROMPT_KEY_GENERATION)

        context = {
            "customer_name": customer_name,
            "review_text": review.review_text,
            "rating": str(review.rating or ""),
            "classification_json": json.dumps(
                classification.model_dump(), ensure_ascii=False
            ),
            "template_text": template.template_text or "",
            "required_elements": template.required_elements or "",
            "forbidden_elements": template.forbidden_elements or "",
        }
        user_prompt = self.prompts.render_template(
            prompt_version.user_prompt_template, context
        )
        draft, latency_ms = self.ai.complete_text(
            prompt_version.system_prompt, user_prompt
        )
        draft = draft.replace("{{customer_name}}", customer_name)

        metadata = {
            "provider": self.ai.provider_key,
            "model": self.ai.model_name,
            "prompt_key": prompt_version.prompt_key,
            "prompt_version": prompt_version.version,
            "prompt_version_id": str(prompt_version.id),
        }
        if self._resolved:
            metadata["used_fallback"] = self._resolved.used_fallback
            if self._resolved.requested_key:
                metadata["requested_provider"] = self._resolved.requested_key
        return draft, latency_ms, prompt_version, metadata
