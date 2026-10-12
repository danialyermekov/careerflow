import os

import pytest


def test_environment_overrides_dotenv_without_mutating_process(tmp_path, monkeypatch):
    from core.settings import Settings

    source = tmp_path / '.env'
    source.write_text(
        'SUPABASE_URL=https://file.supabase.co/\nDATABASE_URL=file-secret\nCORS_ORIGINS=http://one,http://two\n'
    )
    monkeypatch.setenv('SUPABASE_URL', 'https://env.supabase.co/')
    monkeypatch.delenv('DATABASE_URL', raising=False)
    settings = Settings(_env_file=source)
    assert settings.supabase_url == 'https://env.supabase.co'
    assert settings.database_url.get_secret_value() == 'file-secret'
    assert settings.cors_origins == ['http://one', 'http://two']
    assert 'DATABASE_URL' not in os.environ
    assert 'file-secret' not in repr(settings)


def test_legacy_keys_and_explicit_empty_values_keep_fallback(monkeypatch):
    from core.settings import Settings, PreviewSettings

    monkeypatch.setenv('SUPABASE_PUBLISHABLE_KEY', '')
    monkeypatch.setenv('REACT_APP_SUPABASE_PUBLISHABLE_KEY', 'public-key')
    monkeypatch.setenv('SUPABASE_SECRET_KEY', '')
    monkeypatch.setenv('SUPABASE_SERVICE_ROLE_KEY', 'server-secret')
    monkeypatch.setenv('GEMINI_DEMO_API_KEY', '')
    monkeypatch.setenv('API_KEY', 'legacy-demo-key')
    settings = Settings(_env_file=None)
    assert settings.auth_public_key == 'public-key'
    assert settings.auth_secret_key == 'server-secret'
    assert PreviewSettings(_env_file=None).api_key == 'legacy-demo-key'


def test_artifact_paths_follow_configured_directories(tmp_path, monkeypatch):
    from core.settings import Settings

    monkeypatch.setenv('MODELS_DIR', str(tmp_path / 'models'))
    monkeypatch.setenv('DATA_DIR', str(tmp_path / 'data'))
    settings = Settings(_env_file=None)
    assert settings.models_dir / 'classifier_model.joblib' == tmp_path / 'models/classifier_model.joblib'
    assert settings.data_dir / 'all_courses.csv' == tmp_path / 'data/all_courses.csv'


@pytest.mark.parametrize('value', ['nonsense', '4', '0'])
def test_invalid_preview_allocation_disables_preview(value, monkeypatch):
    from core.settings import PreviewSettings

    monkeypatch.setenv('GEMINI_DEMO_FREE_MESSAGES', value)
    monkeypatch.setenv('GEMINI_DEMO_ENABLED', 'true')
    monkeypatch.setenv('GEMINI_DEMO_API_KEY', 'test-server-key')
    assert not PreviewSettings(_env_file=None).enabled


def test_invalid_daily_limit_preserves_disabled_allocation_response(monkeypatch):
    from core.settings import PreviewSettings

    monkeypatch.setenv('GEMINI_DEMO_GLOBAL_DAILY_LIMIT', 'invalid')
    settings = PreviewSettings(_env_file=None)
    assert not settings.enabled
    assert settings.gemini_demo_free_messages == settings.gemini_demo_global_daily_limit == 0


def test_dotenv_interpolation_keeps_inherited_environment_priority(tmp_path, monkeypatch):
    from core.settings import Settings, PreviewSettings

    source = tmp_path / '.env'
    source.write_text(
        'DB_TARGET=file-host\nDATABASE_URL=postgresql://${DB_TARGET}/db\nAPI_KEY=file-key\nGEMINI_DEMO_API_KEY=${API_KEY}\n'
    )
    monkeypatch.setenv('DB_TARGET', 'inherited-host')
    monkeypatch.setenv('API_KEY', 'inherited-key')
    monkeypatch.delenv('DATABASE_URL', raising=False)
    monkeypatch.delenv('GEMINI_DEMO_API_KEY', raising=False)
    assert Settings(_env_file=source).database_url.get_secret_value() == 'postgresql://inherited-host/db'
    assert PreviewSettings(_env_file=source).api_key == 'inherited-key'
