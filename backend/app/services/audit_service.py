import csv
import io
import json
from datetime import datetime, timezone
from uuid import UUID  # noqa: F401 (kept for API symmetry)

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.entities import AuditLog
from app.schemas.audit import AuditEntry, AuditListResponse


class AuditService:
    """Read side of the audit journal (writes go through log_audit())."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def list_audit(
        self,
        *,
        action: str | None = None,
        resource_type: str | None = None,
        user_role: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> AuditListResponse:
        query = select(AuditLog)
        filters = []
        if action:
            filters.append(AuditLog.action == action)
        if resource_type:
            filters.append(AuditLog.resource_type == resource_type)
        if user_role:
            filters.append(AuditLog.user_role == user_role)
        if date_from:
            filters.append(AuditLog.created_at >= date_from)
        if date_to:
            filters.append(AuditLog.created_at <= date_to)
        if filters:
            query = query.where(*filters)

        total = self.db.scalar(select(func.count()).select_from(query.subquery())) or 0
        rows = self.db.scalars(
            query.order_by(AuditLog.created_at.desc()).limit(limit).offset(offset)
        ).all()
        items = [self._to_entry(row) for row in rows]
        return AuditListResponse(
            items=items, total=total, limit=limit, offset=offset
        )

    def get_entry(self, entry_id: UUID) -> AuditEntry | None:
        row = self.db.get(AuditLog, entry_id)
        return self._to_entry(row) if row else None

    def csv_export(self, **filters) -> bytes:
        rows = self._export_rows(**filters)
        buf = io.StringIO()
        writer = csv.writer(buf)
        writer.writerow(
            [
                "id",
                "дата (UTC)",
                "роль",
                "пользователь",
                "действие",
                "тип ресурса",
                "id ресурса",
                "IP",
                "детали",
            ]
        )
        for r in rows:
            writer.writerow(
                [
                    r["seq_number"],
                    r["timestamp"],
                    r["user_role"],
                    r["user_id"] or r["user_name"] or "",
                    r["action"],
                    r["resource_type"],
                    r["resource_id"] or "",
                    r["ip_address"] or "",
                    json.dumps(r["details"], ensure_ascii=False),
                ]
            )
        # UTF-8 BOM so Excel opens Cyrillic columns correctly.
        return buf.getvalue().encode("utf-8-sig")

    def _export_rows(self, **filters) -> list[dict]:
        response = self.list_audit(**filters, limit=10000)
        return [e.model_dump(mode="json") for e in response.items]

    @staticmethod
    def _to_entry(log: AuditLog) -> AuditEntry:
        return AuditEntry(
            id=log.id,
            seq_number=log.seq_number,
            timestamp=log.created_at,
            user_id=log.user_id,
            user_name=log.user_name,
            user_role=log.user_role,
            action=log.action,
            resource_type=log.resource_type,
            resource_id=log.resource_id,
            ip_address=log.ip_address,
            details=dict(log.details or {}),
        )