from unittest.mock import Mock
from uuid import uuid4

from api import auth
from infrastructure.llm import GeminiProvider


def test_preview_failure_logs_no_provider_secret(client, recommendation_response, monkeypatch, caplog):
    user = {'id': str(uuid4()), 'display_name': 'Owner'}
    monkeypatch.setattr(auth, 'verify_access_token', lambda token: user)
    client.headers.update({'Authorization': 'Bearer verified', 'X-Demo-Session': 'true'})
    monkeypatch.setenv('GEMINI_DEMO_ENABLED', 'true')
    monkeypatch.setenv('GEMINI_DEMO_API_KEY', 'test-server-key')
    monkeypatch.setattr(GeminiProvider, 'chat_preview', Mock(side_effect=RuntimeError('private-provider-secret')))
    response = client.post('/ai/preview', json={
        'session_id': recommendation_response['session_id'], 'message': 'Which career skills?',
        'history': [], 'lang': 'en', 'consent': True,
    })
    assert response.status_code == 503
    assert 'private-provider-secret' not in caplog.text
    assert 'RuntimeError' in caplog.text
