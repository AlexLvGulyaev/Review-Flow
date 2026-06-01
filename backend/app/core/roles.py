from enum import Enum

from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.services.operational_log import log_event

ROLE_HEADER = "x-role"


class Role(str, Enum):
    CLIENT = "client"
    OPERATOR = "operator"
    ADMINISTRATOR = "administrator"


def get_role(x_role: str | None = Header(None, alias="X-Role")) -> Role:
    if not x_role:
        return Role.CLIENT
    try:
        return Role(x_role.lower())
    except ValueError:
        return Role.CLIENT


def require_roles(*allowed: Role):
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
                status_code=403,
                detail=f"Access denied for role '{role.value}'",
            )
        return role

    return checker


require_client = require_roles(Role.CLIENT, Role.OPERATOR, Role.ADMINISTRATOR)
require_operator = require_roles(Role.OPERATOR, Role.ADMINISTRATOR)
require_admin = require_roles(Role.ADMINISTRATOR)
