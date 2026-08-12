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

    ch_pipeline_enabled: bool = True
    ch_confidence_medium_delta: float = 0.10
    ch_retrieval_top_n: int = 5

    # Ops/admin console authentication (read-only demo RBAC).
    # When ops_admin_token is configured, ops endpoints require a Bearer token
    # and derive the role from it (administrator/operator/demo). When it is
    # empty (dev/tests), the legacy X-Role header fallback is used.
    ops_admin_token: str = ""
    ops_operator_token: str = ""
    ops_demo_token: str = ""

    # Public Web UI demo sessions (tokenized demo limiter).
    # When demo_limiter_enabled is True, POST /api/reviews requires an
    # X-Demo-Token issued by POST /api/demo/start and consumes a per-session
    # quota. When False (dev/tests), the endpoint is open as before.
    demo_limiter_enabled: bool = False
    demo_max_requests_per_session: int = 20
    demo_session_ttl_minutes: int = 30
    demo_rate_limit_per_minute: int = 12  # 1 request per 5 seconds
    demo_max_sessions_per_ip_per_hour: int = 5

    @property
    def ops_auth_enabled(self) -> bool:
        """Ops token auth is active when an admin token is configured."""
        return bool(self.ops_admin_token) and not self.ops_admin_token.startswith("YOUR")


settings = Settings()
