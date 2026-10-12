from conftest import TEST_PROFILE


def test_stable_json_endpoints_declare_response_contracts(client):
    schema = client.get('/openapi.json').json()
    for path, method, status in [('/recommend', 'post', '200'), ('/chat', 'post', '200'),
                                  ('/api/feedback', 'get', '200'), ('/feedback', 'post', '201'),
                                  ('/recommendation/{session_id}/state', 'get', '200')]:
        assert schema['paths'][path][method]['responses'][status]['content']['application/json']['schema'].get('$ref')


def test_recommendation_wire_contract(client):
    result = client.post('/recommend', json=TEST_PROFILE).json()
    assert set(result) == {
        'top_profession', 'session_id', 'alternative_profession', 'final_scores',
        'skill_scores', 'classification_scores', 'demand_scores',
        'skill_explanations', 'shap_explanations', 'scoring_weights',
        'user_skills_ranked', 'roadmap_with_courses', 'full_roadmap',
        'roadmaps_by_profession', 'context', '_formData', 'persistent',
    }
    assert result['_formData'] == TEST_PROFILE
    assert result['top_profession'] == 'Machine Learning Engineer'
    assert result['alternative_profession'] == 'Data Engineer'
    state = client.get(f"/recommendation/{result['session_id']}/state").json()
    assert state == {'results': result, 'progress': {}, 'filters': {}}


def test_validation_does_not_echo_profile_or_headers(client):
    response = client.post('/recommend', json={**TEST_PROFILE, 'gpa': 5},
                           headers={'X-LLM-API-Key': 'private-test-key'})
    assert response.status_code == 422
    assert response.json() == {'detail': 'Invalid request fields.'}


def test_progress_preserves_camel_case_and_guest_marker(client, recommendation_response):
    progress = {'doneSkills': ['libraries::pytorch'], 'categoryOrder': ['libraries'],
                'skillOrders': {'libraries': ['pytorch']}, 'selectedProfession': 'Data Scientist'}
    session = recommendation_response['session_id']
    response = client.put(f'/recommendation/{session}/progress', json=progress)
    assert response.json() == {'saved': True, 'persistent': False, 'progress': progress}
