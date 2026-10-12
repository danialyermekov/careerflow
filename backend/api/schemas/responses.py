"""Explicit public JSON contracts; optional fields are excluded when absent."""
from typing import Literal
from datetime import datetime

from pydantic import BaseModel, Field, JsonValue, field_validator

from api.schemas.requests import StudentProfile


class ErrorDetail(BaseModel):
    code: str
    message: str


class ErrorResponse(BaseModel):
    detail: str | ErrorDetail


class StatusResponse(BaseModel):
    status: str


class DeletedResponse(BaseModel):
    deleted: bool


class SubmittedResponse(BaseModel):
    submitted: bool


class ChatResponse(BaseModel):
    response: str


class TranscriptionResponse(BaseModel):
    text: str


class ResumeResponse(BaseModel):
    filename: str
    skills: list[str]
    role: str
    text_preview: str


class CourseResponse(BaseModel):
    title: str | None
    platform: str | None
    rating: float
    reviews: int
    course_url: str | None
    description: str | None = None
    difficulty: str | None = None
    level: str | None = None
    certificate: bool | None = None
    language: str | None = None
    price_type: str | None = None
    price: float | None = None


class SkillCourses(BaseModel):
    courses: list[CourseResponse]


RoadmapCourses = dict[str, dict[str, SkillCourses]]
SkillGroups = dict[str, list[str]]


class RoadmapSummary(BaseModel):
    full: SkillGroups
    gap: SkillGroups
    roadmap_with_courses: RoadmapCourses


class DemandScore(BaseModel):
    trend_score: float
    market_share: float
    predicted_vacancies: int


class RankedSkill(BaseModel):
    skill: str
    canonical_skill: str
    tfidf_weight: float
    status: str


class ShapExplanation(BaseModel):
    feature_name: str
    label: str
    raw_value: float
    influence_percent: float


class SkillInfluence(BaseModel):
    skill: str
    feature: str
    value: float
    abs_value: float
    direction: str
    present: bool
    magnitude: str
    text: str


class SkillExplanation(BaseModel):
    profession: str
    method: str
    items: list[SkillInfluence]
    positive: list[SkillInfluence]
    negative: list[SkillInfluence]
    summary: str
    shap_explanations: list[ShapExplanation] = Field(default_factory=list)


class ScoringWeights(BaseModel):
    classifier: float
    skill_matcher: float
    demand_trend: float
    demand_market_share: float


class RecommendationResponse(BaseModel):
    top_profession: str
    session_id: str
    alternative_profession: str
    final_scores: dict[str, float]
    skill_scores: dict[str, float]
    classification_scores: dict[str, float]
    demand_scores: dict[str, DemandScore]
    skill_explanations: dict[str, SkillExplanation]
    shap_explanations: list[ShapExplanation]
    scoring_weights: ScoringWeights
    user_skills_ranked: list[RankedSkill]
    roadmap_with_courses: RoadmapCourses
    full_roadmap: SkillGroups
    roadmaps_by_profession: dict[str, RoadmapSummary]
    context: str
    form_data: StudentProfile = Field(alias='_formData')
    persistent: bool = False


class CoursesResponse(BaseModel):
    courses_by_skills: dict[str, list[CourseResponse]]


class RecommendationStateResponse(BaseModel):
    results: RecommendationResponse
    # Empty progress and historical arbitrary preferences must survive unchanged.
    progress: dict[str, JsonValue]
    filters: dict[str, JsonValue]


class HistoryItem(BaseModel):
    id: str
    createdAt: str
    updatedAt: str
    top_profession: str
    selectedProfession: str
    results: RecommendationResponse
    progress: dict[str, JsonValue]


class HistoryResponse(BaseModel):
    items: list[HistoryItem]


class ProgressResponse(BaseModel):
    saved: bool
    persistent: bool | None = None
    progress: dict[str, JsonValue]


class FiltersResponse(BaseModel):
    saved: bool
    persistent: bool | None = None
    filters: dict[str, JsonValue]


class AccountResponse(BaseModel):
    id: str
    display_name: str
    deletion_pending: bool


class PublicFeedbackItem(BaseModel):
    id: str
    type: Literal['review', 'feature']
    title: str | None
    message: str
    rating: int | None
    created_at: str
    development_status: str | None
    roadmap_key: str | None
    developer_feedback: bool
    votes: int
    voted: bool
    display_name: str

    @field_validator('created_at', mode='before')
    @classmethod
    def iso_date(cls, value: datetime | str) -> str:
        return value.isoformat() if isinstance(value, datetime) else value


class PublicFeedbackResponse(BaseModel):
    items: list[PublicFeedbackItem]
    has_more: bool


class VoteResponse(BaseModel):
    votes: int
    voted: bool


class PreviewStatusResponse(BaseModel):
    available: bool
    remaining: int
    total: int
    provider: Literal['gemini']
    model: str | None = None


class PreviewChatResponse(ChatResponse):
    remaining: int
    provider: Literal['gemini']
