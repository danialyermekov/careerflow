import json

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
from starlette.concurrency import run_in_threadpool

from api.auth import optional_user
from api.dependencies import get_llm, get_llm_credentials
from api.errors import llm_http_error
from api.routes.recommendations import recommendation_state
from api.schemas.requests import ChatRequest, TrialRequest
from api.schemas.responses import ChatResponse, PreviewChatResponse, PreviewStatusResponse, TranscriptionResponse
from application import ai_trial
from domain.chat_policy import is_career_chat_allowed, off_topic_response
from core.logging import log_failure
from infrastructure import guest_sessions
from infrastructure.llm import safe_llm_error

router = APIRouter()


@router.get('/ai/preview', response_model=PreviewStatusResponse, response_model_exclude_unset=True)
def preview_status(request: Request, response: Response, user=Depends(optional_user)):
    try:
        return ai_trial.status(request, response, user)
    except RuntimeError:
        ai_trial.error('trial_unavailable')


@router.post('/ai/preview', response_model=PreviewChatResponse)
def preview_chat(payload: TrialRequest, request: Request, response: Response, user=Depends(optional_user)):
    if request.headers.get('x-demo-session') == 'true':
        result = guest_sessions.state(payload.session_id, guest_sessions.guest_owner(request))['results']
    else:
        result = recommendation_state(payload.session_id, request, user)['results']
    try:
        key, reservation, remaining, model = ai_trial.reserve(request, response, user)
    except RuntimeError:
        ai_trial.error('trial_unavailable')
    try:
        answer = ai_trial.answer(result, [item.model_dump() for item in payload.history], payload.message, payload.lang, model)
    except Exception as exc:
        log_failure('Preview generation', exc)
        ai_trial.finish(key, reservation, refund=True)
        ai_trial.error('trial_provider_failed')
    ai_trial.finish(key, reservation)
    return {'response': answer, 'remaining': remaining, 'provider': 'gemini'}


@router.post('/chat', response_model=ChatResponse)
def chat(request: ChatRequest, http_request: Request, credentials: tuple[str, str] = Depends(get_llm_credentials),
         user=Depends(optional_user), llm=Depends(get_llm)):
    context = recommendation_state(request.session_id, http_request, user)['results']['context']
    if not is_career_chat_allowed(request.message):
        return {'response': off_topic_response(request.lang)}
    provider, api_key = credentials
    try:
        return {'response': llm.chat(context=context, history=[item.model_dump() for item in request.history],
                                     message=request.message, provider=provider, api_key=api_key)}
    except Exception as error:
        raise llm_http_error(error) from None


@router.post('/voice/transcribe', response_model=TranscriptionResponse)
async def transcribe_voice(request: Request, lang: str = 'en',
                           credentials: tuple[str, str] = Depends(get_llm_credentials), llm=Depends(get_llm)):
    content = await request.body()
    if not content:
        raise HTTPException(400, 'Empty audio.')
    provider, api_key = credentials
    mime_type = request.headers.get('content-type', 'audio/wav').split(';')[0] or 'audio/wav'
    try:
        text = await run_in_threadpool(llm.transcribe_audio, content, mime_type=mime_type, lang=lang,
                                       provider=provider, api_key=api_key)
        return {'text': text}
    except Exception as error:
        raise llm_http_error(error) from None


@router.post('/chat/stream')
def chat_stream(request: ChatRequest, http_request: Request, credentials: tuple[str, str] = Depends(get_llm_credentials),
                user=Depends(optional_user), llm=Depends(get_llm)):
    provider, api_key = credentials
    context = recommendation_state(request.session_id, http_request, user)['results']['context']

    def generate():
        try:
            if not is_career_chat_allowed(request.message):
                yield f"data: {json.dumps({'type': 'text', 'content': off_topic_response(request.lang)})}\n\n"
            else:
                yield from (f'data: {chunk}\n\n' for chunk in llm.chat_stream(
                    context=context, history=[item.model_dump() for item in request.history],
                    message=request.message, deep=request.deep, provider=provider, api_key=api_key,
                ))
        except Exception as error:
            safe = safe_llm_error(error)
            yield f"data: {json.dumps({'type': 'error', 'code': safe.code, 'content': str(safe)})}\n\n"
        yield 'data: [DONE]\n\n'

    return StreamingResponse(generate(), media_type='text/event-stream',
                             headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'})
