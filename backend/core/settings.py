"""Typed environment/dotenv configuration; loading never changes os.environ."""

from functools import lru_cache
from pathlib import Path
from typing import Annotated, Any
from collections.abc import Mapping

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, DotEnvSettingsSource, NoDecode, SettingsConfigDict
from pydantic_settings.sources.utils import parse_env_vars
from dotenv.main import DotEnv

BASE_DIR = Path(__file__).resolve().parent.parent
PREVIEW_MODELS = {'gemini-2.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-3.5-flash-lite'}


class InheritedEnvironmentDotenv(DotEnvSettingsSource):
    def _read_env_file(self, file_path: Path) -> Mapping[str, str | None]:
        # Match load_dotenv(override=False) interpolation without modifying the process environment.
        values = DotEnv(file_path, encoding=self.env_file_encoding or 'utf-8', override=False).dict()
        return parse_env_vars(values, self.case_sensitive, self.env_ignore_empty, self.env_parse_none_str)


class EnvironmentSettings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=BASE_DIR / '.env',
        env_file_encoding='utf-8',
        extra='ignore',
        hide_input_in_errors=True,
    )

    @classmethod
    def settings_customise_sources(
        cls, settings_cls, init_settings, env_settings, dotenv_settings, file_secret_settings
    ):
        assert isinstance(dotenv_settings, DotEnvSettingsSource)
        source = InheritedEnvironmentDotenv(
            settings_cls, env_file=dotenv_settings.env_file, env_file_encoding=dotenv_settings.env_file_encoding
        )
        return init_settings, env_settings, source, file_secret_settings


class Settings(EnvironmentSettings):
    supabase_url: str = ''
    supabase_publishable_key: str = ''
    react_app_supabase_publishable_key: str = ''
    supabase_secret_key: SecretStr = SecretStr('')
    supabase_service_role_key: SecretStr = SecretStr('')
    database_url: SecretStr = SecretStr('')
    cors_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: [
            'https://careerflow.live',
            'http://localhost:3000',
            'http://127.0.0.1:3000',
        ]
    )
    developer_supabase_user_ids: Annotated[set[str], NoDecode] = Field(default_factory=set)
    models_dir: Path = BASE_DIR / 'models'
    data_dir: Path = BASE_DIR / 'data'
    frontend_build_dir: Path = BASE_DIR.parent / 'frontend' / 'build'
    canonical_origin: str = 'https://careerflow.live'
    gemini_base_url: str = 'https://generativelanguage.googleapis.com'
    anthropic_base_url: str = 'https://api.anthropic.com'

    @field_validator('supabase_url', 'canonical_origin', mode='before')
    @classmethod
    def trim_url(cls, value: str) -> str:
        return value.rstrip('/')

    @field_validator('cors_origins', 'developer_supabase_user_ids', mode='before')
    @classmethod
    def comma_separated(cls, value: Any) -> Any:
        return [item.strip() for item in value.split(',') if item.strip()] if isinstance(value, str) else value

    @property
    def auth_public_key(self) -> str:
        if self.supabase_publishable_key or self.react_app_supabase_publishable_key:
            return self.supabase_publishable_key or self.react_app_supabase_publishable_key
        # Compatibility: only a public frontend value may fall back to frontend/.env.
        from dotenv import dotenv_values

        return dotenv_values(BASE_DIR.parent / 'frontend' / '.env').get('REACT_APP_SUPABASE_PUBLISHABLE_KEY') or ''

    @property
    def auth_secret_key(self) -> str:
        return self.supabase_secret_key.get_secret_value() or self.supabase_service_role_key.get_secret_value()


class PreviewSettings(EnvironmentSettings):
    gemini_demo_api_key: SecretStr = SecretStr('')
    api_key_fallback: SecretStr = Field(default=SecretStr(''), validation_alias='API_KEY')
    gemini_demo_enabled: bool = False
    gemini_demo_model: str = 'gemini-3.5-flash-lite'
    gemini_demo_free_messages: int = 3
    gemini_demo_global_daily_limit: int = 100

    @model_validator(mode='before')
    @classmethod
    def invalid_allocations_disable_both(cls, values: dict[str, Any]) -> dict[str, Any]:
        try:
            int(values.get('gemini_demo_free_messages', 3))
            int(values.get('gemini_demo_global_daily_limit', 100))
        except (ValueError, TypeError):
            values['gemini_demo_free_messages'] = values['gemini_demo_global_daily_limit'] = 0
        return values

    @field_validator('gemini_demo_enabled', mode='before')
    @classmethod
    def explicit_enable(cls, value: Any) -> bool:
        return value if isinstance(value, bool) else str(value).lower() == 'true'

    @field_validator('gemini_demo_free_messages', 'gemini_demo_global_daily_limit', mode='before')
    @classmethod
    def invalid_limit_disables(cls, value: Any) -> int:
        try:
            return int(value)
        except (ValueError, TypeError):
            return 0

    @property
    def api_key(self) -> str:
        return (
            (self.gemini_demo_api_key.get_secret_value() or self.api_key_fallback.get_secret_value())
            .strip()
            .strip('\'"')
        )

    @property
    def enabled(self) -> bool:
        return (
            self.gemini_demo_enabled
            and bool(self.api_key)
            and self.gemini_demo_model in PREVIEW_MODELS
            and 0 < self.gemini_demo_free_messages <= 3
            and self.gemini_demo_global_daily_limit > 0
        )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
