from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from api import auth
from api.auth import optional_user, require_user
from api.routes.recommendations import recommendation_state
from api.schemas.requests import FeedbackRequest, FeedbackVoteRequest
from api.schemas.responses import AccountResponse, DeletedResponse, PublicFeedbackResponse, SubmittedResponse, VoteResponse
from infrastructure import database

router = APIRouter()


@router.get('/account', response_model=AccountResponse)
def account(user=Depends(require_user)):
    return {**user, 'deletion_pending': database.is_deleting(user['id'])}


@router.delete('/account', response_model=DeletedResponse)
def delete_account(user=Depends(require_user)):
    if not auth.SUPABASE_SECRET_KEY:
        raise HTTPException(503, 'Account deletion is not configured. Contact contact@careerflow.live.')
    database.begin_account_deletion(user['id'])
    auth.delete_auth_user(user['id'])
    database.delete_application_user(user['id'])
    return {'deleted': True}


@router.post('/feedback', status_code=201, response_model=SubmittedResponse)
def submit_feedback(payload: FeedbackRequest, request: Request, user=Depends(optional_user)):
    if payload.website:
        raise HTTPException(400, 'Feedback could not be accepted.')
    session_id = str(payload.session_id) if payload.session_id else None
    if session_id:
        recommendation_state(session_id, request, user)
    database.save_feedback({
        'type': payload.type, 'title': payload.title, 'rating': payload.rating, 'message': payload.message,
        'public_consent': payload.public_consent, 'reproduction_steps': payload.reproduction_steps,
        'session_id': session_id if user else None,
    }, user_id=user['id'] if user else None)
    return {'submitted': True}


@router.get('/api/feedback', response_model=PublicFeedbackResponse)
def public_feedback(type: Literal['review', 'feature'] = 'review', offset: int = Query(0, ge=0, le=10000),
                    user=Depends(optional_user)):
    return database.list_public_feedback(type, user_id=user['id'] if user else None, offset=offset)


@router.put('/api/feedback/{feedback_id}/vote', response_model=VoteResponse)
def feedback_vote(feedback_id: UUID, payload: FeedbackVoteRequest, user=Depends(require_user)):
    result = database.set_feedback_vote(str(feedback_id), user['id'], payload.voted)
    if result is None:
        raise HTTPException(404, 'Feature suggestion not found.')
    return result


@router.get('/api/roadmap', response_model=PublicFeedbackResponse)
def public_roadmap():
    return database.list_public_feedback('feature', limit=100, roadmap_only=True)
