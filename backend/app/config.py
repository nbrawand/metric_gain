"""Application configuration using Pydantic settings."""

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

# Values shipped in .env.example. Booting production with one of these means the
# deploy never got real secrets, and every token the app issues is forgeable by
# anyone who has read the repo.
PLACEHOLDER_SECRETS = {
    "your-secret-key-change-in-production",
    "your-secret-key-change-in-production-use-openssl-rand-hex-32",
    "change-me",
    "secret",
}


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Database
    DATABASE_URL: str

    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 90
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Environment
    ENVIRONMENT: str = "development"

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ""

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""
    STRIPE_PRICE_ID: str = ""
    FRONTEND_URL: str = "http://localhost:5173"

    # CORS
    CORS_ORIGINS: str = "http://localhost:5173"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True)

    @property
    def is_production(self) -> bool:
        """True when running as the deployed app rather than locally or in tests."""
        return self.ENVIRONMENT.lower() == "production"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse CORS origins string into list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @model_validator(mode="after")
    def _check_production_secrets(self) -> "Settings":
        """Refuse to boot production with a placeholder secret or wildcard CORS.

        Both are silent failures otherwise: the app starts, serves traffic, and
        nothing looks wrong until someone forges a token or reads a response
        from a site the user never signed in to.
        """
        if not self.is_production:
            return self

        if self.SECRET_KEY in PLACEHOLDER_SECRETS or len(self.SECRET_KEY) < 32:
            raise ValueError(
                "SECRET_KEY is a placeholder or too short for production. "
                "Generate one with: openssl rand -hex 32"
            )

        # allow_credentials is on, so Starlette echoes back whatever origin asks
        # when this is "*" — any site could then read a signed-in user's data
        if "*" in self.cors_origins_list:
            raise ValueError(
                "CORS_ORIGINS cannot be '*' in production; list the exact frontend origins."
            )

        # A billing deploy without the webhook secret is not degraded, it is
        # broken in both directions: real Stripe deliveries bounce while the
        # endpoint would verify forged events against an empty HMAC key.
        if self.STRIPE_SECRET_KEY and not self.STRIPE_WEBHOOK_SECRET:
            raise ValueError(
                "STRIPE_WEBHOOK_SECRET is required in production whenever "
                "STRIPE_SECRET_KEY is set."
            )

        # Stripe redirects users here after checkout; the default would send
        # paying customers to localhost
        if self.STRIPE_SECRET_KEY and "localhost" in self.FRONTEND_URL:
            raise ValueError(
                "FRONTEND_URL still points at localhost; set it to the deployed "
                "frontend origin."
            )

        return self


# Global settings instance
settings = Settings()
