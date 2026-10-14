from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str
    supabase_service_role_key: str
    database_url: str
    anthropic_api_key: str
    anthropic_model: str = "claude-sonnet-5"
    cors_origins: str = "http://localhost:8081"
    # Enables the "test-error" phrase that forces the check-failed screen for a live demo. Never in production.
    demo_hooks: bool = False

    @property
    def jwks_url(self) -> str:
        return f"{self.supabase_url}/auth/v1/.well-known/jwks.json"


@lru_cache
def get_settings() -> Settings:
    return Settings()
