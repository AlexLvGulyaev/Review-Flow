"""Tests for the ops/admin console read-only demo RBAC.

Covers ``ops_identity`` (Bearer-token → role, with X-Role fallback when ops
auth is disabled), the ``/api/auth/whoami`` endpoint, and the role guards
(``require_admin`` / ``require_operator`` / ``require_admin_read`` /
``require_ops_read``) including the demo role being read-only on mutations.

All tests use ``TestClient`` with ``get_db`` overridden to a lightweight fake
session (``log_event`` adds an ``OperationalLog`` to it on denials; ``commit``
is a no-op). No Postgres is required.
"""

from types import SimpleNamespace

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient

from app.api.auth import router as auth_router
from app.core.config import settings
from app.core.roles import (
    ops_identity,
    require_admin,
    require_admin_read,
    require_operator,
    require_ops_read,
)
from app.db.session import get_db


def _fake_db() -> SimpleNamespace:
    return SimpleNamespace(add=lambda *a, **k: None, commit=lambda: None)


def _override_get_db(db):
    def _gen():
        yield db

    return _gen


def _app() -> FastAPI:
    app = FastAPI()
    app.include_router(auth_router)

    @app.get("/me")
    def me(role=Depends(ops_identity)):
        return {"role": role.value}

    @app.get("/admin-read", dependencies=[Depends(require_admin_read)])
    def admin_read():
        return {"ok": True}

    @app.post("/admin-write", dependencies=[Depends(require_admin)])
    def admin_write():
        return {"ok": True}

    @app.get("/ops-read", dependencies=[Depends(require_ops_read)])
    def ops_read():
        return {"ok": True}

    @app.post("/ops-write", dependencies=[Depends(require_operator)])
    def ops_write():
        return {"ok": True}

    app.dependency_overrides[get_db] = _override_get_db(_fake_db())
    return app


def _enable_ops(monkeypatch):
    monkeypatch.setattr(settings, "ops_admin_token", "ADMINTOKEN")
    monkeypatch.setattr(settings, "ops_operator_token", "OPTOKEN")
    monkeypatch.setattr(settings, "ops_demo_token", "DEMOTOKEN")


def _bearer(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# --------------------------------------------------------------------------- #
# ops auth disabled: X-Role fallback
# --------------------------------------------------------------------------- #


def test_whoami_fallback_x_role():
    client = TestClient(_app())
    assert client.get("/api/auth/whoami", headers={"X-Role": "administrator"}).json() == {
        "role": "administrator"
    }
    assert client.get("/api/auth/whoami").json() == {"role": "client"}
    assert client.get("/api/auth/whoami", headers={"X-Role": "operator"}).json() == {
        "role": "operator"
    }
    assert client.get("/api/auth/whoami", headers={"X-Role": "demo"}).json() == {
        "role": "demo"
    }


def test_fallback_unknown_role_becomes_client():
    client = TestClient(_app())
    assert client.get("/api/auth/whoami", headers={"X-Role": "garbage"}).json() == {
        "role": "client"
    }


# --------------------------------------------------------------------------- #
# ops auth enabled: Bearer tokens
# --------------------------------------------------------------------------- #


def test_whoami_no_token_401(monkeypatch):
    _enable_ops(monkeypatch)
    r = TestClient(_app()).get("/api/auth/whoami")
    assert r.status_code == 401
    assert r.headers.get("www-authenticate") == "Bearer"


def test_whoami_admin_token(monkeypatch):
    _enable_ops(monkeypatch)
    r = TestClient(_app()).get("/api/auth/whoami", headers=_bearer("ADMINTOKEN"))
    assert r.status_code == 200
    assert r.json() == {"role": "administrator"}


def test_whoami_operator_token(monkeypatch):
    _enable_ops(monkeypatch)
    r = TestClient(_app()).get("/api/auth/whoami", headers=_bearer("OPTOKEN"))
    assert r.json() == {"role": "operator"}


def test_whoami_demo_token(monkeypatch):
    _enable_ops(monkeypatch)
    r = TestClient(_app()).get("/api/auth/whoami", headers=_bearer("DEMOTOKEN"))
    assert r.json() == {"role": "demo"}


def test_whoami_invalid_token_403(monkeypatch):
    _enable_ops(monkeypatch)
    r = TestClient(_app()).get("/api/auth/whoami", headers=_bearer("WRONG"))
    assert r.status_code == 403


def test_x_role_ignored_when_ops_auth_enabled(monkeypatch):
    _enable_ops(monkeypatch)
    headers = {**_bearer("DEMOTOKEN"), "X-Role": "administrator"}
    r = TestClient(_app()).get("/api/auth/whoami", headers=headers)
    assert r.json() == {"role": "demo"}


def test_me_endpoint_role_mapping(monkeypatch):
    _enable_ops(monkeypatch)
    client = TestClient(_app())
    assert client.get("/me", headers=_bearer("ADMINTOKEN")).json() == {"role": "administrator"}
    assert client.get("/me", headers=_bearer("DEMOTOKEN")).json() == {"role": "demo"}


# --------------------------------------------------------------------------- #
# RBAC matrix: demo is read-only
# --------------------------------------------------------------------------- #


def test_admin_read_demo_and_admin_allowed_operator_blocked(monkeypatch):
    _enable_ops(monkeypatch)
    client = TestClient(_app())
    assert client.get("/admin-read", headers=_bearer("DEMOTOKEN")).status_code == 200
    assert client.get("/admin-read", headers=_bearer("ADMINTOKEN")).status_code == 200
    assert client.get("/admin-read", headers=_bearer("OPTOKEN")).status_code == 403


def test_admin_write_demo_and_operator_blocked_admin_allowed(monkeypatch):
    _enable_ops(monkeypatch)
    client = TestClient(_app())
    assert client.post("/admin-write", headers=_bearer("DEMOTOKEN")).status_code == 403
    assert client.post("/admin-write", headers=_bearer("OPTOKEN")).status_code == 403
    assert client.post("/admin-write", headers=_bearer("ADMINTOKEN")).status_code == 200


def test_ops_read_all_ops_roles_allowed(monkeypatch):
    _enable_ops(monkeypatch)
    client = TestClient(_app())
    assert client.get("/ops-read", headers=_bearer("DEMOTOKEN")).status_code == 200
    assert client.get("/ops-read", headers=_bearer("OPTOKEN")).status_code == 200
    assert client.get("/ops-read", headers=_bearer("ADMINTOKEN")).status_code == 200


def test_ops_write_demo_blocked_operator_and_admin_allowed(monkeypatch):
    _enable_ops(monkeypatch)
    client = TestClient(_app())
    assert client.post("/ops-write", headers=_bearer("DEMOTOKEN")).status_code == 403
    assert client.post("/ops-write", headers=_bearer("OPTOKEN")).status_code == 200
    assert client.post("/ops-write", headers=_bearer("ADMINTOKEN")).status_code == 200


def test_write_without_token_is_401(monkeypatch):
    _enable_ops(monkeypatch)
    client = TestClient(_app())
    assert client.post("/admin-write").status_code == 401
    assert client.post("/ops-write").status_code == 401