import json
import re
import time
from typing import Any

from app.schemas.classification import ClassificationResult
from app.services.ai_providers.base import AIProvider, EffectiveProviderConfig


class MockProvider(AIProvider):
    def __init__(self, config: EffectiveProviderConfig) -> None:
        self._config = config

    @property
    def provider_key(self) -> str:
        return "mock"

    @property
    def model_name(self) -> str:
        return self._config.model_name

    def complete_json(self, system_prompt: str, user_prompt: str) -> tuple[dict[str, Any], int]:
        start = time.perf_counter()
        latency_ms = int((time.perf_counter() - start) * 1000)
        return self._mock_json(user_prompt), latency_ms

    def complete_text(self, system_prompt: str, user_prompt: str) -> tuple[str, int]:
        start = time.perf_counter()
        latency_ms = int((time.perf_counter() - start) * 1000)
        return self._mock_draft(user_prompt), latency_ms

    def test_connection(self) -> tuple[bool, str]:
        return True, "Mock provider is always available"

    def _mock_json(self, user_prompt: str) -> dict[str, Any]:
        text = user_prompt.lower()
        scenario = "complaint"
        sentiment = "negative"
        priority = "medium"
        if "спасибо" in text or "благодар" in text:
            scenario, sentiment, priority = "gratitude", "positive", "low"
        elif "?" in text or "как " in text:
            scenario, sentiment, priority = "question", "neutral", "low"
        elif "предлож" in text or "добавьте" in text:
            scenario, sentiment, priority = "suggestion", "neutral", "medium"
        topic = "delivery" if "достав" in text else "support"
        if "оплат" in text:
            topic = "payment"
        product_area = "logistics" if topic == "delivery" else "retail"
        return ClassificationResult(
            scenario=scenario,
            sentiment=sentiment,
            priority=priority,
            topic=topic,
            product_area=product_area,
            confidence=0.65,
        ).model_dump()

    def _mock_draft(self, user_prompt: str) -> str:
        name_match = re.search(r"customer_name:\s*([^\n]+)", user_prompt, re.I)
        name = name_match.group(1).strip() if name_match else "клиент"
        return (
            f"Здравствуйте, {name}. Благодарим вас за обращение. "
            "Мы зафиксировали ваш отзыв и подготовили ответ в рамках выбранного шаблона."
        )
