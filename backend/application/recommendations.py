"""Recommendation orchestration, with plain data in and plain data out."""
from typing import Any
from uuid import uuid4

from application.runtime import Runtime
from domain.ranking import (
    CLASSIFIER_COEF, DEMAND_MARKET_SHARE_COEF, DEMAND_TREND_COEF,
    SKILL_MATCHER_COEF, get_top_profession,
)


class RecommendationService:
    def __init__(self, runtime: Runtime) -> None:
        self.runtime = runtime

    def recommend(self, profile: dict[str, Any]) -> dict[str, Any]:
        matcher = self.runtime.get('skill_matcher')
        classifier = self.runtime.get('classifier')
        demand = self.runtime.get('demand')
        courses = self.runtime.get('course_finder')
        llm = self.runtime.get('llm')
        skills = profile['skills']
        lang = profile['lang']
        skill_scores = matcher.get_scores(skills)
        ranked_skills = matcher.get_user_skills_ranked(skills)
        classifier_profile = {key: value for key, value in profile.items() if key not in {'skills', 'lang'}}
        classification_scores = classifier.get_scores(classifier_profile)
        explanations = (classifier.get_skill_explanations(profile=classifier_profile, student_skills=skills)
                        if hasattr(classifier, 'get_skill_explanations') else {})
        demand_scores = demand.get_scores()
        top, final_scores, top_2 = get_top_profession(classification_scores, demand_scores, skill_scores)
        roadmap, full = courses.get_roadmap_with_courses(profession=top, student_skills=skills, lang=lang)
        summaries = (courses.get_gap_summary_for_all(skills, lang=lang)
                     if hasattr(courses, 'get_gap_summary_for_all')
                     else {top: {'full': full, 'gap': {}, 'roadmap_with_courses': roadmap}})
        context = llm.build_context(skills=skills, skill_scores=skill_scores,
                                   classification_scores=classification_scores,
                                   demand_scores=demand_scores, roadmap_with_courses=roadmap)
        return {
            'top_profession': top, 'session_id': str(uuid4()), 'alternative_profession': top_2[1],
            'final_scores': final_scores, 'skill_scores': skill_scores,
            'classification_scores': classification_scores, 'demand_scores': demand_scores,
            'skill_explanations': explanations, 'shap_explanations': explanations.get(top, {}).get('shap_explanations', []),
            'scoring_weights': {'classifier': CLASSIFIER_COEF, 'skill_matcher': SKILL_MATCHER_COEF,
                                'demand_trend': DEMAND_TREND_COEF, 'demand_market_share': DEMAND_MARKET_SHARE_COEF},
            'user_skills_ranked': ranked_skills, 'roadmap_with_courses': roadmap,
            'full_roadmap': full, 'roadmaps_by_profession': summaries, 'context': context,
            '_formData': profile,
        }
