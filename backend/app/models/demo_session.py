"""Demo session model for the public Web UI demo limiter."""

from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class DemoSession(Base):
    """A time- and quota-bound token for public Web UI demo access.

    Each public demo browser obtains an opaque token via POST /api/demo/start.
    The token is sent as the X-Demo-Token header on POST /api/reviews and
    consumes a per-session request quota with a rate limit.
    """

    __tablename__ = "demo_sessions"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    token: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    session_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    client_ip: Mapped[str | None] = mapped_column(String(45), nullable=True, index=True)
    requests_used: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    requests_limit: Mapped[int] = mapped_column(
        Integer, nullable=False, default=20, server_default="20"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_request_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )