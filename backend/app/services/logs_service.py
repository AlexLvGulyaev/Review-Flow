from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import OperationalLog
from app.schemas.logs import LogEntry


class LogsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_logs(
        self,
        *,
        event_type: str | None = None,
        review_id: UUID | None = None,
        limit: int = 100,
    ) -> list[LogEntry]:
        query = select(OperationalLog).order_by(OperationalLog.created_at.desc())
        if event_type:
            query = query.where(OperationalLog.event_type == event_type)
        if review_id:
            query = query.where(
                OperationalLog.entity_type == "review",
                OperationalLog.entity_id == review_id,
            )
        query = query.limit(min(limit, 500))
        logs = self.db.scalars(query).all()
        return [self._to_entry(log) for log in logs]

    @staticmethod
    def _to_entry(log: OperationalLog) -> LogEntry:
        review_id = log.entity_id if log.entity_type == "review" else None
        metadata = dict(log.metadata_ or {})
        if log.model_name:
            metadata["model_name"] = log.model_name
        if log.status:
            metadata["status"] = log.status
        if log.prompt_version_id:
            metadata["prompt_version_id"] = str(log.prompt_version_id)

        message = log.error_message or log.event_type.replace("_", " ")

        return LogEntry(
            timestamp=log.created_at,
            event_type=log.event_type,
            review_id=review_id,
            message=message,
            latency_ms=log.latency_ms,
            metadata=metadata,
        )
