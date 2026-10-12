"""Offline profession-profile construction; runtime only consumes its JSON artifact."""
import ast
from collections import Counter, defaultdict

import pandas as pd

from domain.skills_taxonomy import FRAMEWORK_LANGUAGE_MAP, MUTUALLY_EXCLUSIVE_CLUSTERS, STOP_WORDS, normalize_skill


def build_profession_profile(df, profession: str, top_n: int = 5,
                             data_col: str = 'job_posted_date') -> dict[str, list[str]]:
    profession_df = df[df['job_title_unified'] == profession].copy()
    df[data_col] = pd.to_datetime(df[data_col], errors='coerce')
    profession_df[data_col] = pd.to_datetime(profession_df[data_col], errors='coerce')
    maximum, minimum = profession_df[data_col].max(), profession_df[data_col].min()
    days_span = (maximum - minimum).days
    if days_span > 0:
        profession_df['time_weight'] = 0.5 + 1.5 * ((profession_df[data_col] - minimum).dt.days / days_span)
    else:
        profession_df['time_weight'] = 1.0
    counters: dict[str, Counter] = defaultdict(Counter)
    for _, row in profession_df.iterrows():
        try:
            parsed = ast.literal_eval(row['job_type_skills'])
        except (ValueError, SyntaxError):
            continue
        for category, skills in parsed.items():
            for raw in skills:
                normalized = normalize_skill(raw)
                if normalized and normalized not in STOP_WORDS:
                    counters[category][normalized] += row['time_weight']
    if not counters:
        return {}
    active_languages = {skill.lower() for skill, _ in counters['programming'].most_common(top_n)} if 'programming' in counters else set()
    exclusive_groups = [cluster['skills'] for cluster in MUTUALLY_EXCLUSIVE_CLUSTERS]

    def select_top(counter: Counter, category: str) -> list[str]:
        selected: list[str] = []
        seen_groups: set[int] = set()
        for skill, _ in counter.most_common(top_n * 6):
            if len(selected) >= top_n:
                break
            if category == 'webframeworks' and active_languages:
                language = FRAMEWORK_LANGUAGE_MAP.get(skill)
                if not language or language not in active_languages:
                    continue
            group_index = next((index for index, group in enumerate(exclusive_groups) if skill in group), None)
            if group_index is not None:
                if group_index in seen_groups:
                    continue
                seen_groups.add(group_index)
            selected.append(skill)
        return selected

    profile = {}
    if 'programming' in counters:
        profile['programming'] = select_top(counters['programming'], 'programming')
    for category, counter in counters.items():
        if category != 'programming':
            profile[category] = select_top(counter, category)
    return profile
