from enum import Enum

from fastapi import Depends, Header, HTTPException, Security, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.services.operational_log import log_event

ROLE_HEADER = "x-role"

# Bearer scheme for ops/admin console auth. auto_error=False so the
# ops_identity dependency can produce a proper 401 itself.
ops_bearer = HTTPBearer(auto_error=False)


class Role(str, Enum):
    CLIENT = "client"
    OPERATOR = "operator"
    ADMINISTRATOR = "administrator"
    DEMO = "demo"


def get_role(x_role: str | None = Header(None, alias="X-Role")) -> Role:
    """Derive a role from the legacy X-Role header.

    Used for public/client endpoints and as a fallback when ops token auth is
    not configured (dev/tests). Never trust this header when ops auth is
    enabled — use ops_identity instead.
    """
    if not x_role:
        return Role.CLIENT
    try:
        return Role(x_role.lower())
    except ValueError:
        return Role.CLIENT


def _role_from_token(token: str) -> Role:
    """Map a configured ops Bearer token to a Role, or raise 403."""
    if settings.ops_admin_token and token == settings.ops_admin_token:
        return Role.ADMINISTRATOR
    if settings.ops_operator_token and token == settings.ops_operator_token:
        return Role.OPERATOR
    if settings.ops_demo_token and token == settings.ops_demo_token:
        return Role.DEMO
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid ops token",
    )


def ops_identity(
    credentials: HTTPAuthorizationCredentials | None = Security(ops_bearer),
    x_role: str | None = Header(None, alias="X-Role"),
) -> Role:
    """Authenticate an ops/admin console user and return their role.

    When ops auth is enabled (ops_admin_token configured), the role is derived
    from the Bearer token and the X-Role header is ignored. When ops auth is
    disabled (dev/tests), it falls back to the legacy X-Role header so existing
    behaviour and tests keep working.
    """
    if not settings.ops_auth_enabled:
        return get_role(x_role)

    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Ops token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _role_from_token(credentials.credentials)


def require_ops_roles(*allowed: Role):
    """Guard ops endpoints by role, authenticated via ops_identity (Bearer).

    Demo role is intentionally excluded from mutation guards (require_admin /
    require_operator) so demo gets 403 on mutations; read guards
    (require_admin_read / require_ops_read) include DEMO explicitly.
    Access denials are recorded in the operational log for audit.
    """
    allowed_set = set(allowed)

    def checker(
        role: Role = Depends(ops_identity),
        db: Session = Depends(get_db),
    ) -> Role:
        if role not in allowed_set:
            log_event(
                db,
                event_type="role_access_denied",
                status="error",
                error_message=f"role={role.value}, required={[r.value for r in allowed]}",
                metadata={"role": role.value},
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied for role '{role.value}'",
            )
        return role

    return checker


def require_roles(*allowed: Role):
    """Legacy header-based role guard (X-Role). Kept for public/client use."""
    allowed_set = set(allowed)

    def checker(
        role: Role = Depends(get_role),
        db: Session = Depends(get_db),
    ) -> Role:
        if role not in allowed_set:
            log_event(
                db,
                event_type="role_access_denied",
                status="error",
                error_message=f"role={role.value}, required={[r.value for r in allowed]}",
                metadata={"role": role.value},
            )
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied for role '{role.value}'",
            )
        return role

    return checker


# Ops console guards (Bearer-token authenticated via ops_identity).
require_admin = require_ops_roles(Role.ADMINISTRATOR)
require_operator = require_ops_roles(Role.OPERATOR, Role.ADMINISTRATOR)
require_admin_read = require_ops_roles(Role.ADMINISTRATOR, Role.DEMO)
require_ops_read = require_ops_roles(Role.OPERATOR, Role.ADMINISTRATOR, Role.DEMO)

# Public/client guard (legacy X-Role header, retained for compatibility).
require_client = require_roles(Role.CLIENT, Role.OPERATOR, Role.ADMINISTRATOR)