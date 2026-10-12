"""Stable Uvicorn entrypoint and composition root."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.errors import register_error_handlers
from api.schemas.responses import ErrorResponse
from api.routes import ai, community, recommendations, site
from application.runtime import Runtime
from core.config import CORS_ORIGINS
from core.security import PublicRequestLimits


def create_app() -> FastAPI:
    app = FastAPI(title='CareerFlow API', responses={
        status: {'model': ErrorResponse} for status in (400, 401, 403, 404, 413, 422, 429, 500, 503)
    })
    app.state.runtime = Runtime()
    app.middleware('http')(site.indexing_and_canonical_host)
    register_error_handlers(app)
    app.add_middleware(PublicRequestLimits)
    app.add_middleware(
        CORSMiddleware, allow_origins=CORS_ORIGINS, allow_credentials=True,
        allow_methods=['GET', 'POST', 'PUT', 'DELETE'],
        allow_headers=['Content-Type', 'Authorization', 'X-Guest-Token', 'X-Demo-Session',
                       'X-Filename', 'X-LLM-Provider', 'X-LLM-API-Key'],
    )
    app.include_router(site.health_router)
    app.include_router(recommendations.router)
    app.include_router(ai.router)
    app.include_router(community.router)
    app.include_router(site.frontend_router)
    return app


app = create_app()
