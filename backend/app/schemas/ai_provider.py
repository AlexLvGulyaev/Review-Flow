from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class AIProviderSettingOut(BaseModel):
    id: UUID
    provider_key: str
    display_name: str
    model_name: str
    is_enabled: bool
    is_active: bool
    is_fallback: bool
    temperature: float | None
    max_tokens: int | None
    api_key_configured: bool
    base_url_configured: bool
    implementation_status: str
    api_key_env_key: str | None = None
    base_url_env_key: str | None = None
    readiness_reason: str | None = None
    credentials_check_applicable: bool = True
    related_env_keys: list[str] = []
    effective_base_url: str | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AIProviderSettingPatch(BaseModel):
    display_name: str | None = Field(None, min_length=1)
    model_name: str | None = Field(None, min_length=1)
    is_enabled: bool | None = None
    temperature: float | None = Field(None, ge=0, le=2)
    max_tokens: int | None = Field(None, ge=1, le=128000)


class EffectiveProviderInfo(BaseModel):
    provider_key: str
    display_name: str
    model_name: str
    is_enabled: bool
    readiness: str
    missing_env_keys: list[str] = []
    readiness_reason: str | None = None


class AIProviderEffectiveOut(BaseModel):
    active: EffectiveProviderInfo | None
    fallback: EffectiveProviderInfo | None
    effective_model: str | None
    readiness: str
    missing_env_keys: list[str] = []
    readiness_reason: str | None = None
    warnings: list[str] = []


class AIProviderTestOut(BaseModel):
    provider_key: str
    ok: bool
    readiness: str
    message: str
    missing_env_keys: list[str] = []
    implementation_status: str
    readiness_reason: str | None = None
