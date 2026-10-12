"""Deterministic career-topic guard shared by normal and streaming chat."""
CAREER_TOPIC_KEYWORDS = {
    'career', 'profession', 'job', 'role', 'roadmap', 'skill', 'skills', 'gap', 'course',
    'learning', 'recommendation', 'score', 'profile', 'market', 'demand', 'salary',
    'interview', 'resume', 'cv', 'portfolio', 'data', 'engineer', 'analyst', 'cloud',
    'software', 'machine learning', 'ml', 'ai',
    'карьера', 'профессия', 'работа', 'роль', 'роадмап', 'план', 'навык', 'навыки',
    'пробел', 'курс', 'обучение', 'рекомендация', 'оценка', 'профиль', 'рынок',
    'спрос', 'зарплата', 'резюме', 'собеседование',
    'мансап', 'мамандық', 'жұмыс', 'рөл', 'жоспар', 'дағды', 'дағдылар',
    'курс', 'оқу', 'ұсыныс', 'баға', 'нарық', 'сұраныс', 'түйіндеме',
}
PROMPT_INJECTION_PATTERNS = {
    'ignore previous', 'ignore all previous', 'system prompt', 'developer message',
    'internal instruction', 'reveal instructions', 'jailbreak', 'dan mode',
    'забудь инструкции', 'игнорируй инструкции', 'системный промпт',
    'внутренние инструкции', 'раскрой инструкции',
}
OFF_TOPIC_PATTERNS = {
    'bubble sort', 'quick sort', 'write code', 'generate code', 'solve math',
    'math problem', 'essay', 'poem', 'lyrics', 'recipe', 'weather',
    'пузырьковую сортировку', 'напиши код', 'сгенерируй эссе',
    'реши задачу', 'математик', 'стих', 'рецепт', 'погода',
    'код жаз', 'эссе жаз', 'математика', 'есеп шығар',
}
OFF_TOPIC_RESPONSES = {
    'ru': 'Я могу консультировать только по карьерным рекомендациям, skill gap, roadmap, профессиям, курсам и вашим результатам в системе.',
    'kk': 'Мен тек мансап ұсыныстары, skill gap, оқу жоспары, мамандықтар, курстар және жүйедегі нәтижелер бойынша көмектесе аламын.',
    'en': 'I can only help with career recommendations, skill gaps, learning roadmaps, professions, courses, and your system results.',
}


def is_career_chat_allowed(message: str) -> bool:
    text = (message or '').lower()
    if any(pattern in text for pattern in PROMPT_INJECTION_PATTERNS):
        return False
    has_career_context = any(keyword in text for keyword in CAREER_TOPIC_KEYWORDS)
    if any(pattern in text for pattern in OFF_TOPIC_PATTERNS) and not has_career_context:
        return False
    return True


def off_topic_response(lang: str) -> str:
    return OFF_TOPIC_RESPONSES.get(lang, OFF_TOPIC_RESPONSES['en'])
