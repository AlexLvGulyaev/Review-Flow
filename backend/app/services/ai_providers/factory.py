from app.services.ai_providers.base import (
    AIProvider,
    EffectiveProviderConfig,
    ProviderNotImplementedError,
)
from app.services.ai_providers.gigachat_provider import GigaChatProvider
from app.services.ai_providers.mock_provider import MockProvider
from app.services.ai_providers.openai_compatible import OpenAICompatibleProvider

IMPLEMENTATION_STATUS: dict[str, str] = {
    "mock": "implemented",
    "openai": "implemented",
    "proxyapi": "implemented",
    "gigachat": "implemented",
}


def get_implementation_status(provider_key: str) -> str:
    return IMPLEMENTATION_STATUS.get(provider_key, "unknown")


class AIProviderFactory:
    @staticmethod
    def create(config: EffectiveProviderConfig) -> AIProvider:
        key = config.provider_key
        if key == "mock":
            return MockProvider(config)
        if key in ("openai", "proxyapi"):
            if config.implementation_status == "not_implemented":
                raise ProviderNotImplementedError(f"{key} not implemented")
            return OpenAICompatibleProvider(config)
        if key == "gigachat":
            return GigaChatProvider(config)
        raise ProviderNotImplementedError(f"Unknown provider: {key}")
