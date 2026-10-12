"""Pure runtime skill-gap rules. Offline profile construction lives in infrastructure/ml."""

# ── import from taxonomy module ────────────────────────────────────────────
from domain.skills_taxonomy import (
    STOP_WORDS,
    FRAMEWORK_LANGUAGE_MAP,
    normalize_skill,
    infer_languages,
)

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGS (placed here — edit in one place)
# ─────────────────────────────────────────────────────────────────────────────

# For each profession — categories that will be included in the roadmap
PROFESSION_CATEGORIES = {
    'Data Scientist': [
        'programming', 'libraries', 'databases', 'cloud', 'other'
    ],
    'Data Analyst': [
        'programming', 'analyst_tools', 'databases'
    ],
    'Data Engineer': [
        'programming', 'databases', 'cloud', 'other', 'libraries'
    ],
    'Business Analyst': [
        'programming', 'analyst_tools', 'databases'
    ],
    'Machine Learning Engineer': [
        'programming', 'libraries', 'cloud', 'webframeworks','other'
    ],
    'Software Engineer': [
        'programming', 'webframeworks', 'databases', 'cloud', 'other'
    ],
    'Cloud Engineer': [
        'programming', 'cloud', 'other', 'databases'
    ],
}

# How many skills to display in the roadmap for each category
CATEGORY_LIMITS: dict[str, int] = {
    "programming":    2,
    "webframeworks":  1,
    "databases":      2,
    "libraries":      4,   # libraries — allow more
    "cloud":          1,
    "analyst_tools":  2,
    "other":          2,
    "default":        2,   # fallback for unknown categories
}

# =============================================================================
# FUNCTION 2 — generate_roadmap
# =============================================================================

def generate_roadmap(
    profession: str,
    student_raw_skills: list[str],
    profession_profile: dict[str, list[str]],
) -> dict:
    """
    Returns:
        {
          "gap":  { cat: [missing_skill, ...] },   # только то чего не хватает
          "full": { cat: [all_skill, ...] }         # полный профиль профессии
        }
    """

    # ── 1. Normalize student skills ─────────────────────────────
    student_skills: set[str] = set()
    for raw in student_raw_skills:
        normalized = normalize_skill(raw)
        if normalized and normalized not in STOP_WORDS:
            student_skills.add(normalized)

    # ── 2. Expand implicit knowledge ────────────────────────────
    implicit_langs = infer_languages(list(student_skills))
    student_skills |= implicit_langs

    # ── 3. Active languages ─────────────────────────────────────
    programming_category = set(profession_profile.get("programming", []))
    active_langs: set[str] = student_skills & (programming_category | implicit_langs)
    if not active_langs:
        active_langs = {s for s in student_skills if s in FRAMEWORK_LANGUAGE_MAP.values()}

    # ── 4. Relevant categories ───────────────────────────────────
    relevant_cats = PROFESSION_CATEGORIES.get(profession, set(profession_profile.keys()))

    # ── 5. Build both roadmaps ───────────────────────────────────
    gap_roadmap:  dict[str, list[str]] = {}
    full_roadmap: dict[str, list[str]] = {}

    for cat, profile_skills in profession_profile.items():
        if cat not in relevant_cats:
            continue

        limit = CATEGORY_LIMITS.get(cat, CATEGORY_LIMITS["default"])
        limited_skills = profile_skills[:limit]

        # full — все скиллы профессии (с учётом фильтра webframeworks)
        full_cat: list[str] = []
        for skill in limited_skills:
            if cat == "webframeworks" and active_langs:
                required_lang = FRAMEWORK_LANGUAGE_MAP.get(skill)
                if required_lang and required_lang not in active_langs:
                    continue
            full_cat.append(skill)

        # gap — нормализуем скилл профессии перед сравнением
        gap_cat: list[str] = [
            s for s in full_cat
            if normalize_skill(s) not in student_skills  # ← normalize перед сравнением
        ]
        if full_cat:
            full_roadmap[cat] = full_cat
        if gap_cat:
            gap_roadmap[cat] = gap_cat

    return {
        "gap":  gap_roadmap,
        "full": full_roadmap,
    }
