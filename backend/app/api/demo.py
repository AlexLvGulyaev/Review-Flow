"""Demo session endpoints and the demo-token dependency for the public Web UI."""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.audit_helpers import audit_client
from app.core.config import settings
from app.db.session import get_db
from app.models.demo_session import DemoSession
from app.services.demo_limiter import DemoLimiterService

router = APIRouter(prefix="/api/demo", tags=["demo"])


def _client_ip(request: Request) -> Optional[str]:
    """Extract the real client IP from proxy headers or the connection."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        client = forwarded.split(",")[0].strip()
        if client:
            return client
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip() or None
    if request.client:
        return request.client.host
    return None


class DemoStartPayload(BaseModel):
    """Optional client-provided session id when starting a demo session."""

    session_id: Optional[str] = Field(None, max_length=255)


class DemoStartResponse(BaseModel):
    """Demo session token and quota information."""

    token: str
    session_id: Optional[str] = None
    requests_limit: int
    requests_remaining: int
    rate_limit_per_minute: int
    expires_at: str


class DemoStatusResponse(BaseModel):
    """Current state of a demo session token."""

    token: str
    session_id: Optional[str] = None
    requests_used: int
    requests_limit: int
    requests_remaining: int
    expires_at: Optional[str] = None
    is_active: bool


def _ensure_demo_enabled() -> None:
    """Raise if the demo limiter is not enabled on this instance."""
    if not settings.demo_limiter_enabled:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Demo mode is not enabled on this instance",
        )


@router.post("/start", response_model=DemoStartResponse)
def start_demo_session(
    request: Request,
    payload: DemoStartPayload,
    db: Session = Depends(get_db),
) -> DemoStartResponse:
    """Create a new demo session token for the Web UI.

    The returned token must be sent as the `X-Demo-Token` header on every
    `POST /api/reviews` request.
    """
    _ensure_demo_enabled()
    client_ip = _client_ip(request)
    service = DemoLimiterService(db)
    demo = service.create_session(client_ip=client_ip, session_id=payload.session_id)
    # Аудит пользовательской активности: кто зашёл в read-only демку
    # (пресейловый сигнал; токен демо-сессии в журнал не пишем).
    audit_client(
        request,
        "demo_session_started",
        role="demo",
        resource_type="demo_session",
        resource_id=str(demo.id),
        db=db,
        details={"session_id": payload.session_id},
    )
    db.commit()
    return DemoStartResponse(
        token=demo.token,
        session_id=demo.session_id,
        requests_limit=demo.requests_limit,
        requests_remaining=max(0, demo.requests_limit - demo.requests_used),
        rate_limit_per_minute=settings.demo_rate_limit_per_minute,
        expires_at=demo.expires_at.isoformat(),
    )


@router.get("/status", response_model=DemoStatusResponse)
def demo_status(
    request: Request,
    db: Session = Depends(get_db),
) -> DemoStatusResponse:
    """Return the current quota and expiration status of a demo token.

    The token is read from the `X-Demo-Token` header.
    """
    _ensure_demo_enabled()
    token = request.headers.get("x-demo-token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-Demo-Token header is required",
        )
    service = DemoLimiterService(db)
    return DemoStatusResponse(**service.get_status(token))


def require_demo_token(
    request: Request,
    db: Session = Depends(get_db),
) -> Optional[DemoSession]:
    """Validate the X-Demo-Token header when the demo limiter is enabled.

    In dev/test environments (demo_limiter_enabled=False) the dependency is a
    no-op. In production it returns the validated DemoSession after consuming
    one request from the quota. The quota consumption is committed here so a
    failed review payload cannot be used to avoid the quota.
    """
    if not settings.demo_limiter_enabled:
        return None

    token = request.headers.get("x-demo-token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="X-Demo-Token header is required",
        )
    service = DemoLimiterService(db)
    demo = service.check_and_record_request(token, _client_ip(request))
    db.commit()
    return demo