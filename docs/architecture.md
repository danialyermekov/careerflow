# CareerFlow backend architecture

## Layout and responsibilities

```text
backend/
  main.py                       create_app() and stable main:app entrypoint
  api/
    auth.py                     HTTP identity dependencies and Supabase verification
    dependencies.py             per-app runtime and BYOK credential dependencies
    errors.py                   existing public error envelopes
    routes/
      recommendations.py        recommendation, resume, courses, history and progress
      ai.py                     preview, BYOK, SSE and binary audio endpoints
      community.py              accounts, consented feedback, votes and public roadmap
      site.py                   health/readiness, canonical/SEO rules, React assets
    schemas/
      requests.py               input validation, unchanged public field names
      responses.py              explicit public output contracts and nested DTOs
  application/
    recommendations.py          model/skill/demand/ranking/roadmap orchestration
    runtime.py                  lazy per-app resources; no models loaded at import
    ai_trial.py                 preview context privacy and provider orchestration
  domain/
    ranking.py                  weights, normalization, rounding and stable ranking
    roadmap.py                  skill gaps, category limits, framework compatibility
    skills_taxonomy.py          canonical skill names and language inference
    chat_policy.py              deterministic career-topic guard
  infrastructure/
    database.py                 SQLAlchemy Core tables and transactional persistence
    guest_sessions.py           temporary owned state, TTL and bounded capacity
    ai_trial_store.py           serialized preview allocations/budgets and leases
    llm.py                      credential-scoped Claude/Gemini provider clients
    resume_parser.py            PDF/TXT decoding and deterministic skill extraction
    ml/
      artifacts.py              disk loading and historical demand preparation
      features.py               unchanged classifier/time-series transformations
      classifier.py             classifier inference and explanation algorithms
      demand.py                 inference and weekly score cache
      skill_matcher.py          TF-IDF/cosine scoring and ranked user skills
      course_finder.py           catalog preparation, filtering and course ranking
      profile_preparation.py    offline profession-profile construction
  core/
    settings.py                 typed environment/.env configuration
    config.py                   derived artifact/data paths
    errors.py                   transport-independent public service failures
    logging.py                  safe operational failure logging
    security.py                 existing public body/rate limits
  migrations/                   unchanged Alembic revision history
  models/ and data/              existing artifacts, historical snapshots and catalog
  tests/                        unit, API, golden-output and opt-in PostgreSQL tests
ml/                             separate research environments and notebooks
frontend/                       unchanged React application and API client
```

## Dependency direction

`main` composes HTTP routers and dependencies. HTTP endpoints validate transport DTOs and resolve identity/resources; application code orchestrates plain-data operations; infrastructure loads artifacts, accesses storage and invokes providers. Domain code depends only on the standard library and the domain taxonomy. No ORM, HTTP request, Pydantic DTO or disk-loading code lives in domain ranking/roadmap rules.

Concrete dependencies are deliberate: there is one persistence implementation, so no repository interface, model registry or feature store is introduced. SQLAlchemy Core transaction semantics and private `careerflow` schema remain unchanged. Small authenticated storage operations can call persistence directly from a router; recommendation computation is isolated behind the application use case.

## Request flows

1. **Recommendation:** body/rate guard → `StudentProfile` and optional Auth/guest credential → `RecommendationService.recommend(profile)` → lazy matcher/classifier/demand/catalog → domain ranking → roadmap/courses and context → owned guest storage or transactional private history → `RecommendationResponse`. `_formData`, all score dictionaries and roadmap nesting remain unchanged.
2. **History/progress:** identity dependency → owner-scoped persistence or guest state → response DTO. Existing camelCase progress names and absent optional `persistent` markers are preserved; empty progress and arbitrary JSON preferences are opaque transport data.
3. **BYOK:** header validation without echoing secret values → owned session context → domain topic policy → request-scoped provider client → JSON or original SSE events plus `[DONE]`. Provider errors remain sanitized `{detail: {code, message}}`.
4. **Preview:** owned session → PostgreSQL budget/reservation → whitelisted context → Gemini → finalize or refund the reservation. Existing lifetime allowance, IP limits and concurrent leases remain intact.
5. **Resume:** binary body → PDF/TXT extraction → deterministic rules → explicit resume response. No model or external AI request is required.

## Configuration and startup

Install with `uv sync --locked --extra dev`; create `.env` from the example only if absent. `core.settings.Settings` uses typed Pydantic settings. Inherited environment values take precedence over `.env`, including interpolation, with no process-environment mutation. Public frontend-key fallback and legacy server-key aliases are retained; BYOK never uses server keys. Secrets are hidden in settings representations.

Paths default to the source deployment's `backend/models`, `backend/data` and `frontend/build`; override `MODELS_DIR`, `DATA_DIR` and `FRONTEND_BUILD_DIR` for a wheel-only installation. Artifacts are intentionally not bundled in the Python wheel. Run `uv run --locked python -m uvicorn main:app --host 127.0.0.1 --port 8000`. Docker's existing `main:app`, locked install, copied artifacts and frontend locations remain valid. Alembic imports `infrastructure.database`; startup never creates or migrates tables.

Importing the app creates routing/configuration objects but loads no ML artifacts and opens no database connection. `Runtime` serializes first loading and caches resources per app. `/health` remains independent of database/ML; `/ready` still checks storage and Auth configuration. Required database/Auth configuration is checked at the point of use, allowing guest-only local operation as before.

## ML preservation and compromises

- The saved classifier, preprocessors, TF-IDF objects and catalog are unchanged. Loading is separated from inference in `artifacts.py`.
- Production ranking keeps weights **0.38 / 0.35 / 0.20 / 0.07**, sum/max normalization, zero-denominator fallback, four-decimal rounding and tie ordering.
- The demand service historically fits LightGBM once at initialization against a calendar week mapped into 2023. Preparation is now explicit and separate from inference; replacing it with a different persisted estimator would change behavior. No new trained artifact was generated.
- Offline profession-profile construction is separated from runtime skill-gap calculation. Existing research notebooks/environments and apparent data/model duplicates are retained.
- API output models exclude unset fields recursively, preserving existing absent fields rather than adding null/default values. DataFrames, SQL rows and internal storage fields are not exposed.

## Verification and remaining debt

Baseline: **138 backend tests passed / 2 skipped**, **121 frontend tests passed**. Fixed-week real-artifact golden tests cover classifier/skill/demand scores, explanations, ranking and all-profession roadmap/course results for English/Russian/Kazakh. Full HTTP recommendation payloads for all **14** labeled profiles matched the original `aa4877a` server exactly, excluding generated session IDs.

Final local checks: **160 backend tests passed / 2 PostgreSQL tests skipped**, **121 frontend tests passed / 14 suites**, production frontend build/prerender/SEO checks passed for 9 public pages, Ruff passed, and Pyright reported no errors. The wheel was built and installed with locked dependencies in an isolated Python 3.13 environment; outside the source tree, import, `/health`, lazy initialization and a real artifact-backed `/recommend` passed with explicit artifact directories. CatBoost's locked dependencies already include Matplotlib, so the existing benchmark needs no additional package. Its recommendation, profiling, filtering, simulated LLM, plots and report paths passed a one-iteration smoke run writing only to the temporary directory; those timings are not a performance study.

The separate live-server suite reports **15 passed / 3 failed**: clear MLE, clear Data Analyst, and borderline Data Scientist expectations disagree with the existing artifacts. Differential baseline comparison confirms these are unchanged model-quality issues; expectations and production mathematics were not modified to hide them.

Remaining debt: guest state/rate limits remain process-local (one worker/replica); demand remains historical and initialization-fit-based; classifier explanation fallbacks retain their existing broad recovery semantics; some legacy numerical modules use coarse dictionary types. Pyright checks new seams and orchestration in basic mode; Ruff checks the whole backend. Live PostgreSQL concurrency/ownership checks require explicit disposable-Supabase opt-in. Docker image execution requires a running daemon; provider calls require configured credentials. No migrations or provider requests are executed against production during this refactor.
