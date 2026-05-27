from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.entities import AIProviderSetting
from app.services.ai_providers.base import (
    AIProvider,
    EffectiveProviderConfig,
    ProviderNotImplementedError,
    ProviderNotReadyError,
)
from app.services.ai_providers.factory import AIProviderFactory
from app.services.ai_provider_settings import AIProviderSettingsService
from app.services.operational_log import log_event


@dataclass
class ResolvedAIProvider:
    provider: AIProvider
    config: EffectiveProviderConfig
    provider_key: str
    used_fallback: bool
    requested_key: str | None


class AIProviderRuntime:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.settings = AIProviderSettingsService(db)

    def resolve(self, *, review_id=None) -> ResolvedAIProvider:
        active = self.settings.get_active()
        fallback = self.settings.get_fallback()
        candidates: list[tuple[AIProviderSetting, bool]] = []
        if active:
            candidates.append((active, False))
        if fallback and (not active or fallback.provider_key != active.provider_key):
            candidates.append((fallback, True))

        if not candidates:
            mock_row = self.db.scalars(
                select(AIProviderSetting).where(AIProviderSetting.provider_key == "mock")
            ).first()
            if mock_row:
                candidates.append((mock_row, True))

        last_error: str | None = None
        requested_key = active.provider_key if active else None

        for row, is_fallback_attempt in candidates:
            ready, missing = self.settings.is_row_ready(row)
            if not row.is_enabled:
                last_error = f"{row.provider_key} disabled"
                self._log_error(row.provider_key, last_error, review_id, is_fallback_attempt)
                continue
            if not ready:
                last_error = f"{row.provider_key} missing env: {missing}"
                self._log_error(row.provider_key, last_error, review_id, is_fallback_attempt)
                continue
            try:
                config = self.settings.build_effective_config(row)
                provider = AIProviderFactory.create(config)
                if is_fallback_attempt and active and row.provider_key != active.provider_key:
                    log_event(
                        self.db,
                        event_type="ai_provider_fallback_used",
                        entity_type="review",
                        entity_id=review_id,
                        status="ok",
                        metadata={
                            "active": active.provider_key,
                            "fallback": row.provider_key,
                        },
                    )
                return ResolvedAIProvider(
                    provider=provider,
                    config=config,
                    provider_key=row.provider_key,
                    used_fallback=is_fallback_attempt and active is not None,
                    requested_key=requested_key,
                )
            except (ProviderNotReadyError, ProviderNotImplementedError) as exc:
                last_error = str(exc)
                self._log_error(row.provider_key, last_error, review_id, is_fallback_attempt)
            except Exception as exc:
                last_error = str(exc)
                self._log_error(row.provider_key, last_error, review_id, is_fallback_attempt)

        raise RuntimeError(
            last_error or "No AI provider available. Configure mock or enable a provider with env keys."
        )

    def _log_error(
        self,
        provider_key: str,
        message: str,
        review_id,
        is_fallback_attempt: bool,
    ) -> None:
        log_event(
            self.db,
            event_type="ai_provider_error",
            entity_type="review",
            entity_id=review_id,
            status="error",
            error_message=message,
            metadata={
                "provider_key": provider_key,
                "fallback_attempt": is_fallback_attempt,
            },
        )
