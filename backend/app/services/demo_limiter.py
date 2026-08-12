"""Demo session limiter for the public Web UI (sync adaptation).

Protects the expensive AI pipeline (POST /api/reviews) from abuse via
opaque per-session tokens with a three-layer limit:

  - max sessions per IP per hour  (mass-session guard)
  - min interval between requests (in-session spam guard)
  - max requests per session       (total-abuse guard)

Backend is the single source of truth for the quota; the UI only mirrors it.
"""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.demo_session import DemoSession


class DemoLimiterService:
    """Manage demo session tokens, quotas and rate limits (sync Session)."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def _active_sessions_for_ip(self, client_ip: str, hours: int = 1) -> int:
        """Count demo sessions created for this IP within the last N hours."""
        if not client_ip:
            return 0
        cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
        rows = (
            self.db.execute(
                select(DemoSession).where(
                    DemoSession.client_ip == client_ip,
                    DemoSession.created_at >= cutoff,
                    DemoSession.is_active.is_(True),
                )
            )
            .scalars()
            .all()
        )
        return len(rows)

    def create_session(
        self,
        client_ip: Optional[str],
        session_id: Optional[str] = None,
    ) -> DemoSession:
        """Create a new demo session token.

        Raises HTTPException(429) when the IP has created too many recent
        sessions.
        """
        if settings.demo_max_sessions_per_ip_per_hour > 0 and client_ip:
            recent = self._active_sessions_for_ip(client_ip, hours=1)
            if recent >= settings.demo_max_sessions_per_ip_per_hour:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many demo sessions from this IP address. Please try again later.",
                )

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(minutes=settings.demo_session_ttl_minutes)
        demo = DemoSession(
            token=self._generate_token(),
            session_id=session_id,
            client_ip=client_ip,
            requests_used=0,
            requests_limit=settings.demo_max_requests_per_session,
            is_active=True,
            created_at=now,
            expires_at=expires_at,
            last_request_at=None,
        )
        self.db.add(demo)
        self.db.flush()
        self.db.refresh(demo)
        return demo

    def get_session(self, token: str) -> Optional[DemoSession]:
        """Return a demo session by token, or None if not found."""
        return (
            self.db.execute(select(DemoSession).where(DemoSession.token == token))
            .scalars()
            .one_or_none()
        )

    def check_and_record_request(
        self,
        token: str,
        client_ip: Optional[str],
    ) -> DemoSession:
        """Validate a token for a request and consume one unit of quota.

        Raises HTTPException for missing, expired, rate-limited or exhausted
        tokens.
        """
        demo = self.get_session(token)
        if demo is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid demo token",
            )

        now = datetime.now(timezone.utc)
        if not demo.is_active or demo.expires_at <= now:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Demo session has expired. Please start a new demo session.",
            )

        # Rate limit: minimum interval between requests from the same token.
        min_interval_seconds = 60.0 / max(settings.demo_rate_limit_per_minute, 1)
        if demo.last_request_at is not None:
            elapsed = (now - demo.last_request_at).total_seconds()
            if elapsed < min_interval_seconds:
                retry_after = int(min_interval_seconds - elapsed) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Demo rate limit exceeded. Please wait before sending the next message.",
                    headers={"Retry-After": str(retry_after)},
                )

        if demo.requests_used >= demo.requests_limit:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demo request quota exhausted. Please start a new demo session.",
            )

        demo.requests_used += 1
        demo.last_request_at = now
        self.db.flush()
        self.db.refresh(demo)
        return demo

    def get_status(self, token: str) -> dict:
        """Return the current quota status for a token."""
        demo = self.get_session(token)
        if demo is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Demo session not found",
            )
        remaining = max(0, demo.requests_limit - demo.requests_used)
        return {
            "token": demo.token,
            "session_id": demo.session_id,
            "requests_used": demo.requests_used,
            "requests_limit": demo.requests_limit,
            "requests_remaining": remaining,
            "expires_at": demo.expires_at.isoformat() if demo.expires_at else None,
            "is_active": demo.is_active and demo.expires_at > datetime.now(timezone.utc),
        }

    @staticmethod
    def _generate_token() -> str:
        """Generate an opaque demo session token."""
        return uuid.uuid4().hex