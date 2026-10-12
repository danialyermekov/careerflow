from typing import Any
from urllib.parse import unquote

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request
from sqlalchemy.exc import SQLAlchemyError

from api.auth import optional_user, require_user
from api.dependencies import get_course_finder, get_recommendation_service
from api.schemas.requests import CourseFilterPreferencesRequest, RoadmapProgressRequest, StudentProfile
from application.recommendations import RecommendationService
from infrastructure import database, guest_sessions

router = APIRouter()


@router.post('/parse-resume')
async def parse_resume(request: Request):
    filename = unquote(request.headers.get('x-filename', 'resume'))
    content = await request.body()
    if not content:
        raise HTTPException(400, 'Empty resume file.')
    try:
        from infrastructure.resume_parser import extract_text_from_upload, parse_resume_text
        return {'filename': filename, **parse_resume_text(extract_text_from_upload(filename, content))}
    except RuntimeError:
        raise HTTPException(503, 'Resume parsing is unavailable.') from None
    except Exception:
        raise HTTPException(400, 'Could not parse this resume.') from None


@router.post('/recommend')
def recommend(profile: StudentProfile, request: Request, user=Depends(optional_user),
              service: RecommendationService = Depends(get_recommendation_service)):
    guest = guest_sessions.guest_owner(request) if user is None else None
    try:
        result = service.recommend(profile.model_dump())
        result['persistent'] = user is not None
        if user is None:
            guest_sessions.save(result['session_id'], guest, result)
        else:
            database.save_recommendation_session(
                session_id=result['session_id'], user_id=user['id'], profile=profile.model_dump(),
                result_payload=result, context=result['context'],
                roadmaps_by_profession=result['roadmaps_by_profession'],
                roadmap_with_courses=result['roadmap_with_courses'],
            )
        return result
    except (HTTPException, SQLAlchemyError):
        raise
    except Exception:
        raise HTTPException(500, 'Could not generate a recommendation.') from None


@router.post('/courses/filter')
def filter_courses(skills_gaps: list[str] = Body(...), lang: str = Body('en'),
                   filters: dict[str, Any] = Body(...), courses=Depends(get_course_finder)):
    return {'courses_by_skills': courses.update_courses_by_filters(skills_gaps=skills_gaps, lang=lang, filters=filters)}


@router.get('/recommendation/history')
def recommendation_history(limit: int = Query(12, ge=1, le=100), user=Depends(require_user)):
    return {'items': database.list_recommendation_history(user_id=user['id'], limit=limit)}


@router.delete('/recommendation/history')
def clear_recommendation_history(user=Depends(require_user)):
    return database.delete_recommendation_history(user_id=user['id'])


@router.get('/recommendation/{session_id}/state')
def recommendation_state(session_id: str, request: Request, user=Depends(optional_user)):
    if user is None:
        return guest_sessions.state(session_id, guest_sessions.guest_owner(request))
    state = database.get_recommendation_state(session_id=session_id, user_id=user['id'])
    if state is None:
        raise HTTPException(404, 'Recommendation session not found.')
    return state


@router.put('/recommendation/{session_id}/progress')
def save_roadmap_progress(session_id: str, request: RoadmapProgressRequest,
                         http_request: Request, user=Depends(optional_user)):
    if user is None:
        guest_sessions.state(session_id, guest_sessions.guest_owner(http_request), progress=request.model_dump())
        return {'saved': True, 'persistent': False, 'progress': request.model_dump()}
    saved = database.update_recommendation_progress(
        session_id=session_id, user_id=user['id'], done_skills=request.doneSkills,
        category_order=request.categoryOrder, skill_orders=request.skillOrders,
        selected_profession=request.selectedProfession,
    )
    if not saved.get('saved'):
        raise HTTPException(404, 'Recommendation session not found.')
    return saved


@router.put('/recommendation/{session_id}/course-filters')
def save_course_filters(session_id: str, request: CourseFilterPreferencesRequest,
                        http_request: Request, user=Depends(optional_user)):
    if user is None:
        guest_sessions.state(session_id, guest_sessions.guest_owner(http_request), filters=request.filters)
        return {'saved': True, 'persistent': False, 'filters': request.filters}
    saved = database.save_course_filter_preferences(session_id=session_id, user_id=user['id'], filters=request.filters)
    if not saved.get('saved'):
        raise HTTPException(404, 'Recommendation session not found.')
    return saved
