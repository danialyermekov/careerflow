def test_optimizer_uses_production_normalization_and_rounding():
    from optimize_weights import ComponentScores, LabeledScores, apply_weights
    from conftest import EXPECTED_PROFESSIONS

    classifier = dict.fromkeys(sorted(EXPECTED_PROFESSIONS), 0.0)
    classifier.update({'Data Analyst': 10.0, 'Data Scientist': 9.0})
    skills = dict.fromkeys(classifier, 0.0)
    skills.update({'Data Analyst': 0.7, 'Data Scientist': 1.0})
    zero = dict.fromkeys(classifier, 0.0)
    labeled = LabeledScores(ComponentScores(classifier, skills, zero, zero), 'Data Scientist', False)
    assert apply_weights(labeled, (0.8, 0.2, 0.0, 0.0)) == ('Data Scientist', 'Data Analyst')


def test_benchmark_profiles_obey_current_request_contract():
    from evaluate_speed import generate_mock_profiles
    from api.schemas.requests import StudentProfile

    for profile in generate_mock_profiles():
        assert StudentProfile.model_validate(profile).model_dump() == profile


def test_offline_profile_builder_preserves_recency_weighting():
    import pandas as pd
    from infrastructure.ml.profile_preparation import build_profession_profile

    observations = pd.DataFrame(
        {
            'job_title_unified': ['Software Engineer'] * 3,
            'job_posted_date': ['2023-01-01', '2023-01-01', '2023-02-01'],
            'job_type_skills': [
                "{'programming': ['Java']}",
                "{'programming': ['Java']}",
                "{'programming': ['Python'], 'webframeworks': ['Django']}",
            ],
        }
    )
    assert build_profession_profile(observations, 'Software Engineer', top_n=1) == {
        'programming': ['python'],
        'webframeworks': ['django'],
    }
