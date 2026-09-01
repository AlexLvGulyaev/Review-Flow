from fastapi import APIRouter, Depends, Request
from sqlalchemy.orm import Session

from app.api.audit_helpers import audit
from app.core.roles import Role, require_admin, require_admin_read
from app.db.session import get_db
from app.schemas.ai_provider import (
    AIProviderEffectiveOut,
    AIProviderSettingOut,
    AIProviderSettingPatch,
    AIProviderTestOut,
)
from app.services.ai_provider_settings import AIProviderSettingsService

router = APIRouter(
    prefix="/api/settings/ai-providers",
    tags=["ai-provider-settings"],
    dependencies=[Depends(require_admin_read)],
)


@router.get("", response_model=list[AIProviderSettingOut])
def list_ai_providers(db: Session = Depends(get_db)) -> list[AIProviderSettingOut]:
    return AIProviderSettingsService(db).list_settings()


@router.get("/effective", response_model=AIProviderEffectiveOut)
def get_effective_settings(db: Session = Depends(get_db)) -> AIProviderEffectiveOut:
    return AIProviderSettingsService(db).get_effective_overview()


@router.patch("/{provider_key}", response_model=AIProviderSettingOut, dependencies=[Depends(require_admin)])
def patch_ai_provider(
    provider_key: str,
    body: AIProviderSettingPatch,
    request: Request,
    role: Role = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AIProviderSettingOut:
    audit(request, role, "ai_provider_settings_updated", resource_type="ai_provider", resource_id=provider_key, db=db, details={"fields": list(body.model_dump(exclude_unset=True).keys())})
    return AIProviderSettingsService(db).patch_setting(
        provider_key, body.model_dump(exclude_unset=True)
    )


@router.post("/{provider_key}/activate", response_model=AIProviderSettingOut, dependencies=[Depends(require_admin)])
def activate_ai_provider(
    provider_key: str,
    request: Request,
    role: Role = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AIProviderSettingOut:
    audit(request, role, "ai_provider_activated", resource_type="ai_provider", resource_id=provider_key, db=db)
    return AIProviderSettingsService(db).activate(provider_key)


@router.post("/{provider_key}/set-fallback", response_model=AIProviderSettingOut, dependencies=[Depends(require_admin)])
def set_fallback_ai_provider(
    provider_key: str,
    request: Request,
    role: Role = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AIProviderSettingOut:
    audit(request, role, "ai_provider_fallback_changed", resource_type="ai_provider", resource_id=provider_key, db=db)
    return AIProviderSettingsService(db).set_fallback(provider_key)


@router.post("/{provider_key}/test", response_model=AIProviderTestOut, dependencies=[Depends(require_admin)])
def test_ai_provider(
    provider_key: str,
    request: Request,
    role: Role = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AIProviderTestOut:
    audit(request, role, "ai_provider_tested", resource_type="ai_provider", resource_id=provider_key, db=db)
    return AIProviderSettingsService(db).test_provider(provider_key)
