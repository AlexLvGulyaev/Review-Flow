import json
import time

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import InteractionScenario, SentimentProfile
from app.schemas.classification import ClassificationResult
from app.services.ai_providers.base import AIProvider
from app.services.phrase_matching import PhraseMatchResult
from app.services.prompt_service import PromptService


class ClassificationService:
    CLASSIFICATION_JSON_CONTRACT = """
Return ONLY valid JSON with keys:
scenario, sentiment, priority, topic, product_area, confidence.
scenario: complaint|gratitude|suggestion|question
sentiment: positive|neutral|negative|aggressive
priority: low|medium|high|critical
confidence: number 0..1
"""

    def __init__(self, db: Session, ai_provider: AIProvider | None = None) -> None:
        self.db = db
        if ai_provider is None:
            from app.services.ai_provider_runtime import AIProviderRuntime

            ai_provider = AIProviderRuntime(db).resolve().provider
        self.ai = ai_provider
        self.prompts = PromptService(db)

    def classify(
        self,
        *,
        review_text: str,
        rating: int,
        product_area: str,
        phrase_match: PhraseMatchResult,
    ) -> tuple[ClassificationResult, object, int]:
        prompt_version = self.prompts.get_active(PromptService.PROMPT_KEY_CLASSIFICATION)
        scenarios = self._active_scenario_codes()
        sentiments = self._active_sentiment_codes()

        matched_phrase_text = None
        if phrase_match.matched_phrase:
            matched_phrase_text = phrase_match.matched_phrase.phrase_text

        payload = json.dumps(
            {
                "review_text": review_text,
                "rating": rating,
                "product_area": product_area,
                "matched_phrase": matched_phrase_text,
                "classification_source_hint": phrase_match.classification_source,
                "available_scenarios": scenarios,
                "available_sentiments": sentiments,
            },
            ensure_ascii=False,
        )

        user_prompt = self.prompts.render_template(
            prompt_version.user_prompt_template,
            {"review_payload": payload},
        )
        system_prompt = (
            prompt_version.system_prompt
            + "\n\n"
            + self.CLASSIFICATION_JSON_CONTRACT
        )

        start = time.perf_counter()
        raw, latency_ms = self.ai.complete_json(system_prompt, user_prompt)
        result = ClassificationResult.model_validate(raw)

        if phrase_match.matched_phrase and phrase_match.classification_source == "phrase_match":
            pattern = phrase_match.matched_phrase
            if pattern.scenario:
                result = result.model_copy(update={"scenario": pattern.scenario})
            if pattern.sentiment:
                result = result.model_copy(update={"sentiment": pattern.sentiment})
            if pattern.topic:
                result = result.model_copy(update={"topic": pattern.topic})
            if pattern.product_area:
                result = result.model_copy(update={"product_area": pattern.product_area})
            if pattern.priority_hint:
                result = result.model_copy(update={"priority": pattern.priority_hint})

        if not result.product_area:
            result = result.model_copy(update={"product_area": product_area})

        return result, prompt_version, latency_ms

    def _active_scenario_codes(self) -> list[str]:
        rows = self.db.scalars(
            select(InteractionScenario.scenario_code).where(
                InteractionScenario.is_active.is_(True)
            )
        ).all()
        if rows:
            return list(rows)
        return ["complaint", "gratitude", "suggestion", "question"]

    def _active_sentiment_codes(self) -> list[str]:
        rows = self.db.scalars(
            select(SentimentProfile.sentiment_code).where(
                SentimentProfile.is_active.is_(True)
            )
        ).all()
        if rows:
            return list(rows)
        return ["positive", "neutral", "negative", "aggressive"]
