from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg2://reviewflow:reviewflow@postgres:5432/reviewflow"
    backend_host: str = "0.0.0.0"
    backend_port: int = 8700

    openai_api_key: str = ""
    openai_base_url: str = "https://api.openai.com/v1"
    openai_model: str = "gpt-4o-mini"

    phrase_match_threshold: float = 55.0


settings = Settings()
