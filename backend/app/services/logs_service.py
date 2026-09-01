"""Журнал «Логи»: проекция по обращениям (канон AIC OperationalLogs).

Один элемент журнала = одно обращение пользователя: на входе текст обращения,
на выходе — сформированный ответ и этапы обработки. События консоли (открытия
экранов, запросы отчётов) не логируются вовсе — чтения не создают шума
в журнале (принцип AIC: «read-only views intentionally not logged»).
"""

import csv
import io
import json
from datetime import datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models.entities import OperationalLog, Review, ReviewResponse
from app.schemas.logs import (
    ReviewStage,
    ReviewTraceDetail,
    ReviewTraceListResponse,
    ReviewTraceSummary,
)

# Сколько символов входа/выхода в списке (полный текст — в детализации).
PREVIEW_LEN = 200
CHUNK = 500


class LogsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    # === Список: проекция по обращениям ====================================

    def list_traces(
        self,
        *,
        review_id: UUID | None = None,
        status: str | None = None,
        request_number: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> ReviewTraceListResponse:
        query = select(Review)
        if review_id:
            query = query.where(Review.id == review_id)
        if date_from:
            query = query.where(Review.created_at >= date_from)
        if date_to:
            query = query.where(Review.created_at <= date_to)
        if request_number and request_number.strip():
            needle = request_number.strip()
            filters = [Review.request_number.ilike(f"%{needle}%")]
            try:
                filters.append(Review.id == UUID(needle))
            except ValueError:
                pass
            query = query.where(or_(*filters))

        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        reviews = self.db.scalars(
            query.order_by(Review.created_at.desc()).limit(limit).offset(offset)
        ).all()
        bundles = self._bundles([r.id for r in reviews])

        items = []
        for review in reviews:
            events, response_row = bundles.get(review.id, ([], None))
            items.append(self._to_summary(review, events, response_row))

        if status == "pending":
            items = [i for i in items if i.status == "pending"]
        elif status == "error":
            items = [i for i in items if i.status == "error"]
        elif status == "ok":
            items = [i for i in items if i.status == "ok"]

        return ReviewTraceListResponse(
            items=items, total=total, limit=limit, offset=offset
        )

    def get_trace(self, review_id: UUID) -> ReviewTraceDetail | None:
        review = self.db.get(Review, review_id)
        if not review:
            return None
        response_row = self._latest_response(review_id)
        events = self._events([review_id]).get(review_id, [])
        return self._to_detail(review, events, response_row)

    # === Экспорт ===========================================================

    def csv_export(self, **filters) -> bytes:
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(
            [
                "номер обращения",
                "дата (UTC)",
                "статус",
                "latency pipeline, мс",
                "модель",
                "обращение (вход)",
                "ответ системы (выход)",
                "модерация",
                "этапы обработки",
                "id обращения",
                "демо",
            ]
        )
        offset = 0
        while True:
            page = self.list_traces(**filters, limit=CHUNK, offset=offset)
            if not page.items:
                break
            for summary in page.items:
                trace = self.get_trace(summary.review_id)
                stages = " → ".join(
                    f"{s.event_type}"
                    + (f"({s.latency_ms}мс)" if s.latency_ms is not None else "")
                    for s in trace.stages
                )
                writer.writerow(
                    [
                        trace.request_number or "",
                        trace.created_at.isoformat(),
                        trace.status,
                        trace.latency_ms if trace.latency_ms is not None else "",
                        trace.model_name or "",
                        trace.request_text or "",
                        trace.response_text or "",
                        trace.moderation_status or "",
                        stages,
                        trace.review_id,
                        "да" if trace.demo_mode else "нет",
                    ]
                )
            if len(page.items) < CHUNK or offset + CHUNK >= 10000:
                break
            offset += CHUNK
        # UTF-8 BOM so Excel opens Cyrillic columns correctly.
        return buf.getvalue().encode("utf-8-sig")

    # === Сборка проекции ===================================================

    def _events(self, review_ids: list[UUID]) -> dict[UUID, list[OperationalLog]]:
        """События operational_logs по обращениям (один запрос на чанк id)."""
        result: dict[UUID, list[OperationalLog]] = {}
        for i in range(0, len(review_ids), CHUNK):
            chunk = review_ids[i : i + CHUNK]
            rows = self.db.scalars(
                select(OperationalLog)
                .where(
                    OperationalLog.entity_type == "review",
                    OperationalLog.entity_id.in_(chunk),
                )
                .order_by(OperationalLog.created_at.asc())
            ).all()
            for row in rows:
                result.setdefault(row.entity_id, []).append(row)
        return result

    def _bundles(
        self, review_ids: list[UUID]
    ) -> dict[UUID, tuple[list[OperationalLog], ReviewResponse | None]]:
        if not review_ids:
            return {}
        responses: dict[UUID, ReviewResponse] = {}
        for row in self.db.scalars(
            select(ReviewResponse)
            .where(ReviewResponse.review_id.in_(review_ids))
            .order_by(ReviewResponse.created_at.asc())
        ).all():
            responses[row.review_id] = row  # последняя по времени
        events = self._events(review_ids)
        return {rid: (events.get(rid, []), responses.get(rid)) for rid in review_ids}

    def _latest_response(self, review_id: UUID) -> ReviewResponse | None:
        return self.db.scalar(
            select(ReviewResponse)
            .where(ReviewResponse.review_id == review_id)
            .order_by(ReviewResponse.created_at.desc())
            .limit(1)
        )

    def _pipeline_info(self, events: list[OperationalLog]) -> tuple[str, int | None, str | None, str | None]:
        """Статус трейса, latency pipeline, модель, ошибка (по событиям)."""
        status = "pending"
        latency = None
        model = None
        error = None
        for e in events:
            if e.status == "error":
                status = "error"
                error = e.error_message or e.event_type
            if e.event_type == "draft_generated":
                meta = e.metadata_ or {}
                latency = meta.get("pipeline_total_ms") or e.latency_ms
                model = model or e.model_name
                if status != "error":
                    status = "ok"
            if e.event_type == "mock_publication_completed" and status != "error":
                status = "ok"
        return status, latency, model, error

    def _to_summary(
        self,
        review: Review,
        events: list[OperationalLog],
        response_row: ReviewResponse | None,
    ) -> ReviewTraceSummary:
        status, latency, model, _ = self._pipeline_info(events)
        response_text = None
        if response_row:
            response_text = response_row.final_response or response_row.draft_response
            if response_text and status == "pending":
                status = "ok"
        return ReviewTraceSummary(
            review_id=review.id,
            request_number=review.request_number,
            created_at=review.created_at,
            request_preview=(review.review_text or "")[:PREVIEW_LEN] or None,
            status=status,
            latency_ms=latency,
            model_name=model,
            response_preview=(response_text or "")[:PREVIEW_LEN] or None,
            demo_mode=bool(review.demo_mode),
            event_count=len(events),
        )

    def _to_detail(
        self,
        review: Review,
        events: list[OperationalLog],
        response_row: ReviewResponse | None,
    ) -> ReviewTraceDetail:
        status, latency, model, error = self._pipeline_info(events)
        response_text = None
        if response_row:
            response_text = response_row.final_response or response_row.draft_response
            if response_text and status == "pending":
                status = "ok"
        stages = [
            ReviewStage(
                event_type=e.event_type,
                status=e.status,
                latency_ms=e.latency_ms,
                model_name=e.model_name,
                created_at=e.created_at,
                message=e.error_message,
                metadata=dict(e.metadata_ or {}),
            )
            for e in events
        ]
        return ReviewTraceDetail(
            review_id=review.id,
            request_number=review.request_number,
            created_at=review.created_at,
            request_text=review.review_text,
            response_text=response_text,
            moderation_status=response_row.moderation_status if response_row else None,
            publication_status=response_row.publication_status if response_row else None,
            status=status,
            latency_ms=latency,
            model_name=model,
            error=error,
            demo_mode=bool(review.demo_mode),
            stages=stages,
            pipeline_summary=" → ".join(s.event_type for s in stages) or None,
        )