from fastapi import FastAPI, HTTPException
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError

from infrastructure.llm import safe_llm_error
from core.errors import ServiceError
from core.logging import log_failure


def llm_http_error(error: Exception) -> HTTPException:
    safe = safe_llm_error(error)
    return HTTPException(safe.status_code, {'code': safe.code, 'message': str(safe)})


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ServiceError)
    async def service_error(request, error: ServiceError):
        return JSONResponse({'detail': error.detail}, status_code=error.status_code)

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request, error):
        log_failure('Storage operation', error)
        return JSONResponse({'detail': 'Storage is temporarily unavailable.'}, status_code=503)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request, error):
        return JSONResponse({'detail': 'Invalid request fields.'}, status_code=422)
