"""Tests for the public Web UI tokenized demo limiter.

Two layers are covered:

1. ``DemoLimiterService`` branching logic (IP limit, TTL expiry, rate limit,
   quota) — exercised with a mock Session and monkeypatched query helpers so the
   datetime comparisons run against controlled timezone-aware values (no DB).
2. The ``require_demo_token`` dependency and the ``/api/demo`` endpoints —
   exercised via ``TestClient`` with ``get_db`` overridden to a mock and the
   service methods patched, which tests the wiring (enable-gate, header
   reading, quota commit) without a database.
"""

from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from fastapi import Depends, FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.api.demo import require_demo_token, router as demo_router
from app.core.config import settings
from app.db.session import get_db
from app.models.demo_session import DemoSession
from app.services.demo_limiter import DemoLimiterService


def _mk_demo(**kw) -> DemoSession:
    """Build an in-memory DemoSession with sensible aware-datetime defaults."""
    now = datetime.now(timezone.utc)
    return DemoSession(
        token=kw.get("token", "tok-1"),
        session_id=kw.get("session_id", None),
        client_ip=kw.get("client_ip", None),
        requests_used=kw.get("requests_used", 0),
        requests_limit=kw.get("requests_limit", settings.demo_max_requests_per_session),
        is_active=kw.get("is_active", True),
        created_at=kw.get("created_at", now),
        expires_at=kw.get("expires_at", now + timedelta(minutes=5)),
        last_request_at=kw.get("last_request_at", None),
    )


def _mock_db() -> MagicMock:
    return MagicMock()


def _override_get_db(db):
    def _gen():
        yield db

    return _gen


# --------------------------------------------------------------------------- #
# DemoLimiterService logic
# --------------------------------------------------------------------------- #


def test_create_session_ok(monkeypatch):
    db = _mock_db()
    svc = DemoLimiterService(db)
    monkeypatch.setattr(svc, "_active_sessions_for_ip", lambda ip, hours=1: 0)

    demo = svc.create_session(client_ip="1.2.3.4", session_id="s1")

    assert len(demo.token) == 32  # uuid4 hex
    assert demo.session_id == "s1"
    assert demo.requests_used == 0
    assert demo.requests_limit == settings.demo_max_requests_per_session
    assert demo.expires_at > demo.created_at
    db.add.assert_called_once()
    db.flush.assert_called_once()


def test_create_session_ip_limit_429(monkeypatch):
    db = _mock_db()
    svc = DemoLimiterService(db)
    monkeypatch.setattr(
        svc,
        "_active_sessions_for_ip",
        lambda ip, hours=1: settings.demo_max_sessions_per_ip_per_hour,
    )

    with pytest.raises(HTTPException) as exc:
        svc.create_session(client_ip="1.2.3.4")

    assert exc.value.status_code == 429
    db.add.assert_not_called()


def test_create_session_without_ip_skips_ip_limit(monkeypatch):
    db = _mock_db()
    svc = DemoLimiterService(db)
    calls = {"n": 0}

    def _ipcount(ip, hours=1):
        calls["n"] += 1
        return 999

    monkeypatch.setattr(svc, "_active_sessions_for_ip", _ipcount)

    demo = svc.create_session(client_ip=None)

    assert calls["n"] == 0
    assert demo.token


def test_check_and_record_request_success(monkeypatch):
    db = _mock_db()
    svc = DemoLimiterService(db)
    demo = _mk_demo(requests_used=0, last_request_at=None)
    monkeypatch.setattr(svc, "get_session", lambda token: demo)

    out = svc.check_and_record_request("tok-1", client_ip="1.2.3.4")

    assert out.requests_used == 1
    assert out.last_request_at is not None
    db.flush.assert_called_once()


def test_check_and_record_request_invalid_token_403(monkeypatch):
    svc = DemoLimiterService(_mock_db())
    monkeypatch.setattr(svc, "get_session", lambda token: None)

    with pytest.raises(HTTPException) as exc:
        svc.check_and_record_request("nope", client_ip=None)

    assert exc.value.status_code == 403


def test_check_and_record_request_expired_401(monkeypatch):
    svc = DemoLimiterService(_mock_db())
    past = datetime.now(timezone.utc) - timedelta(minutes=1)
    demo = _mk_demo(expires_at=past)
    monkeypatch.setattr(svc, "get_session", lambda token: demo)

    with pytest.raises(HTTPException) as exc:
        svc.check_and_record_request("tok-1", client_ip=None)

    assert exc.value.status_code == 401


def test_check_and_record_request_inactive_401(monkeypatch):
    svc = DemoLimiterService(_mock_db())
    demo = _mk_demo(is_active=False)
    monkeypatch.setattr(svc, "get_session", lambda token: demo)

    with pytest.raises(HTTPException) as exc:
        svc.check_and_record_request("tok-1", client_ip=None)

    assert exc.value.status_code == 401


def test_check_and_record_request_rate_limited_429(monkeypatch):
    svc = DemoLimiterService(_mock_db())
    now = datetime.now(timezone.utc)
    demo = _mk_demo(last_request_at=now)  # elapsed ~= 0 < min_interval
    monkeypatch.setattr(svc, "get_session", lambda token: demo)

    with pytest.raises(HTTPException) as exc:
        svc.check_and_record_request("tok-1", client_ip=None)

    assert exc.value.status_code == 429
    assert "Retry-After" in (exc.value.headers or {})


def test_check_and_record_request_quota_exhausted_429(monkeypatch):
    svc = DemoLimiterService(_mock_db())
    demo = _mk_demo(requests_used=5, requests_limit=5, last_request_at=None)
    monkeypatch.setattr(svc, "get_session", lambda token: demo)

    with pytest.raises(HTTPException) as exc:
        svc.check_and_record_request("tok-1", client_ip=None)

    assert exc.value.status_code == 429


def test_get_status_ok(monkeypatch):
    svc = DemoLimiterService(_mock_db())
    demo = _mk_demo(requests_used=3, requests_limit=20)
    monkeypatch.setattr(svc, "get_session", lambda token: demo)

    status = svc.get_status("tok-1")

    assert status["requests_used"] == 3
    assert status["requests_remaining"] == 17
    assert status["is_active"] is True


def test_get_status_not_found_404(monkeypatch):
    svc = DemoLimiterService(_mock_db())
    monkeypatch.setattr(svc, "get_session", lambda token: None)

    with pytest.raises(HTTPException) as exc:
        svc.get_status("nope")

    assert exc.value.status_code == 404


# --------------------------------------------------------------------------- #
# require_demo_token dependency
# --------------------------------------------------------------------------- #


def _probe_app(db) -> FastAPI:
    app = FastAPI()
    app.include_router(demo_router)

    @app.post("/probe")
    def probe(demo=Depends(require_demo_token)):
        return {"demo": demo is not None, "token": demo.token if demo else None}

    app.dependency_overrides[get_db] = _override_get_db(db)
    return app


def test_require_demo_token_disabled_is_noop(monkeypatch):
    monkeypatch.setattr(settings, "demo_limiter_enabled", False)
    client = TestClient(_probe_app(_mock_db()))

    r = client.post("/probe")

    assert r.status_code == 200
    assert r.json() == {"demo": False, "token": None}


def test_require_demo_token_enabled_no_header_403(monkeypatch):
    monkeypatch.setattr(settings, "demo_limiter_enabled", True)
    client = TestClient(_probe_app(_mock_db()))

    r = client.post("/probe")

    assert r.status_code == 403


def test_require_demo_token_valid_consumes_quota(monkeypatch):
    monkeypatch.setattr(settings, "demo_limiter_enabled", True)
    db = _mock_db()
    demo = _mk_demo(token="tok-1", requests_used=1)
    monkeypatch.setattr(
        DemoLimiterService,
        "check_and_record_request",
        lambda self, token, client_ip: demo,
    )

    r = TestClient(_probe_app(db)).post("/probe", headers={"X-Demo-Token": "tok-1"})

    assert r.status_code == 200
    assert r.json() == {"demo": True, "token": "tok-1"}
    db.commit.assert_called_once()  # quota committed before the pipeline runs


def test_require_demo_token_expired_propagates_401(monkeypatch):
    monkeypatch.setattr(settings, "demo_limiter_enabled", True)
    db = _mock_db()

    def _raise(self, token, client_ip):
        raise HTTPException(status_code=401, detail="expired")

    monkeypatch.setattr(DemoLimiterService, "check_and_record_request", _raise)

    r = TestClient(_probe_app(db)).post("/probe", headers={"X-Demo-Token": "tok-1"})

    assert r.status_code == 401


# --------------------------------------------------------------------------- #
# /api/demo endpoints
# --------------------------------------------------------------------------- #


def _demo_app(db) -> FastAPI:
    app = FastAPI()
    app.include_router(demo_router)
    app.dependency_overrides[get_db] = _override_get_db(db)
    return app


def test_start_endpoint_disabled_403(monkeypatch):
    monkeypatch.setattr(settings, "demo_limiter_enabled", False)
    client = TestClient(_demo_app(_mock_db()))

    r = client.post("/api/demo/start", json={})

    assert r.status_code == 403


def test_start_endpoint_ok(monkeypatch):
    monkeypatch.setattr(settings, "demo_limiter_enabled", True)
    db = _mock_db()
    demo = _mk_demo(token="abc", requests_used=0, requests_limit=20)
    monkeypatch.setattr(
        DemoLimiterService,
        "create_session",
        lambda self, client_ip, session_id=None: demo,
    )

    r = TestClient(_demo_app(db)).post("/api/demo/start", json={"session_id": "s1"})

    assert r.status_code == 200
    body = r.json()
    assert body["token"] == "abc"
    assert body["requests_limit"] == 20
    assert body["requests_remaining"] == 20
    assert body["rate_limit_per_minute"] == settings.demo_rate_limit_per_minute
    db.commit.assert_called_once()


def test_status_endpoint_no_header_401(monkeypatch):
    monkeypatch.setattr(settings, "demo_limiter_enabled", True)
    client = TestClient(_demo_app(_mock_db()))

    r = client.get("/api/demo/status")

    assert r.status_code == 401


def test_status_endpoint_ok(monkeypatch):
    monkeypatch.setattr(settings, "demo_limiter_enabled", True)
    demo = _mk_demo(token="abc", requests_used=4, requests_limit=20)
    monkeypatch.setattr(
        DemoLimiterService,
        "get_status",
        lambda self, token: {
            "token": demo.token,
            "session_id": None,
            "requests_used": 4,
            "requests_limit": 20,
            "requests_remaining": 16,
            "expires_at": demo.expires_at.isoformat(),
            "is_active": True,
        },
    )

    r = TestClient(_demo_app(_mock_db())).get(
        "/api/demo/status", headers={"X-Demo-Token": "abc"}
    )

    assert r.status_code == 200
    assert r.json()["requests_remaining"] == 16