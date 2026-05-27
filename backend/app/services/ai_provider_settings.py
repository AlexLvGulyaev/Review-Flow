import os
from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import AIProviderSetting
from app.schemas.ai_provider import (
    AIProviderEffectiveOut,
    AIProviderSettingOut,
    AIProviderTestOut,
    EffectiveProviderInfo,
)
from app.services.ai_provider_gigachat import GIGACHAT_RELATED_ENV_KEYS
from app.services.ai_providers.gigachat_auth import (
    gigachat_credentials_configured,
    missing_gigachat_env_keys,
)
from app.services.ai_providers.base import EffectiveProviderConfig, ProviderNotReadyError
from app.services.ai_providers.factory import AIProviderFactory, get_implementation_status
from app.services.operational_log import log_event

DEFAULT_BASE_URLS: dict[str, str] = {
    "openai": "https://api.openai.com/v1",
    "proxyapi": "https://api.proxyapi.ru/openai/v1",
}


class AIProviderSettingsService:
    def __init__(self, db: Session) -> None:
        self.db = db

    def list_settings(self) -> list[AIProviderSettingOut]:
        rows = self.db.scalars(
            select(AIProviderSetting).order_by(AIProviderSetting.provider_key)
        ).all()
        return [self._to_out(r) for r in rows]

    def get_by_key(self, provider_key: str) -> AIProviderSetting:
        row = self.db.scalars(
            select(AIProviderSetting).where(AIProviderSetting.provider_key == provider_key)
        ).first()
        if not row:
            raise HTTPException(404, f"Provider '{provider_key}' not found")
        return row

    def get_active(self) -> AIProviderSetting | None:
        return self.db.scalars(
            select(AIProviderSetting).where(AIProviderSetting.is_active.is_(True))
        ).first()

    def get_fallback(self) -> AIProviderSetting | None:
        return self.db.scalars(
            select(AIProviderSetting).where(AIProviderSetting.is_fallback.is_(True))
        ).first()

    def get_effective_overview(self) -> AIProviderEffectiveOut:
        active_row = self.get_active()
        fallback_row = self.get_fallback()
        warnings: list[str] = []
        missing_all: list[str] = []

        active_info = self._effective_info(active_row) if active_row else None
        fallback_info = self._effective_info(fallback_row) if fallback_row else None

        if active_info and active_info.readiness != "ready":
            warnings.append(
                f"Active provider '{active_info.provider_key}' is not ready: {active_info.readiness}"
            )
            missing_all.extend(active_info.missing_env_keys)

        effective_model = active_info.model_name if active_info else None
        readiness = active_info.readiness if active_info else "no_active_provider"

        if active_info and active_info.readiness != "ready" and fallback_info:
            if fallback_info.readiness == "ready":
                warnings.append(
                    f"Pipeline will use fallback '{fallback_info.provider_key}' when active fails"
                )
                effective_model = fallback_info.model_name
                readiness = "fallback_ready"

        return AIProviderEffectiveOut(
            active=active_info,
            fallback=fallback_info,
            effective_model=effective_model,
            readiness=readiness,
            missing_env_keys=list(dict.fromkeys(missing_all)),
            warnings=warnings,
        )

    def patch_setting(self, provider_key: str, data: dict) -> AIProviderSettingOut:
        row = self.get_by_key(provider_key)
        for key, val in data.items():
            if val is not None:
                setattr(row, key, val)
        row.updated_at = datetime.now(timezone.utc)
        log_event(
            self.db,
            event_type="ai_provider_settings_updated",
            status="ok",
            metadata={"provider_key": provider_key},
        )
        self.db.commit()
        self.db.refresh(row)
        return self._to_out(row)

    def activate(self, provider_key: str) -> AIProviderSettingOut:
        row = self.get_by_key(provider_key)
        if not row.is_enabled:
            raise HTTPException(
                400,
                f"Provider '{provider_key}' is disabled. Enable it before activation.",
            )
        impl = get_implementation_status(provider_key)
        if impl == "not_implemented":
            raise HTTPException(400, f"Provider '{provider_key}' is not implemented")
        for other in self.db.scalars(select(AIProviderSetting)).all():
            other.is_active = other.provider_key == provider_key
            other.updated_at = datetime.now(timezone.utc)
        log_event(
            self.db,
            event_type="ai_provider_activated",
            status="ok",
            metadata={"provider_key": provider_key},
        )
        self.db.commit()
        self.db.refresh(row)
        return self._to_out(row)

    def set_fallback(self, provider_key: str) -> AIProviderSettingOut:
        row = self.get_by_key(provider_key)
        if get_implementation_status(provider_key) == "not_implemented":
            raise HTTPException(400, f"Provider '{provider_key}' is not implemented")
        if not row.is_enabled:
            raise HTTPException(
                400,
                f"Provider '{provider_key}' is disabled. Enable it before setting as fallback.",
            )
        for other in self.db.scalars(select(AIProviderSetting)).all():
            other.is_fallback = other.provider_key == provider_key
            other.updated_at = datetime.now(timezone.utc)
        log_event(
            self.db,
            event_type="ai_provider_fallback_changed",
            status="ok",
            metadata={"provider_key": provider_key},
        )
        self.db.commit()
        self.db.refresh(row)
        return self._to_out(row)

    def test_provider(self, provider_key: str) -> AIProviderTestOut:
        row = self.get_by_key(provider_key)
        missing = self._missing_env_keys(row)
        impl = get_implementation_status(provider_key)

        if impl == "not_implemented":
            log_event(
                self.db,
                event_type="ai_provider_tested",
                status="error",
                error_message="not_implemented",
                metadata={"provider_key": provider_key},
            )
            self.db.commit()
            return AIProviderTestOut(
                provider_key=provider_key,
                ok=False,
                readiness="not_ready",
                message="Provider configured but not implemented",
                missing_env_keys=missing,
                implementation_status=impl,
            )

        if provider_key != "mock" and missing:
            log_event(
                self.db,
                event_type="ai_provider_tested",
                status="error",
                error_message="missing_env",
                metadata={"provider_key": provider_key, "missing": missing},
            )
            self.db.commit()
            return AIProviderTestOut(
                provider_key=provider_key,
                ok=False,
                readiness="missing_env",
                message=f"Missing environment variables: {', '.join(missing)}",
                missing_env_keys=missing,
                implementation_status=impl,
            )

        try:
            config = self.build_effective_config(row)
            provider = AIProviderFactory.create(config)
            ok, msg = provider.test_connection()
            log_event(
                self.db,
                event_type="ai_provider_tested",
                status="ok" if ok else "error",
                error_message=None if ok else msg,
                metadata={"provider_key": provider_key},
            )
            self.db.commit()
            return AIProviderTestOut(
                provider_key=provider_key,
                ok=ok,
                readiness="ready" if ok else "error",
                message=msg,
                missing_env_keys=missing,
                implementation_status=impl,
            )
        except ProviderNotReadyError as exc:
            log_event(
                self.db,
                event_type="ai_provider_tested",
                status="error",
                error_message=str(exc),
                metadata={"provider_key": provider_key},
            )
            self.db.commit()
            return AIProviderTestOut(
                provider_key=provider_key,
                ok=False,
                readiness="not_ready",
                message=str(exc),
                missing_env_keys=missing,
                implementation_status=impl,
            )
        except Exception as exc:
            log_event(
                self.db,
                event_type="ai_provider_tested",
                status="error",
                error_message=str(exc),
                metadata={"provider_key": provider_key},
            )
            self.db.commit()
            return AIProviderTestOut(
                provider_key=provider_key,
                ok=False,
                readiness="error",
                message=str(exc),
                missing_env_keys=missing,
                implementation_status=impl,
            )

    def build_effective_config(self, row: AIProviderSetting) -> EffectiveProviderConfig:
        api_key = self._read_env(row.api_key_env_key) if row.api_key_env_key else None
        if row.provider_key == "gigachat" and gigachat_credentials_configured():
            api_key = self._read_env("GIGACHAT_AUTH_KEY") or "configured"
        base_url = self._read_env(row.base_url_env_key) if row.base_url_env_key else None
        if not base_url and row.provider_key in DEFAULT_BASE_URLS:
            base_url = DEFAULT_BASE_URLS[row.provider_key]
        model_name = row.model_name
        if row.provider_key == "gigachat":
            model_name = row.model_name or self._read_env("GIGACHAT_MODEL") or "GigaChat-Max"
        max_tokens = row.max_tokens
        if row.provider_key == "gigachat" and not max_tokens:
            env_mt = self._read_env("GIGACHAT_MAX_TOKENS")
            max_tokens = int(env_mt) if env_mt and env_mt.isdigit() else 500
        return EffectiveProviderConfig(
            provider_key=row.provider_key,
            model_name=model_name,
            temperature=float(row.temperature) if row.temperature is not None else 0.1,
            max_tokens=max_tokens or 2048,
            api_key=api_key,
            base_url=base_url,
            implementation_status=get_implementation_status(row.provider_key),
        )

    def is_row_ready(self, row: AIProviderSetting) -> tuple[bool, list[str]]:
        impl = get_implementation_status(row.provider_key)
        if impl == "not_implemented":
            return False, []
        if row.provider_key == "mock":
            return True, []
        missing = self._missing_env_keys(row)
        return len(missing) == 0, missing

    def _effective_info(self, row: AIProviderSetting | None) -> EffectiveProviderInfo | None:
        if not row:
            return None
        ready, missing = self.is_row_ready(row)
        impl = get_implementation_status(row.provider_key)
        reason: str | None = None
        if impl == "not_implemented":
            readiness = "not_ready"
            missing = []
            reason = "Provider is not implemented"
        elif not row.is_enabled:
            readiness = "disabled"
        elif ready:
            readiness = "ready"
        elif missing:
            readiness = "missing_env"
        else:
            readiness = "not_ready"
        return EffectiveProviderInfo(
            provider_key=row.provider_key,
            display_name=row.display_name,
            model_name=row.model_name,
            is_enabled=row.is_enabled,
            readiness=readiness,
            missing_env_keys=missing,
            readiness_reason=reason,
        )

    def _to_out(self, row: AIProviderSetting) -> AIProviderSettingOut:
        impl = get_implementation_status(row.provider_key)
        creds_applicable = impl != "not_implemented"
        missing = self._missing_env_keys(row) if creds_applicable else []
        reason: str | None = None
        if impl == "not_implemented":
            reason = "Provider is not implemented"

        if row.provider_key == "gigachat":
            api_ok = gigachat_credentials_configured()
            base_ok = True
            related = GIGACHAT_RELATED_ENV_KEYS
            if not api_ok and creds_applicable:
                reason = "Set GIGACHAT_AUTH_KEY or GIGACHAT_CLIENT_ID + GIGACHAT_CLIENT_SECRET"
        elif row.provider_key == "mock":
            api_ok = True
            base_ok = True
            related = []
        else:
            api_ok = not row.api_key_env_key or row.api_key_env_key not in missing
            base_ok = (
                not row.base_url_env_key
                or row.base_url_env_key not in missing
                or row.provider_key in DEFAULT_BASE_URLS
            )
            related = []

        return AIProviderSettingOut(
            id=row.id,
            provider_key=row.provider_key,
            display_name=row.display_name,
            model_name=row.model_name,
            is_enabled=row.is_enabled,
            is_active=row.is_active,
            is_fallback=row.is_fallback,
            temperature=float(row.temperature) if row.temperature is not None else None,
            max_tokens=row.max_tokens,
            api_key_configured=api_ok,
            base_url_configured=base_ok,
            implementation_status=impl,
            api_key_env_key=row.api_key_env_key,
            base_url_env_key=row.base_url_env_key,
            readiness_reason=reason,
            credentials_check_applicable=creds_applicable,
            related_env_keys=related,
            created_at=row.created_at,
            updated_at=row.updated_at,
        )

    def _missing_env_keys(self, row: AIProviderSetting) -> list[str]:
        if row.provider_key == "mock":
            return []
        if row.provider_key == "gigachat":
            return missing_gigachat_env_keys()
        if get_implementation_status(row.provider_key) == "not_implemented":
            return []
        missing: list[str] = []
        if row.api_key_env_key and not self._read_env(row.api_key_env_key):
            missing.append(row.api_key_env_key)
        if (
            row.base_url_env_key
            and row.provider_key not in DEFAULT_BASE_URLS
            and not self._read_env(row.base_url_env_key)
        ):
            missing.append(row.base_url_env_key)
        return missing

    @staticmethod
    def _read_env(key: str | None) -> str | None:
        if not key:
            return None
        val = os.getenv(key)
        return val if val else None
