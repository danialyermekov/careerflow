from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse, RedirectResponse

from api import auth
from application import ai_trial
from core.config import BASE_DIR
from infrastructure import database

FRONTEND_BUILD_DIR = (BASE_DIR.parent / 'frontend' / 'build').resolve()
PUBLIC_PAGES = {'', 'about', 'feedback', 'changelog', 'roadmap', 'privacy', 'terms', 'contact', 'disclaimer'}
CANONICAL_ORIGIN = 'https://careerflow.live'
PUBLIC_ASSETS = {
    'robots.txt', 'sitemap.xml', 'favicon.ico', 'favicon-16x16.png', 'favicon-32x32.png',
    'favicon-48x48.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'careerflow-og.png', 'manifest.json',
}
health_router = APIRouter()
frontend_router = APIRouter()


async def indexing_and_canonical_host(request: Request, call_next):
    if request.url.hostname in {'careerflow.live', 'www.careerflow.live'} and (
        request.url.hostname != 'careerflow.live' or request.url.scheme != 'https'
    ):
        target = CANONICAL_ORIGIN + request.url.path
        if request.url.query:
            target += '?' + request.url.query
        return RedirectResponse(target, status_code=308)
    response = await call_next(request)
    path = request.url.path.strip('/')
    public = path in PUBLIC_PAGES and request.method in {'GET', 'HEAD'}
    asset = path.startswith(('static/', 'branding/')) or path in PUBLIC_ASSETS
    if (not public and not asset) or response.status_code >= 400 or {'code', 'error'} & request.query_params.keys():
        response.headers['X-Robots-Tag'] = 'noindex, follow'
        response.headers['Cache-Control'] = 'no-store'
    return response


@health_router.get('/health')
def health():
    return {'status': 'ok'}


@health_router.get('/ready')
def ready():
    with database.get_connection() as conn:
        conn.execute(database.users.select().limit(0))
        conn.execute(database.feedback.select().limit(0))
        conn.execute(database.feedback_votes.select().limit(0))
        if ai_trial.settings()[0]:
            for table in (database.ai_trial_usage, database.ai_trial_budget, database.ai_trial_ip):
                conn.execute(table.select().limit(0))
    if not auth.SUPABASE_URL or not auth.SUPABASE_PUBLISHABLE_KEY:
        raise HTTPException(503, 'Authentication is not configured.')
    return {'status': 'ready'}


def _get_frontend_asset(full_path: str) -> Path | None:
    if '..' in Path(full_path).parts or '\\' in full_path:
        return None
    candidate = (FRONTEND_BUILD_DIR / full_path).resolve()
    try:
        candidate.relative_to(FRONTEND_BUILD_DIR)
    except ValueError:
        return None
    return candidate if candidate.is_file() else None


def _public_frontend(page: str, request: Request):
    callback = {'code', 'error'} & request.query_params.keys()
    index_path = FRONTEND_BUILD_DIR / ('app-shell.html' if callback else f'{page}/index.html'.lstrip('/'))
    if not index_path.exists():
        raise HTTPException(404, 'Frontend build not found. Build frontend or run it separately.')
    return FileResponse(index_path, headers={'Cache-Control': 'no-cache, max-age=0, must-revalidate'})


@frontend_router.api_route('/', methods=['GET', 'HEAD'], include_in_schema=False)
def serve_frontend(request: Request):
    return _public_frontend('', request)


@frontend_router.api_route('/{full_path:path}', methods=['GET', 'HEAD'], include_in_schema=False)
def serve_frontend_routes(full_path: str, request: Request):
    page = full_path.rstrip('/')
    if page in PUBLIC_PAGES:
        if full_path.endswith('/'):
            return RedirectResponse(str(request.url.replace(path='/' + page)), status_code=308)
        return _public_frontend(page, request)
    if page == 'auth/callback':
        return FileResponse(FRONTEND_BUILD_DIR / 'app-shell.html',
                            headers={'X-Robots-Tag': 'noindex, follow', 'Cache-Control': 'no-store'})
    allowed = full_path.startswith(('static/', 'branding/')) or full_path in PUBLIC_ASSETS
    asset_path = _get_frontend_asset(full_path) if allowed else None
    if asset_path:
        cache = 'public, max-age=31536000, immutable' if full_path.startswith('static/') else 'public, max-age=3600'
        media_type = 'application/xml' if full_path == 'sitemap.xml' else 'text/plain' if full_path == 'robots.txt' else None
        return FileResponse(asset_path, media_type=media_type, headers={'Cache-Control': cache})
    raise HTTPException(404, 'Page or asset not found.')
