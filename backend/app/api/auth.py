"""Ops/admin console authentication endpoints."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.roles import Role, ops_identity

router = APIRouter(prefix="/api/auth", tags=["auth"])


class WhoAmIResponse(BaseModel):
    """Authoritative role for the presented ops token / X-Role header."""

    role: str


@router.get("/whoami", response_model=WhoAmIResponse)
def whoami(role: Role = Depends(ops_identity)) -> WhoAmIResponse:
    """Return the role derived from the Bearer token (or X-Role fallback).

    The frontend uses this to validate an entered token and to obtain the
    authoritative role (administrator / operator / demo) for routing and the
    read-only demo UI.
    """
    return WhoAmIResponse(role=role.value)