from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.roles import require_admin
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
    dependencies=[Depends(require_admin)],
)


@router.get("", response_model=list[AIProviderSettingOut])
def list_ai_providers(db: Session = Depends(get_db)) -> list[AIProviderSettingOut]:
    return AIProviderSettingsService(db).list_settings()


@router.get("/effective", response_model=AIProviderEffectiveOut)
def get_effective_settings(db: Session = Depends(get_db)) -> AIProviderEffectiveOut:
    return AIProviderSettingsService(db).get_effective_overview()


@router.patch("/{provider_key}", response_model=AIProviderSettingOut)
def patch_ai_provider(
    provider_key: str,
    body: AIProviderSettingPatch,
    db: Session = Depends(get_db),
) -> AIProviderSettingOut:
    return AIProviderSettingsService(db).patch_setting(
        provider_key, body.model_dump(exclude_unset=True)
    )


@router.post("/{provider_key}/activate", response_model=AIProviderSettingOut)
def activate_ai_provider(
    provider_key: str,
    db: Session = Depends(get_db),
) -> AIProviderSettingOut:
    return AIProviderSettingsService(db).activate(provider_key)


@router.post("/{provider_key}/set-fallback", response_model=AIProviderSettingOut)
def set_fallback_ai_provider(
    provider_key: str,
    db: Session = Depends(get_db),
) -> AIProviderSettingOut:
    return AIProviderSettingsService(db).set_fallback(provider_key)


@router.post("/{provider_key}/test", response_model=AIProviderTestOut)
def test_ai_provider(
    provider_key: str,
    db: Session = Depends(get_db),
) -> AIProviderTestOut:
    return AIProviderSettingsService(db).test_provider(provider_key)
