from fastapi import HTTPException, Request

from application.recommendations import RecommendationService
from application.runtime import Runtime
from infrastructure.llm import LLMError, validate_credentials


def get_runtime(request: Request) -> Runtime:
    return request.app.state.runtime


def get_recommendation_service(request: Request) -> RecommendationService:
    return RecommendationService(get_runtime(request))


def get_course_finder(request: Request):
    return get_runtime(request).get('course_finder')


def get_llm(request: Request):
    return get_runtime(request).get('llm')


def get_llm_credentials(request: Request) -> tuple[str, str]:
    # Read manually so validation errors never echo secret headers.
    try:
        return validate_credentials(request.headers.get('x-llm-provider', ''),
                                    request.headers.get('x-llm-api-key', ''))
    except LLMError as error:
        raise HTTPException(error.status_code, {'code': error.code, 'message': str(error)}) from None
