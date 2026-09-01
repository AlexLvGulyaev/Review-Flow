from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class ReviewTraceSummary(BaseModel):
    """Одна строка журнала логов = одно обращение пользователя (канон AIC:
    ChatRequest + ChatLog). На входе — обращение, на выходе — его статус."""

    review_id: UUID
    request_number: str | None = None
    created_at: datetime
    request_preview: str | None = None
    # ok — ответ сформирован, error — сбой pipeline, pending — ответа ещё нет
    status: str = "pending"
    latency_ms: int | None = None
    model_name: str | None = None
    response_preview: str | None = None
    demo_mode: bool = False
    event_count: int = 0


class ReviewTraceListResponse(BaseModel):
    items: list[ReviewTraceSummary]
    total: int
    limit: int
    offset: int


class ReviewStage(BaseModel):
    """Этап обработки обращения (событие operational_logs по entity_id)."""

    event_type: str
    status: str | None = None
    latency_ms: int | None = None
    model_name: str | None = None
    created_at: datetime
    message: str | None = None
    metadata: dict[str, Any]


class ReviewTraceDetail(BaseModel):
    """Развёрнутый трейс обращения: вход → обработка → выход (канон AIC
    get_operational_log: message + answer + execution steps + analytics)."""

    review_id: UUID
    request_number: str | None = None
    created_at: datetime
    request_text: str | None = None
    response_text: str | None = None
    moderation_status: str | None = None
    publication_status: str | None = None
    status: str = "pending"
    latency_ms: int | None = None
    model_name: str | None = None
    error: str | None = None
    demo_mode: bool = False
    stages: list[ReviewStage]
    pipeline_summary: str | None = None