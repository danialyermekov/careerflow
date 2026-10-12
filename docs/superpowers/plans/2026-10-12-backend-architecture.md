# Backend Architecture Implementation Plan

> **For agentic workers:** Use `executing-plans` to implement this plan inline, task by task.

**Goal:** Preserve CareerFlow behavior while making HTTP, recommendation orchestration, domain rules, runtime infrastructure and configuration independently understandable and testable.

**Architecture:** Keep FastAPI, SQLAlchemy Core and the existing ML algorithms. Extract focused packages without introducing repository interfaces or a new persistence model. Keep `main:app`, existing URLs, JSON fields, error envelopes and migration history compatible.

**Tech Stack:** Python 3.11–3.13, FastAPI/Pydantic, pydantic-settings, SQLAlchemy, CatBoost, LightGBM, sklearn, uv, pytest; React 18/CRA remains unchanged.

**Spec:** User's CareerFlow architecture-refactoring request in this session.

## Global Constraints
- No UI/product changes, retraining of checked-in artifacts, destructive data operations or pushes.
- Preserve ranking coefficients (0.38 classifier, 0.35 skills, 0.20 trend, 0.07 market), rounding and tie ordering.
- Preserve auth checks, guest ownership, BYOK isolation, preview budgets, sanitized validation and provider errors.
- Existing untracked agent configuration belongs to the user and is excluded from commits.
- Base is `origin/master` (aa4877a); work on `refactor/backend-architecture`.

## Audit
- `main.py` combines 23 HTTP operations, global lazy ML instances, recommendation orchestration, chat policy, persistence and SEO/static serving.
- `schemas.py` contains validated requests but no explicit output contracts.
- `config.py` mutates process environment via dotenv; AI preview reads environment separately. Artifact paths are implicit globals.
- Classifier, matcher and course constructors combine disk loading and runtime logic. Demand fits a model at initialization using the current calendar week mapped to 2023: preserve this behavior, isolate preparation rather than introducing a different saved estimator.
- `roadmap.py` combines offline profession-profile construction with runtime gap calculation. Matcher repeats skill normalization; course finder repeats roadmap/course assembly.
- SQLAlchemy Core already provides transactional private storage and Alembic migrations; retain these rather than introducing ORM/repository scaffolding. No cycle found in the runtime imports audited.
- React API client relies on snake_case recommendation fields, camelCase progress fields, `_formData`, optional `persistent` fields and `detail` as a string or `{code,message}`. Streaming and binary uploads are separate contracts.
- Research projects under `ml/` have independent environments and notebooks. Preserve datasets and artifacts, including apparent duplicates.
- Existing CI excludes live-server recommendation tests and opts out of PostgreSQL integration. Docker uses `main:app` and locked installation.
- `evaluate_speed.py` references removed demo database APIs, invalid 0–5 technical flags and obsolete chat calls. `optimize_weights.py` lacks guest credentials and duplicates an incorrect normalization formula. Repair callers without changing the production scorer.

## Review Focus
- Optional fields in stored/guest responses must not become new null/default fields on the wire.
- dotenv/environment precedence and legacy key aliases must remain usable without leaking secrets.
- Multiple app instances and dependency overrides must not share ML instances accidentally.
- Fixed-date real artifact outputs, roadmap locale fallback and classifier explanations must remain identical.
- Packaging and migrations must resolve the same runtime files outside the source directory.

### Task 1: Characterize behavior
**Files:** `backend/tests/test_architecture_contracts.py`, `backend/tests/test_runtime_parity.py`.
**Interfaces:** Existing `main.app`, ranking and runtime ML classes; literal expected JSON fields and fixed-date golden digests.
- [x] Add exact recommendation field/ranking tests and real-artifact parity tests with a fixed demand week.
- [x] Run `uv run --locked python -m pytest --ignore=tests/test_recommendations.py`; expect existing behavior plus characterization tests to pass.
- [x] Commit `test: characterize recommendation and API contracts`.

### Task 2: Separate runtime responsibilities
**Files:** `backend/api/`, `backend/application/`, `backend/domain/`, `backend/infrastructure/`, `backend/core/`, `backend/main.py`, existing runtime callers/tests, `backend/pyproject.toml`.
**Interfaces:** `create_app()` returns isolated FastAPI apps; `get_*` dependencies use per-app lazy resources; recommendation use case consumes plain profile mappings and explicit runtime dependencies, returns the existing payload. Domain ranking and roadmaps remain framework-independent. Infrastructure owns SQLAlchemy, auth integrations, model/catalog loading and providers.
- [x] Add failing tests for isolated app factories, declared response schemas and injectable runtime dependencies.
- [x] Extract routers and application recommendation pipeline; move domain/infrastructure implementations and update all callers.
- [x] Separate artifact loading from inference; reuse normalization and roadmap assembly without altering operations/order.
- [x] Run characterization and full backend tests; expect preserved digests/contracts.
- [x] Commit `refactor: separate API application and runtime layers`.

### Task 3: Typed settings and API models
**Files:** `backend/core/settings.py`, `backend/api/schemas/`, `backend/.env.example`, `backend/pyproject.toml`, `backend/uv.lock`, relevant tests.
**Interfaces:** `Settings` loads typed env/dotenv values without mutation; preview settings retain invalid-config disable behavior; request and response DTOs are separate. Stable endpoints declare response models, excluding unset optional fields.
- [x] Add failing env precedence/alias/path tests and response validation tests.
- [x] Implement settings and DTOs; retain existing input constraints and error envelope.
- [x] Add focused Ruff/Pyright configuration for refactored code, preserving existing tooling.
- [x] Run settings tests, full backend suite, Ruff and Pyright; commit `refactor: centralize settings and API contracts`.

### Task 4: Integration, tools and documentation
**Files:** maintainer/evaluation scripts, CI, README files, `docs/architecture.md`.
**Interfaces:** Existing `main:app`, Alembic metadata, Docker locked installation and React API calls remain compatible.
- [x] Repair obsolete script callers and verify real scorer reuse with meaningful tests.
- [x] Run backend suite, frontend tests/build, live-server recommendation tests and package installation checks; run Docker checks if available (daemon unavailable; live-suite failures documented below).
- [x] Document final structure, data flows, setup, decisions and remaining debt.
- [ ] Commit checked tools/docs changes separately; report unavailable checks explicitly.

## Execution ledger
- Baseline: backend 138 passed / 2 PostgreSQL tests skipped; frontend 121 passed (14 suites).
- Ruling: use existing working directory with user permission; preserve untracked agent files.
- Ruling: use `uv run python -m pytest` on this Windows environment because the relocated executable launcher references an obsolete directory.
- Ruling: preserve historical demand initialization fitting; exporting a new estimator would change the date-dependent behavior and exceed architectural scope.
- Completed commits: `9d70683` characterization; `66c4795` runtime/API separation; `e1adb26` settings and typed public contracts.
- Final regular suite: 160 passed / 2 skipped; frontend: 121 passed / 14 suites. Production frontend build, prerender and SEO checks passed (9 public pages). Ruff and Pyright passed.
- Live recommendation suite: 15 passed / 3 failed (clear MLE, clear Data Analyst, borderline Data Scientist). All 14 profile response payloads match original `aa4877a` exactly except generated session IDs, confirming unchanged model-quality issues.
- Review caught dotenv interpolation precedence differing from `load_dotenv(override=False)`. Regression test failed before the custom source and passed afterward; inherited variables again take priority without process-environment mutation. README migration import fixed.
- Tools: optimizer uses production ranking and guest credentials; benchmark uses valid profile flags, lazy per-app dependencies and guest storage. One-run end-to-end, profiling, filtering, simulated LLM, plot and report smoke passed; generated output remains outside the repository.
- Packaging: wheel built and installed with exported locked dependencies in an isolated Python 3.13 environment. Dependency check, import outside the source tree, lazy `/health` and real `/recommend` passed with configured artifact paths. Initial offline unrestricted resolution lacked cache metadata; locked installation succeeded.
- Cleanup: generated egg-info tracking removed without deleting local files; backend build output ignored; requested architecture document explicitly included under the otherwise ignored docs tree. Data, models, migrations and research projects preserved.
- Unavailable checks: Docker daemon, opt-in disposable PostgreSQL, real provider/OAuth flows and hosted GitHub CI. No production migrations or provider calls performed.
- Remaining changes are verified working-tree changes. Additional commits require explicit user authorization under the higher-priority tool policy; no push or merge performed.
