from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


@dataclass
class EffectiveProviderConfig:
    provider_key: str
    model_name: str
    temperature: float
    max_tokens: int
    api_key: str | None = None
    base_url: str | None = None
    implementation_status: str = "implemented"


class ProviderNotReadyError(Exception):
    pass


class ProviderNotImplementedError(Exception):
    pass


class AIProvider(ABC):
    @property
    @abstractmethod
    def provider_key(self) -> str:
        ...

    @property
    @abstractmethod
    def model_name(self) -> str:
        ...

    @abstractmethod
    def complete_json(self, system_prompt: str, user_prompt: str) -> tuple[dict[str, Any], int]:
        ...

    @abstractmethod
    def complete_text(self, system_prompt: str, user_prompt: str) -> tuple[str, int]:
        ...

    def test_connection(self) -> tuple[bool, str]:
        return True, "OK"
