import json
import re
import time
from typing import Any

from openai import OpenAI

from app.core.config import settings
from app.schemas.classification import ClassificationResult


class LLMClient:
    def __init__(self) -> None:
        self._client: OpenAI | None = None
        if settings.openai_api_key:
            self._client = OpenAI(
                api_key=settings.openai_api_key,
                base_url=settings.openai_base_url,
            )

    @property
    def model_name(self) -> str:
        return settings.openai_model if self._client else "mock"

    def complete_json(self, system_prompt: str, user_prompt: str) -> tuple[dict[str, Any], int]:
        start = time.perf_counter()
        if self._client:
            response = self._client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                response_format={"type": "json_object"},
                temperature=0.1,
            )
            content = response.choices[0].message.content or "{}"
            latency_ms = int((time.perf_counter() - start) * 1000)
            return json.loads(content), latency_ms

        latency_ms = int((time.perf_counter() - start) * 1000)
        return self._mock_json(user_prompt), latency_ms

    def complete_text(self, system_prompt: str, user_prompt: str) -> tuple[str, int]:
        start = time.perf_counter()
        if self._client:
            response = self._client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
            )
            content = response.choices[0].message.content or ""
            latency_ms = int((time.perf_counter() - start) * 1000)
            return content.strip(), latency_ms

        latency_ms = int((time.perf_counter() - start) * 1000)
        return self._mock_draft(user_prompt), latency_ms

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
