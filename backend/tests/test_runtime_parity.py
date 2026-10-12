"""Fixed-week outputs captured before the architecture migration (aa4877a)."""
import hashlib
import json

import pandas as pd
import pytest

from conftest import TEST_PROFILE
from infrastructure.ml.classifier import ClassifierService
from infrastructure.ml.course_finder import CourseFinderService
from infrastructure.ml.demand import DemandService
from infrastructure.ml.skill_matcher import SkillMatcherService
from domain.ranking import get_top_profession


def _normalize(value):
    if isinstance(value, dict):
        return {key: _normalize(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_normalize(item) for item in value]
    return round(value, 8) if isinstance(value, float) else value


def _digest(value):
    return hashlib.sha256(json.dumps(_normalize(value), sort_keys=True, ensure_ascii=False).encode()).hexdigest()


def test_real_artifacts_preserve_scores_and_explanations(monkeypatch):
    monkeypatch.setattr(DemandService, '_get_prediction_date', lambda self: pd.Timestamp('2023-10-18'))
    classifier, demand, matcher = ClassifierService(), DemandService(), SkillMatcherService()
    profile = {key: value for key, value in TEST_PROFILE.items() if key not in {'skills', 'lang'}}
    scores = {
        'classifier': classifier.get_scores(profile), 'demand': demand.get_scores(),
        'skills': matcher.get_scores(TEST_PROFILE['skills']),
        'ranked_skills': matcher.get_user_skills_ranked(TEST_PROFILE['skills']),
        'explanations': classifier.get_skill_explanations(profile, TEST_PROFILE['skills']),
    }
    assert _digest(scores) == '7e3642ff01299acf2411211298cf042c5d93621003192a5f29d4e09802ca91c9'
    assert get_top_profession(scores['classifier'], scores['demand'], scores['skills']) == (
        'Data Scientist', {'Data Scientist': 0.741, 'Machine Learning Engineer': 0.5448,
                           'Data Analyst': 0.4783, 'Cloud Engineer': 0.3244,
                           'Data Engineer': 0.3236, 'Business Analyst': 0.3014,
                           'Software Engineer': 0.2764},
        ['Data Scientist', 'Machine Learning Engineer'],
    )
    assert demand.get_scores() == scores['demand']
    assert matcher.get_scores([]) == {name: 0.0 for name in matcher.profession_names}


@pytest.mark.parametrize(('lang', 'expected'), [
    ('en', '063a4cd6039dd27cbd30f9bc2e7204002043054fa5042ad6d8111745041d79e5'),
    ('ru', '5b5521111a32b05eef8e78a5a6f14d67b3d15f6a43635fd53ffc52b79f971491'),
    ('kk', '5b5521111a32b05eef8e78a5a6f14d67b3d15f6a43635fd53ffc52b79f971491'),
])
def test_real_catalog_preserves_roadmaps_and_locale_fallback(lang, expected):
    result = CourseFinderService().get_gap_summary_for_all(TEST_PROFILE['skills'], lang=lang)
    assert _digest(result) == expected
