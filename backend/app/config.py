"""Application configuration and environment settings."""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


def _default_database_url() -> str:
    if os.environ.get("VERCEL"):
        return "sqlite:////tmp/edusmart.db"
    return "sqlite:///./edusmart.db"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "EduSmart"
    app_version: str = "1.0.0"
    environment: str = "development"
    database_url: str = _default_database_url()
    jwt_secret: str = "edusmart-dev-secret-change-in-production-9f8e7d6c5b4a"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 720
    max_failed_login_attempts: int = 5
    lockout_minutes: int = 15

    # Optional external LLM providers (falls back seamlessly to built-in grounded Hybrid RAG engine)
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.0-flash"

    # CORS origins (comma-separated)
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()
