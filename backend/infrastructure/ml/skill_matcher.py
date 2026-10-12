from sklearn.metrics.pairwise import cosine_similarity
from infrastructure.ml.artifacts import load_skill_matcher
from domain.skills_taxonomy import (
    normalize_skill,
    STOP_WORDS,
    SYNONYMS,
    MUTUALLY_EXCLUSIVE_CLUSTERS,
    FRAMEWORK_LANGUAGE_MAP
)

class SkillMatcherService:
    def __init__(self):
        self.vectorizer, self.profession_vectors, self.profession_names = load_skill_matcher()

    def _student_vector(self, student_raw_skills: list[str]):
        student_skills = {
            normalized for raw in student_raw_skills
            if (normalized := normalize_skill(raw)) and normalized not in STOP_WORDS
        }
        return student_skills, self.vectorizer.transform([" ".join(sorted(student_skills))])

    def get_scores(self, student_raw_skills: list[str]) -> dict:
        """Calculates cosine similarity between student skills and profession profiles.
        
        Shape:
            student_raw_skills: List of length (num_student_skills)
            Returns: Dict of length (num_professions) with probabilities
        """
        student_skills, student_vector = self._student_vector(student_raw_skills)
                
        if not student_skills:
            return {name: 0.0 for name in self.profession_names}

        # The vectorizer includes bigrams, so set iteration order must be stable.
        scores = cosine_similarity(student_vector, self.profession_vectors)[0]

        return dict(sorted(
            zip(self.profession_names, scores.tolist()),
            key=lambda x: x[1],
            reverse=True
        ))

    def get_user_skills_ranked(self, student_raw_skills: list[str]) -> list[dict]:
        """Maps each user-submitted skill to its computed TF-IDF vector weight, resolving OOVs.
        
        Shape:
            student_raw_skills: List of length (num_student_skills)
            Returns: List of dicts, sorted by tfidf_weight descending
        """
        _, student_vector = self._student_vector(student_raw_skills)

        vocab = self.vectorizer.vocabulary_
        user_skills_ranked = []
        seen_skills = set()

        for raw in student_raw_skills:
            token = raw.strip().lower()
            norm_skill = SYNONYMS.get(token, token)

            # Avoid duplicates in UI list
            if norm_skill in seen_skills:
                continue
            seen_skills.add(norm_skill)

            weight = 0.0
            status = "General/Non-IT Token"

            # Check taxonomy presence
            in_taxonomy = (
                norm_skill in SYNONYMS.values() or
                norm_skill in FRAMEWORK_LANGUAGE_MAP or
                any(norm_skill in cluster["skills"] for cluster in MUTUALLY_EXCLUSIVE_CLUSTERS)
            )

            if norm_skill in vocab:
                idx = vocab[norm_skill]
                weight = float(student_vector[0, idx])
                status = "verified"
            elif in_taxonomy:
                status = "verified"

            user_skills_ranked.append({
                "skill": raw,
                "canonical_skill": norm_skill,
                "tfidf_weight": round(weight, 2),
                "status": status
            })

        # Order the skills in descending order of their TF-IDF weights
        user_skills_ranked.sort(key=lambda x: x["tfidf_weight"], reverse=True)
        return user_skills_ranked
