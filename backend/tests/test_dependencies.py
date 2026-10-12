from fastapi.testclient import TestClient

import main


def test_factory_has_no_shared_runtime_instances():
    assert hasattr(main, 'create_app'), 'An isolated application factory is required'
    first, second = main.create_app(), main.create_app()
    assert first is not second
    assert first.state.runtime is not second.state.runtime
    assert first.state.runtime.instances == second.state.runtime.instances == {}
    with TestClient(first) as client:
        assert client.get('/health').json() == {'status': 'ok'}
    assert first.state.runtime.instances == {}


def test_recommendation_uses_dependency_overrides():
    from api.dependencies import get_recommendation_service
    from conftest import TEST_PROFILE

    class UnavailableRecommendation:
        def recommend(self, profile):
            raise RuntimeError('internal artifact path must never be exposed')

    app = main.create_app()
    app.dependency_overrides[get_recommendation_service] = lambda: UnavailableRecommendation()
    with TestClient(app, headers={'X-Guest-Token': 'a' * 64}) as client:
        response = client.post('/recommend', json=TEST_PROFILE)
    assert response.status_code == 500
    assert response.json() == {'detail': 'Could not generate a recommendation.'}
    assert app.state.runtime.instances == {}
