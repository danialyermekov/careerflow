CLASSIFIER_COEF = 0.38
SKILL_MATCHER_COEF = 0.35
DEMAND_MARKET_SHARE_COEF = 0.07
DEMAND_TREND_COEF = 0.20

def get_top_profession(
    classification_scores: dict,
    demand_scores: dict,
    skill_scores: dict,
    alpha: float = CLASSIFIER_COEF,
    beta_trend: float = DEMAND_TREND_COEF, 
    beta_market: float = DEMAND_MARKET_SHARE_COEF, 
    gamma: float = SKILL_MATCHER_COEF, 
) -> tuple:
    
    '''Weighted scoring to combine classifier, demand, and skill matcher scores into a final ranking of professions. Returns top profession, full scores, and top 2 professions.'''

    clf_total = sum(classification_scores.values()) or 1
    clf_norm = {k: v / clf_total for k, v in classification_scores.items()}

    trend_vals = {k: v['trend_score'] for k, v in demand_scores.items()}
    trend_max = max(trend_vals.values()) or 1
    trend_norm = {k: v / trend_max for k, v in trend_vals.items()}

    market_vals = {k: v['market_share'] for k, v in demand_scores.items()}
    market_max = max(market_vals.values()) or 1
    market_norm = {k: v / market_max for k, v in market_vals.items()}

    skill_max = max(skill_scores.values()) or 1
    skill_norm = {k: v / skill_max for k, v in skill_scores.items()}

    professions = classification_scores.keys()
    final_scores = {}

    for prof in professions:
        score = (
            alpha        * clf_norm.get(prof, 0) +
            beta_trend   * trend_norm.get(prof, 0) +
            beta_market  * market_norm.get(prof, 0) +
            gamma        * skill_norm.get(prof, 0)
        )
        final_scores[prof] = round(score, 4)

    final_scores = dict(sorted(
    final_scores.items(),
    key=lambda x: x[1],
    reverse=True))

    top_profession = next(iter(final_scores)) 
    top_2 = list(final_scores.keys())[:2]
    return top_profession, final_scores, top_2
