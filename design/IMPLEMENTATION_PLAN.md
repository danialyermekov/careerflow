# CareerFlow — Editorial Minimalist Frontend Migration Plan

**Status:** plan approved; Stage 5 implemented with focused tests and production-build verification. Stopped for user review before Stage 6. Comprehensive browser/visual acceptance is deferred to Stage 8. Execution evidence is recorded below; the original audit describes the pre-implementation state.

**Audit date:** 2026-10-12.

**Source branch:** `feat/ui-redesign`; remote default branch: `origin/master`.

## Scope and evidence

Migrate the presentation of seven approved views: Landing Page, Profile & Skills, Best Match, All Professions, Learning Roadmap, History & Feedback, and the open AI Advisor drawer. Keep the current recommendation, scoring, course, account, localization, feedback, and AI behavior authoritative.

The export directory is **`design/`**. This report is saved alongside the exports at **`design/IMPLEMENTATION_PLAN.md`**. The original exports must not be moved, renamed, or modified.

This analysis used the local HTML, PNG, and Markdown exports, application source, schemas, tests, README, and CI configuration. HTML was parsed as text, without executing its remote scripts or loading its remote fonts. Google Stitch and Stitch MCP were not accessed; no additional design assets were downloaded.

Only this report is produced in this phase. All implementation paths below are future work after approval. No dependencies, application files, backend logic, ML artifacts, datasets, or API contracts are to change as part of this planning phase.

**Evidence labels:** “observed” means present in a local export or repository file; “proposed” means a migration decision needing approval; “unknown” means the local material does not establish it. Screenshot dimensions are image dimensions, not verified viewport dimensions. Runtime behavior was inspected in source and tests, not exercised against live services.

## A. Design Asset Inventory

### A1. Approved view mapping

Each directory below contains exactly one `code.html` / `screen.png` pair.

| Approved view | Local directory | PNG dimensions | Primary layout evidence | Current application mapping |
| --- | --- | --- | --- | --- |
| Landing Page | `design/hero/` | 310 × 1600 | Editorial hero, four-step explanation, product preview, scoring explanation, seven career tracks, provenance/privacy section, closing CTA | `frontend/src/pages/Hero.jsx` and `Hero.module.css` |
| Profile & Skills | `design/profile form/` | 1027 × 1600 | Academic background, skill chips, resume upload, technical knowledge flags, soft-skill assessment, reset/submit actions | `frontend/src/pages/Form.jsx` and `Form.module.css` |
| Best Match | `design/results/careerflow_best_match_refined/` | 1408 × 2192 | Result navigation, selected-career summary, weighted architecture, calculation inspector, bars/radar/gap controls | `frontend/src/pages/Results.jsx`, `tab === 'best'` |
| All Professions | `design/results/careerflow_all_professions_refined/` | 1408 × 1797 | Seven-career comparative ranking, five sort controls, selected-career breakdown and roadmap CTA | `Results.jsx`, `tab === 'all'` |
| Learning Roadmap | `design/results/careerflow_learning_roadmap_refined/` | 977 × 1600 | Progress, dependency diagram, compact filters, collapsible skill/course groups | `Results.jsx`, `tab === 'roadmap'` |
| History & Feedback | `design/results/careerflow_history_feedback_refined/` | 1408 × 1410 | Recommendation history, inspect/clear actions, feedback type/rating/message/public-consent form | Existing history tab in `Results.jsx` plus `frontend/src/components/Feedback.jsx` |
| AI Advisor — open drawer | `design/results/careerflow_ai_advisor_drawer_refined/` | 1600 × 1425 | Backdrop, preview/BYOK switch, quota, suggestions, transcript, consent and composer | Existing advisor in `Results.jsx`, `FreePreview.jsx`, and `LLMSettings.jsx` |

Total inventory: **7 HTML files, 7 PNG files, 3 Markdown specifications**. No standalone font files, icon package, alternate dark export, or additional image assets were found in these exports. Do not infer missing variants from directory names.

### A2. Shared specification and duplicates

- `design/hero/DESIGN.md`
- `design/profile form/DESIGN.md`
- `design/results/editorial_career_guidance/DESIGN.md`

All three have the title/name **Editorial Career Guidance**, are 9,903 bytes, and are byte-identical. SHA-256: `3b764dbe43e369297bc0bd6e41420e06c899123ede2eae173bd2957ed9196619`.

These are duplicate copies of one specification, not three independent revisions. Keep all copies intact. There is one candidate per requested view and no locally evidenced Modern Product or Premium Dark set; those styles are outside the approved identity.

### A3. Export limitations

- Every HTML export depends on remote Tailwind CDN, Google Fonts, and Material Symbols. These are export dependencies, not dependencies to add to the application.
- Profile HTML implements a standalone prototype with DOM manipulation and sample defaults. Results HTML contains illustrative interactions and hardcoded data. These scripts are not production implementations.
- Best Match's exported view switches primarily alter active styling; the real app already renders actual chart modes. Preserve those charts rather than transplanting prototype scripts.
- Exports globally hide scrollbars and restrict overscroll. Do not copy those rules into the app; scrolling, keyboard access, and visible content must remain usable.
- AI PNG shows a drawer beginning below the header/results navigation and an older-looking result background with unsupported metrics. Its HTML declares a full-height `fixed top-0 right-0` drawer, `sm:w-[440px]`, and `shadow-2xl`. This is an internal reference conflict, not evidence of an approved alternate results design.
- No comprehensive loading, failure, empty, auth-transition, mobile-drawer, or reduced-motion reference set is supplied. Those states must follow the current app and explicit responsive acceptance criteria.

## B. Design System Analysis

### B1. Identity and reference precedence

Observed shared intent: warm paper-like canvas, carbon text, Newsreader editorial headings, Plus Jakarta Sans UI, disciplined whitespace, thin separators, restrained blue/amber/green signals, solid data bars, and quiet surface contrast. Avoid neon, glass-heavy panels, decorative gradients, exaggerated shadows, and gamified claims.

**Proposed precedence:** preserve real behavior/content first; use the approved PNG for composition; use its HTML for measurable layout clues; use the shared specification for missing states. Where they disagree, record a decision before setting global tokens. Do not combine competing palettes opportunistically.

### B2. Color audit and proposed canonical roles

The specification's YAML and prose are not internally consistent. Most result/hero HTML repeats the YAML; Profile overrides several tokens and uses additional literal colors.

| Semantic role | YAML / usual export configuration | Specification prose / observed exception | Proposed canonical light value, pending approval |
| --- | --- | --- | --- |
| Canvas | `#f9f9f8` | Prose `#FBFBFA`; Profile body `#FAF9F6` | `#FBFBFA` |
| Focal card | `#ffffff` | Prose `#FFFFFF` | `#FFFFFF` |
| Nested surface | `#f3f4f3` | Prose `#F4F4F1`; Profile token `#f4f4f2` | `#F4F4F1` |
| Carbon text / primary action | Text `#1a1c1c`, primary `#000000` | Prose and Profile `#111418` | `#111418` |
| Secondary text | `#45474a` | Prose `#4B5262`; Profile `#5a5d62` | `#4B5262` |
| Muted text | No single matching YAML role | Prose `#6B7280` | `#6B7280`, subject to contrast check |
| Hairline border | `#c5c6cb` | Prose and Profile `#E4E4DE` | `#E4E4DE` for separators; stronger border for controls if required |
| Interactive accent | Secondary `#0051d3`, container `#346ced` | Prose `#185ADB`; Profile secondary is carbon | `#185ADB` |
| Gap / developmental status | Tertiary container `#2f1500`, on-container `#c76c00` | Prose `#D97706`, pale `#FEF3C7` | Prose amber family; verify text contrast before adoption |
| Completed / strong signal | Not a dedicated YAML success family | Prose `#15803D`, pale `#DCFCE7` | Prose green family; completion means self-marked, not externally verified |
| Error | `#ba1a1a`, container `#ffdad6`, on-container `#93000a` | No conflicting production requirement | Preserve this error family with readable labels |

The YAML also defines container tiers `#eeeeed`, `#e8e8e7`, `#e2e2e2`, surface-dim `#dadad9`, and numerous inverse/fixed roles. There is no need to import the entire Material-style palette: implement only roles the actual UI uses. The proposed prose palette is a recommendation, not a claim that it exactly reproduces every PNG.

Use existing CSS custom-property names in `index.css` where they represent the same role. Map semantic uses of existing accent/surface/text/border tokens rather than replacing every occurrence with a literal color. Audit chart constants, inline styles, `beta.css`, and CSS Modules separately: global token changes alone will not remove current blue/purple chart styling or dark panel overrides.

### B3. Typography

| Role | Observed specification size / line-height | Weight / tracking | Migration use |
| --- | --- | --- | --- |
| Display | 3.5rem / 4rem; mobile 2.25rem / 2.75rem | Newsreader 400; −0.02em / −0.015em | Landing headline; reconcile hero's actual 42/54/62px HTML sizes before approval |
| Large heading | 2.5rem / 3rem; mobile 1.75rem / 2.25rem | Newsreader 400; −0.015em / −0.01em | Page and career titles |
| Medium heading | 1.75rem / 2.25rem | Newsreader 500; −0.01em | Section headings |
| Small heading | 1.25rem / 1.75rem | Newsreader 500 | Card headings |
| Body large / normal / small | 1.125rem / 1.75rem; 1rem / 1.5rem; .875rem / 1.25rem | Plus Jakarta Sans 400 | 16px minimum for sustained reading; small size for short metadata |
| Label | .875rem / 1.25rem; small .75rem / 1rem | Sans 600; .01em / .04em | 14px normal controls; 12px only short badges/captions, not long explanations |
| Numeric | 1rem / 1.5rem | Sans 600; .02em | Tabular numerals for scores, weights, rankings, quota and progress |

Font assets are not bundled in `design/`. Export URLs specify Newsreader 400–600 and italic 400 in results, with fewer weights in Profile; Plus Jakarta Sans 400/500/600/700. Actual Cyrillic/Kazakh coverage and font availability were not verified. Before implementation, approve whether to use an already available font source or readable system serif/sans fallbacks. Do not silently download fonts or add a network-font requirement. Verify EN/RU/KK glyphs, fallback metrics, line wrapping, and layout shift before capturing final baselines.

Material Symbols are an export icon font. Reuse the app's existing inline SVG icons and branding assets instead of importing this font or an icon library. The exported arrow-square wordmark is not the app's current brand asset; a logo replacement requires separate approval.

### B4. Spacing, geometry, and surfaces

- Observed spacing tokens: 4, 8, 16, 24, 32px; desktop margin 48px, mobile margin 20px; gutter 24px / mobile 16px.
- Prose layout: desktop ≥1024px, 12-column concept, max 1280px, 48px margins; tablet 768–1023px, 32px margins/16px gutters; mobile <768px, 20px margins and stacked content; reading width capped at 680px.
- HTML uses `max-w-7xl`, `max-w-5xl`, `max-w-4xl`, `max-w-2xl`, `sm/md/lg` utilities, and a 64px landing header. These give clues, not a requirement to install Tailwind or turn every page into an explicit 12-column grid.
- Radius conflict: YAML defines 4/8/12/16/24px; HTML config defines default 4px, lg 8px, xl 12px; prose says controls 8px, cards 12px, pills fully round. **Propose semantic control=8px, card=12px, pill=9999px**, using existing radius variables where possible.
- Prose controls: buttons and text inputs 44px high; cards 24px padding, 32px on larger screens; chips 28px; bars 8px. Treat these as targets; content must grow rather than be clipped at 200% zoom or with long translations.
- Base/cards are flat, with 1px dividers. Prose overlay shadow: `0 8px 24px -4px rgba(17,20,24,.06), 0 2px 6px -1px rgba(17,20,24,.03)`. This conflicts with the drawer's `shadow-2xl`; prefer restrained overlay depth after the drawer geometry is approved.
- Focus target: visible 2px blue ring with 2px offset. Preserve labels, error associations, disabled/loading states, and non-color status indicators. Check contrast rather than assuming every pale exported color is accessible.

### B5. Responsive and interaction rules to approve

Proposed behavior for missing responsive states: stack result summary and breakdown on narrow screens; wrap or horizontally scroll the results navigation without page overflow; wrap filters; keep long career names/course titles readable; allow wide data tables to scroll inside their own container. Do not hide core features to match a cropped export.

Drawer proposal: use the existing advisor as a modal-style overlay on narrow screens, with independently scrolling content and reachable composer/close control; desktop geometry remains an approval question because PNG and HTML conflict. If background is modal/inert, implement focus containment, Escape, focus return, and scroll restoration accordingly. Do not put `aria-modal` on a panel while leaving its background operable. Preserve current chat resizing where supported; constrain it safely on small screens.

Replace presentation-heavy page scale/blur transitions with restrained movement only after approval; respect `prefers-reduced-motion`. Tab/accordion changes must retain focus and data. No generated chart or transcript animation may obscure actual values.

## C. Existing Architecture Summary

### C1. Frontend and navigation

- React 18.3.1 and ReactDOM 18.3.1 are locked; manifests permit `^18.2.0`. CRA `react-scripts` 5.0.1, Framer Motion 10.18.0, and Supabase JS 2.117.3 are installed in the lockfile. Application code is JS/JSX with CSS Modules; installed TypeScript 4.9.5 does not make this a TypeScript app.
- `frontend/src/index.js` mounts `App` under StrictMode. `App.jsx` composes App/Auth providers, owns recommendation/loading/error/demo/advisor-entry state, and lazy-loads `Results.jsx`.
- Routing is custom hash/path handling, not React Router. Preserve `/#profile`, `/#results/{session_id}`, login/account hashes, direct result reload, popstate/hashchange behavior, and OAuth callback restoration.
- Public pages include `/about`, `/contact`, `/privacy`, `/terms`, `/disclaimer`, `/feedback`, `/changelog`, `/roadmap`. **`/roadmap` is the public product roadmap**, not the results learning roadmap. The four results tabs should remain views within the current result route.
- `Navbar.jsx`, `BrandLogo.jsx`, and `Footer.jsx` already provide shared navigation, language/account controls, branding, public links and privacy-related UI. Footer imports `Hero.module.css`; landing CSS changes can affect every page.
- `AppContext.jsx` owns theme, translations, and public LLM provider metadata. Theme defaults to dark and persists the user's choice. Existing dark/light switching is a feature absent from the exports: preserve it until an explicit default/retention decision is approved, without adopting the rejected Premium Dark experiment.
- EN/RU/KK localization is composed through `i18n.js`, `betaI18n.js`, `productI18n.js`, and `experienceI18n.js`; the UI label KZ maps to language code `kk`.
- `index.css` owns global tokens/shell; `beta.css` styles shared public, feedback and preview UI; pages/components use CSS Modules. No framework or styling-system replacement is needed.

### C2. State and existing results capabilities

`Results.jsx` is approximately 3,203 lines and contains presentation helpers alongside shared state/effects. It owns active tab/profession, sorting, chart mode, tour, completion/order, filters, persistence status, course modal, history, PDF, and BYOK advisor state. The redesign must not duplicate these sources of truth in extracted panels.

Reusable helpers already include `ScoringFormulaHeader`, `ProfessionBarsChart`, `MultiProfessionRadar`, `SkillGapComparison`, `SkillGapRadar`, `MetricBars`, `ProfScores`, `ScoreCircleGrid`, `ExplainabilityPanel`, `SkillImpactChart`, `CourseFilters`, `CourseCard`, `CourseModal`, `RecommendedCoursePanel`, and `SkillDependencyTree`. Some can stay local initially; extraction is justified by a real screen boundary, not by creating a generic chart framework.

Existing result controls support bars/radar/gap modes, five sort keys (`score`, `skill`, `profile`, `trend`, `market`), alternative career selection, course filtering, category/skill reordering, completion, result saving/history restoration, new analysis, copy controls, PDF export, voice/transcription, speech playback, advisor resize, and guided demo. Keep these reachable even where a mockup omits them.

Progress payload is **skill-based**: `doneSkills` contains `category::skill` keys; `categoryOrder`, `skillOrders`, and `selectedProfession` also persist. Filters have a separate saved payload. State loads before debounced writes; load failure must never overwrite saved state with empty defaults. Existing `Results.test.jsx` checks that protection.

`getCourseProviderUrl` is exported from `Results.jsx` and tested. Preserve its export and direct/search fallback behavior if related presentation moves. Do not break existing callers merely to reorganize files.

### C3. Authoritative contracts and service boundaries

| Flow | Existing frontend integration | Contract / invariant to preserve |
| --- | --- | --- |
| Recommendation | `getRecommendation` → `POST /recommend` | `StudentProfile`, server-generated session/result, actual `scoring_weights`, `_formData`, `persistent`; demo stays guest-owned |
| Resume | `parseResume` → `POST /parse-resume` | File body/content type/encoded filename; show parsed suggestions and loading/error; processing involves backend |
| Reload / history | `GET /recommendation/{id}/state`, `GET/DELETE /recommendation/history` | Owner-scoped results/progress/filters; account history, not fabricated browser history |
| Progress | `PUT /recommendation/{id}/progress` | Existing keys and skill-level completion; readiness gate and debounce |
| Filter preferences | `PUT /recommendation/{id}/course-filters` | Existing preference object; no schema/key rewrite |
| Course results | `POST /courses/filter` | `skills_gaps`, filters, language; no invented certificate classes/durations |
| BYOK chat | `POST /chat/stream` and existing `/chat` helper | Session context, role/content history, language/deep flag, SSE chunk parsing, abort/error handling, provider/key headers |
| Voice | `POST /voice/transcribe` | Existing provider capability, binary audio, cancellation and browser permission/error states |
| Free preview | `GET/POST /ai/preview` | Explicit consent, cookie/auth/guest ownership, server availability/quota/model, bounded messages/history; separate from BYOK |
| Feedback | `POST /feedback` | Review/feature/bug types, validation/rating/bug steps, honeypot, session ownership, explicit public consent |
| Public community / account | Existing public feedback/vote/roadmap and account APIs | Preserve public routes, verified identity, vote counts, account deletion and auth cleanup |

Profile validation remains: skills max 200 entries, each 1–200 characters; field of study 1–120; GPA 2–4; 11 tech fields use 0/1; five soft scores use 0–5; language en/ru/kk. Prototype identifiers such as `cpp`, `ml`, `cloud`, and `web_dev` do not replace production `c_cpp`, `machine_learning`, `cloud_computing`, and `web_development`.

`RecommendationResponse` supplies final/classification/skill/demand scores, weights, explanations, ranked skills, per-profession roadmaps, context and ownership/persistence metadata. `CourseResponse` has nullable title/platform/URL plus rating/reviews and optional description, level/difficulty, certificate boolean, language, price type/amount. It has no verified completion hours, accreditation tier, hiring percentile, salary, or guaranteed availability field.

### C4. Scoring, market context, and privacy

`backend/domain/ranking.py` defaults: classifier 0.38, skill matcher 0.35, demand trend 0.20, market share 0.07. Classifier values are normalized by sum; the other signals by their respective maxima; weighted sums are rounded to four decimals and sorted descending. `frontend/src/utils/scoring.js` reproduces display contributions through `getScoreBreakdown` and formats final points. Read weights from the response, not copied mockup constants. Do not renormalize the final score, change sort semantics, or relabel match points as career-success probability.

README and `backend/infrastructure/ml/demand.py` identify **historical 2023 weekly market observations** and current-date mapping into a 2023 week. These are not live job openings. The classifier uses synthetic educational data. Course metadata may be inferred and stale; do not advertise verified prices, currency, accreditation, freshness or distinct-course counts.

Auth uses Supabase PKCE and owner-scoped account data. Sign-out clears private browser state and BYOK settings; provider OAuth tokens are excluded from persisted SDK sessions. Guest recommendations use backend process-local owner-hashed temporary state (currently 7,200-second TTL and cap 200), not browser-only computation. Demo requests remain guest-owned even while signed in.

BYOK supports Anthropic/Gemini; keys are kept in module memory by `llmSettings.js`, not localStorage/sessionStorage or React context. Preserve `X-LLM-Provider` / `X-LLM-API-Key` handling without logging or exposing keys. Free preview has separate consent, quota, and transcript state; opening a drawer or running the guided demo must not automatically send an AI message.

### C5. Verification infrastructure

Frontend tests already use Jest, React `act`, `createRoot`, and `Simulate`; extend meaningful interaction tests in this infrastructure. No configured Playwright runner was found; do not add one as a hidden prerequisite. Existing CI uses Node 22, `npm ci --no-audit --no-fund`, `npm test -- --runInBand`, and `npm run build`. Build also runs `scripts/prerender.cjs` and `scripts/check-seo.cjs`.

Prerender directly imports Navbar, Footer and public pages and explicitly emits `data-theme="dark"`. A default-theme decision must include `AppContext.jsx` and prerender together, preserving deterministic public output, metadata and no private/service initialization during rendering. Keep private views noindex and public canonical/schema/sitemap behavior intact.

Backend CI uses Python 3.12: `uv sync --locked --extra dev`, pytest excluding `tests/test_recommendations.py`, Ruff, and Pyright. Existing suites cover API/scoring, course/localization, ownership, AI quota/errors, public feedback and auth-related behavior. No model retraining, research notebook execution, or dataset regeneration belongs to a frontend migration.

## D. Gap Analysis

### D1. View-by-view mapping

| View | Visual gap / proposed adjustment | Reuse and behavior to preserve | Reference corrections |
| --- | --- | --- | --- |
| Landing Page | Replace current decorative dark/gradient hierarchy with warm editorial sections, constrained reading width, quieter preview and aligned methodology cards | `Hero`, shared header/footer, start/demo handlers, loading/error, seven supported careers, public links and provenance | Replace “100% Client-Side Privacy” and live-data implications with truthful existing copy; demo must use real recommendation flow, not a fixed 94.3 score |
| Profile & Skills | Group existing inputs in academic/skills/technical/soft sections; consistent control heights, chips, border and error rhythm | Current Form state, skill add/remove/autocomplete, 11 flags, five ratings, GPA, resume parsing, reset/demo/submit | Keep production field keys/defaults/ranges; mockup sample GPA/skills are not user's values or `DEMO_PROFILE` |
| Best Match | Editorial selected-career header, four clear weighted signals, inspectable calculation and calmer chart frame | Active profession/rank, `ScoringFormulaHeader`, bars/radar/gap charts, explanations, AI CTA, export/save/new-analysis controls | Display server score and weights, historical demand note, distinction between top match and selected alternative; no invented confidence or percentile |
| All Professions | Consistent ranking rows/cards, aligned tabular score, responsive detail rail | All seven careers, five sort modes, selected-career details, comparison charts and roadmap navigation | Do not hardcode ordering, scores, vacancies, or skill coverage; use production Cloud Engineer/Business Analyst identifiers and translated labels |
| Learning Roadmap | Compact wrapping filters, progress summary, readable dependency section and grouped learning cards | Per-profession roadmap, real course adaptation/filtering, collapse/reorder, skill completion, persistence and modal/provider links | Course checkboxes in export must not become new per-course persisted completion; accreditation options/hours/locked progression lack matching contract |
| History & Feedback | Clear account-history section plus reusable feedback form; good mobile stacking | Real history inspect/save/clear, sign-in affordance, current Feedback validation and consent | No fabricated sample entries, “browser-only history”, or automatic publication; bug reports remain private |
| AI Advisor | Editorial drawer shell, readable mode/quota/context, transcript and sticky reachable composer | `FreePreview`, `LLMSettings`, BYOK SSE/abort/version handling, deep mode, voice/copy/playback/resize, provider-aware labels | Quota/model/provider/profile/scores from real state; no canned sample conversation, Gemini 1.5 label, inferred coursework, or no-key BYOK enablement |

### D2. Cross-cutting gaps and priorities

1. **P0 — preserve state and contracts:** move markup in small units while Results remains the state/effect owner. No replacement controller, router, persistence schema or duplicated API adapter.
2. **P0 — correct unsupported content:** truthful privacy, historical market scope, score units, real account history, self-marked learning progress, server preview quota. Distinguish genuine guest analysis from demo: specification says label every unauthenticated view “Illustrative Demo Profile”, but the app supports real guest profiles. Only `_isDemo`/actual demo sessions get that label.
3. **P1 — unify tokens and typography:** settle palette/radius/font discrepancies; remove per-page hardcoded competing colors only in touched presentation. Audit SVG fills/strokes and `BAR_COLORS` separately. Use consistent chart legends, not color alone.
4. **P1 — coherent shell:** preserve original branding and account/language/theme/public controls; use CSS to converge spacing and hierarchy. Do not duplicate navigation/footer from seven exports.
5. **P1 — complete missing states:** visible loading/error/empty/disabled/persistence states, keyboard focus, narrow screens and translations must remain functional. A screenshot-perfect populated demo is not a complete page.
6. **P2 — restrained motion:** align existing Framer Motion use and reduced-motion behavior without adding animation tooling.

The migration is a presentation refactor. If interaction characterization reveals an existing correctness bug, report it with a separate approval/checkpoint rather than silently changing backend logic or calling a redesign successful despite a failed integration.

## E. Proposed Component Architecture

### E1. Minimum boundary changes

Keep `App.jsx`, providers, `Hero.jsx`, `Form.jsx`, Navbar, Footer, Feedback, FreePreview, and LLMSettings in their current roles. Keep result routing and shared effects in `Results.jsx`. Extract only page-sized presentation boundaries as their migration stage arrives:

| Proposed new file | Responsibility / minimal interface | State ownership |
| --- | --- | --- |
| `frontend/src/pages/results/ResultsNavigation.jsx` | Four existing result tabs; receives active tab, labels and `onTabChange`; presentation of existing profile context can remain in Results | Tab, selected profession, tour, demo and route remain in Results/App |
| `frontend/src/pages/results/BestMatchPanel.jsx` | Career summary, formula/visualization/explanation slots and existing AI CTA; receives actual active-career data and callbacks | Score calculation, chart mode and active-career selection remain in Results/utils |
| `frontend/src/pages/results/AllProfessionsPanel.jsx` | Sort controls, real ranking and selected-career detail/roadmap action | Sorted data/selection computed once in Results using existing semantics |
| `frontend/src/pages/results/LearningRoadmapPanel.jsx` | Render real ordered skill groups, progress, filters, dependencies and courses | Completion/order/filters/load/write effects stay in Results; panel calls existing handlers |
| `frontend/src/pages/results/HistoryFeedbackPanel.jsx` | Real history and existing `<Feedback>` presentation, account/empty states | Existing load/inspect/save/clear handlers and ownership remain in Results/Auth |
| `frontend/src/pages/results/AdvisorDrawer.jsx` | Drawer shell, open/close/focus behavior, preview/BYOK mode presentation and children | BYOK stream/voice/config cancellation remains in Results; FreePreview retains its own consent/quota/conversation state |

Use narrow named props and composition for existing chart/course content; do not pass secrets or clone the entire controller into each child. Helpers used by a single panel may move with it when safe; shared helpers can stay local and be composed from Results initially. Preserve the tested `getCourseProviderUrl` export.

Reuse `frontend/src/pages/Results.module.css` for shared results styles during extraction; new child panels can import `../Results.module.css`. This avoids duplicated styles or an unrelated CSS-file migration. New CSS Modules are not required merely because a panel was extracted.

### E2. Shared visual primitives without a new UI framework

- Existing Navbar/Footer/BrandLogo are the shell; shared CSS tokens cover surface, border, text, control radius, type and spacing.
- Use ordinary semantic HTML with shared CSS classes for buttons, cards, badges and labels. Do not add a generic Button/Card/Table library for this migration.
- Reuse ScoringFormulaHeader and current SVG charts; no chart dependency or new scoring formatter.
- Reuse CourseFilters/CourseCard/CourseModal and Feedback/FreePreview/LLMSettings; no parallel implementations of course filters, feedback or AI consent.
- Keep result panels stable across layout changes. Avoid viewport-dependent component types/keys that reset selection, filter state, consent or conversation. React identity/keys determine state preservation.
- Preserve `data-tour-*` targets/slots and the real five-step GuidedTour. A hidden or moved target must not break demo navigation.
- Use existing CSS breakpoints or a small agreed set; no JS screen-size state is necessary for layout.

No new global store, network adapter, routing package, TypeScript conversion, Tailwind installation, icon/font package, or backend module is proposed. Build components only as needed by the approved screens, not as a speculative design-system platform.

## F. Step-by-Step Migration Plan

### F0. Branch, checks, and checkpoints

For the stage file lists, paths starting with `pages/`, `components/`, `context/`, or `utils/` and bare source/test filenames are relative to `frontend/src/`. `scripts/` is relative to `frontend/`; fully prefixed repository paths retain their stated location.

Current `feat/ui-redesign` is a suitable task branch. Initial working tree contains untracked user exports under `design/`; preserve them and exclude them from accidental staging. If implementation later starts elsewhere, inspect status and remote default metadata, then create a dedicated `feature/editorial-minimalist` branch from the actual default branch. Never reset/stash/discard user work or switch over unrelated changes without permission.

Do not commit, push, merge, or open a PR without explicit authorization. If commits are authorized, use one verified logical unit per stage and review actual staged content; checkpoint names below are proposed Conventional Commit subjects, not commits already made. If commits are not authorized, retain the same stage review boundaries in the working tree. Roll back a bad stage only with an agreed, non-destructive operation; never reset user exports or private data.

**Shared stage gate:** run relevant existing interaction tests after changed markup/state boundaries; run the full frontend test/build gate for cross-cutting changes and the final stage. Compare agreed screenshots and inspect console/network failures. Stop on a new regression or unresolved state/contract change; do not use subsequent restyling to conceal it.

Future setup and final frontend commands, from `frontend/` (existing lockfile only):

```sh
npm ci --no-audit --no-fund
npm test -- --runInBand
npm run build
```

Existing backend CI commands, from `backend/`, when checking the shared CI baseline/final regression environment:

```sh
uv sync --locked --extra dev
uv run --locked --extra dev python -m pytest --ignore=tests/test_recommendations.py
uv run --locked --extra dev python -m ruff check .
uv run --locked --extra dev python -m pyright
```

These are future verification instructions, not executed results. Frontend lint is handled through CRA/build configuration; there is no separate lint script to invent. Do not claim a TypeScript check for the JS app. Keep CI's existing exclusion explicit; running the excluded artifact-dependent recommendation suite requires a separately available appropriate environment, not model/data downloads during UI planning.

### Stage 0 — Approve decisions and capture the baseline

- **Files:** review this report; inspect `App.test.jsx`, `Results.test.jsx`, `scoring.test.js`, `api.test.js`, auth/AI/feedback/i18n/SEO tests and `.github/workflows/ci.yml`. No source changes needed for baseline. New source files: none.
- **Reuse:** current lockfiles, test infrastructure, real guided demo and existing mocked responses; record a sanitized result fixture only if later interaction tests need one, without fabricated production data.
- **Preserve:** all routes, contracts, score units/weights, guest/account/demo ownership, key storage and current public content.
- **Dependencies:** approve palette/radii, font sourcing/fallback, default/theme retention, branding, desktop drawer geometry and missing mobile states. Do not change application defaults until resolved.
- **Potential breakage:** unreliable screenshot comparisons if font/viewport/profile/theme/state differ; undocumented pre-existing bugs mistaken for redesign regressions.
- **Tests:** run the frontend baseline and available CI baseline; characterize guest analysis, signed-in analysis, signed-in demo, saved-result reload, progress/filter restoration and no-auto-AI behavior. Record existing failures independently.
- **Visual acceptance:** capture the current app at the agreed matrix below; map reference screenshots by composition, not assumed viewport or fixed sample numbers. Record actual data/state/theme and accepted reference deviations.
- **Checkpoint:** approved baseline + decision log; proposed subject if authorized: `docs: approve editorial migration baseline`.

### Stage 1 — Foundations and shared application shell

- **Modify:** `frontend/src/index.css`, `beta.css`, `components/Navbar.jsx`, `Navbar.module.css`, `BrandLogo.module.css`, `pages/Hero.module.css` (shared Footer selectors). Touch `App.jsx` only for agreed shell/motion adjustments. Touch `context/AppContext.jsx` and `scripts/prerender.cjs` together only if a new default theme is approved. Keep actual logo assets unchanged.
- **New files:** none; font files/network links require a separate sourcing decision, not automatic introduction.
- **Reuse:** current theme variables, Navbar/Footer/BrandLogo, inline SVGs, language/account controls and existing public-page styles.
- **Preserve:** theme preference, localization, OAuth return handling, public navigation/SEO, lazy Results boundary, sign-out remount behavior, semantic landmarks.
- **Dependencies:** Stage 0 decisions/baseline. Scope tokens so old result panels stay usable while awaiting their own migration.
- **Potential breakage:** CSS variables affect untouched pages; Footer shares Hero styles; prerender imports shell components; header height can overlap content/tour; changing only client default causes prerender mismatch/flash.
- **Tests:** full frontend test/build gate; especially branding in both themes, route/public content, Account/Login, auth and SEO tests. Keyboard/theme/language/zoom smoke checks.
- **Visual acceptance:** warm/calm agreed light canvas, consistent border/type/control tokens, original readable logo, preserved controls, no unreadable optional theme, aligned header/footer, no clipping or reduced-motion violations across public/private pages.
- **Checkpoint:** shell-only review; `refactor: establish editorial visual foundations`.

### Stage 2 — Landing Page and Profile & Skills

- **Modify:** `pages/Hero.jsx`, `Hero.module.css`, `Form.jsx`, `Form.module.css`; existing translation dictionaries only for approved copy/labels; `App.test.jsx` and `i18n.test.js` for meaningful changed interactions/copy keys.
- **New files:** none required; use existing pages rather than splitting static sections into a component library.
- **Reuse:** actual start/demo/submit handlers, `DEMO_PROFILE`, skill controls, resume parsing, shared shell, provenance/privacy copy and translation structure.
- **Preserve:** seven actual tracks, guest form, 11 tech fields, five soft ratings, GPA validation, optional defaults, add/remove/autocomplete, upload/reset, loading/error, real guided demo; no AI request on demo start.
- **Dependencies:** Stage 1. Hero shared CSS must still support Footer on all pages.
- **Potential breakage:** prototype field identifiers/defaults differ from production; export's HTML form scripts bypass React validation; section hashes could conflict with application routing; translated text can overflow fixed controls.
- **Tests:** extend existing App profile/demo tests for submit payload, resume error/loading, chip keyboard behavior and reset as needed; translation parity; full frontend build and affected tests.
- **Visual acceptance:** approved editorial landing sequence and grouped form; form values survive presentation changes; 16px reading text, clear validation/focus, wrapped chips/domains, operable upload/actions on narrow screens; truthful historical/server-processing copy and distinct real-guest/demo labels.
- **Checkpoint:** landing/profile review; `refactor: migrate landing and profile presentation`.

### Stage 3 — Results navigation, shared frame and Best Match

- **Modify:** `pages/Results.jsx`, `Results.module.css`, `Results.test.jsx`, `App.test.jsx`; translation dictionaries only for necessary approved labels.
- **New:** `pages/results/ResultsNavigation.jsx`, `BestMatchPanel.jsx`.
- **Reuse:** existing state/effects, tab keys, selected profession/rank, ScoringFormulaHeader, real bars/radar/gap/explanation helpers, GuidedTour, export/save/new-analysis/AI actions.
- **Preserve:** result session and direct route, raw/normalized/contribution distinctions, `getScoreBreakdown`/formatters, API weights/order, selected alternative semantics, tour slots, provider-aware CTA and on-history callbacks. No new API calls from render.
- **Dependencies:** Stages 1–2 and agreed result frame. Keep unmigrated tabs functional in the new shell.
- **Potential breakage:** moving helper definitions into render or changing keys remounts panels; selected alternative can be incorrectly labeled top match; chart restyling can alter perceived axes or omit missing-weight explanation; hidden actions could remove existing features.
- **Tests:** existing scoring and Results/App suites; add interactions for all three chart modes, calculation expansion, tab changes retaining selection, selected-career PDF, provider-aware drawer opening, and tour target availability. Verify same response produces identical scores/contributions before/after.
- **Visual acceptance:** coherent tabs/context, editorial summary, four aligned signals with tabular points, readable formula/raw-value inspector, clear chart legends and historical context; actions remain reachable at mobile widths. No invented score/probability/percentile or sample explanation.
- **Checkpoint:** Best Match with other tabs still usable; `refactor: migrate results frame and best match`.

### Stage 4 — All Professions

- **Modify:** `pages/Results.jsx`, `Results.module.css`, `Results.test.jsx`; relevant translations only if necessary.
- **New:** `pages/results/AllProfessionsPanel.jsx`.
- **Reuse:** existing sort keys/comparators, profession labels, comparison charts, active-profession details and select/roadmap handlers.
- **Preserve:** all seven careers, server values, stable selected career while sorting, top-match identity, score/market units, comparison functionality and learning-roadmap destination within the existing result route.
- **Dependencies:** Stage 3; no scoring/helper rewrites.
- **Potential breakage:** visually sorted rows accidentally become hardcoded ranking; comparator normalization changes ordering; card click/keyboard action navigates to public `/roadmap`; responsive rail duplicates active selection state.
- **Tests:** exercise five sorts using distinguishable values, select a non-top profession and open its roadmap; assert selection/score breakdown uses that profession across tabs and direct/history context. Continue scoring/API regression tests.
- **Visual acceptance:** aligned seven-career list with current score/rank and restrained selected state; detail rail stacks cleanly; all sorts and alternative-selection actions are keyboard-operable; no inaccessible color-only ranking.
- **Checkpoint:** ranking review; `refactor: migrate profession comparison presentation`.

### Stage 5 — Learning Roadmap and courses

- **Modify:** `pages/Results.jsx`, `Results.module.css`, `Results.test.jsx`; existing translation dictionaries as needed. Keep course URL helper export intact.
- **New:** `pages/results/LearningRoadmapPanel.jsx`.
- **Reuse:** roadmap adaptation, CourseFilters/Card/Modal, RecommendedCoursePanel, SkillDependencyTree, existing filtering requests and persistence effects, current category/skill reordering.
- **Preserve:** skill-level completion and payload keys; `stateLoaded` gate; 350ms write debounce; selected-profession roadmap; saved filters/order; locale-aware results; no-result states; direct/fallback provider links; modal close/Escape.
- **Dependencies:** Stage 4 selection semantics. If dependency appearance changes, retain the existing advisory rules: do not impose new backend gates or course eligibility rules.
- **Potential breakage:** course-checkbox prototype conflicts with skill completion; filter labels imply unsupported accreditation tiers; unavailable metadata is rendered as zero/free/verified; layout extraction resets order/filters or saves before a failed state load; filtering the course list changes the meaning of total skill steps.
- **Tests:** mark/unmark skill, reorder category/skill, change/reset filters, switch selected profession, restore saved session, simulate load/write/filter failures and empty matches. Retain “failed state loading never overwrites saved progress” and provider URL tests. Check saved payloads are unchanged; characterize cross-profession progress keys before altering any behavior.
- **Visual acceptance:** skill-based progress denominator is correct, dependency labels readable, controls wrap, empty/filter/persistence states clear, course titles/nullable metadata safe, modal usable at 200% zoom; no fabricated hours, prices/currency, accreditation or “verified competence”.
- **Checkpoint:** persistence-sensitive roadmap review; `refactor: migrate roadmap and course presentation`.

### Stage 6 — History & Feedback

- **Modify:** `pages/Results.jsx`, `Results.module.css`, `components/Feedback.jsx`, `beta.css` as needed for shared form presentation; `Results.test.jsx`, `Feedback.test.jsx`, and relevant App/FeedbackPage tests.
- **New:** `pages/results/HistoryFeedbackPanel.jsx`.
- **Reuse:** existing real account history, inspect/save/clear callbacks and Feedback component; do not duplicate the standalone public feedback page or its voting behavior.
- **Preserve:** account-only persistent history, demo exclusion, current result ownership, saved results/progress/filter restoration, feedback types/rating/bug steps/honeypot/consent/loading/error/success. Clearing history remains an intentional destructive action with the current protection/interaction, not a cosmetic remove.
- **Dependencies:** Stage 5 persistence baseline. Characterize signed-in demo feedback ownership and history-fetch failure before treating those states as verified.
- **Potential breakage:** copied mock history leaks/fabricates personal data; inspect bypasses owner-checked state fetch; public consent is prechecked/removed or applied to bugs; shared `beta.css` changes break public feedback; optimistic clear hides an API failure.
- **Tests:** authenticated/guest/demo history states, inspect preserving selected profession/progress, clear failure/success, feedback validation/submission failure and EN/RU/KK consent. Existing source collapses history-load failure into empty history and ignores some clear failures: record pre-existing behavior; any corrective logic change needs an explicitly approved checkpoint.
- **Visual acceptance:** populated history uses actual dates/careers/scores; guests get honest sign-in/temporary-session context; no sample entries in empty history; complete accessible feedback fields and visible consent/success/error; layout stacks without removing bug-specific fields.
- **Checkpoint:** history/privacy-sensitive review; `refactor: migrate history and feedback presentation`.

### Stage 7 — AI Advisor drawer

- **Modify:** `pages/Results.jsx`, `Results.module.css`, `components/FreePreview.jsx`, `LLMSettings.jsx`, `LLMSettings.module.css`, `beta.css`; relevant Results/FreePreview/LLMSettings/App tests and translations. Only presentation/accessibility changes unless behavior is separately approved.
- **New:** `pages/results/AdvisorDrawer.jsx`.
- **Reuse:** existing FreePreview and key configuration, preview/BYOK modes, safe provider errors, stream parsing, abort/version refs, copy/speech/deep/voice/resize controls, consent and server status.
- **Preserve:** no automatic message on opening/switching/demo; preview consent/quota/1000-character limit; BYOK eligibility/memory-only keys and bounded serialized history; correct session/guest/demo/auth headers; cancellation on key removal/provider change/unmount; no stale stream appended to another session. Opening/closing or responsive layout must not accidentally reset the existing controller's conversation/config state.
- **Dependencies:** approved drawer geometry/modal behavior; Stage 3 context and Stage 6 ownership characterization. Preserve FreePreview's existing local-state lifecycle; a change to conversation reset behavior is a separate explicit decision.
- **Potential breakage:** copying sample transcript presents invented advice; “Powered by Gemini” remains when Anthropic is selected; copied quota/model is wrong; drawer close remounts state unexpectedly; focus trap/background scroll affects the tour; hidden key/provider changes leave voice/SSE active; new preview suggestion behavior sends unexpectedly.
- **Tests:** existing consent/no-auto-send, quota/disabled-preview, missing/save/remove key and split-SSE/error tests; add keyboard focus/return/Escape, overlay close, blocked consent/exhausted quota, stale-stream/session handling, provider change cancellation and narrow-screen composer reachability as appropriate. Characterize existing FreePreview suggestion clicks (send only when enabled) rather than silently adopting the prototype's insert-only behavior.
- **Visual acceptance:** approved drawer placement/depth, real recommendation context, accurate mode/provider/quota, readable long transcript, explicit consent, reachable composer/close, all current optional controls available; underlying result uses the approved Best Match design rather than AI PNG's unsupported metrics.
- **Checkpoint:** advisor/security-sensitive review; `refactor: migrate advisor drawer presentation`.

### Stage 8 — Cross-screen verification and release review

- **Modify:** only defects found in touched frontend presentation/tests or approved translations; no speculative cleanup. Check `App.jsx`, global/shared CSS, public pages, `utils/seo.js`, and prerender/check scripts for regressions. New files: none required; visual artifacts are captured outside the export directories.
- **Reuse:** existing frontend/backend CI checks and browser tooling; no new test framework or provider implementation.
- **Preserve:** all documented flows/contracts, public and private SEO semantics, both existing theme settings until approved otherwise, language parity, account deletion/sign-out privacy and current feature reachability.
- **Dependencies:** all earlier stage gates, recorded design decisions and available runtime/auth/provider configuration. Unavailable live scenarios must remain explicitly unverified.
- **Potential breakage:** shared CSS on Login/Account/public/community pages; default-theme/prerender flash; browser voice/PDF differences; static screenshot success masking broken requests or persistence.
- **Tests:** full frontend test/build gate; existing backend CI in its configured environment; visual/functional/regression matrix below. Check frontend payload/schema compatibility and no secret logging/storage. Do not change backend to make redesigned mockups work.
- **Visual acceptance:** all seven screens consistent with approved Editorial identity and resolved deviations; responsive/accessibility/locale states pass; no new console/request failures; no missing original controls. Review final diff and confirm exports and backend/ML/contracts remain untouched.
- **Checkpoint:** approval-ready branch; `test: verify editorial migration regressions` only if real test changes justify a commit. Push/PR/release requires explicit authorization.

### F1. Visual acceptance matrix

Capture actual UI, not only export renders, at **390 × 844**, **768 × 1024**, and **1440 × 900**; these are proposed review viewports, not inferred export viewports. Include a 320px narrow-width overflow check, 200% zoom, reduced motion, and EN/RU/KK. Keep chosen font availability, DPR, browser, theme, animation state and fixture/profile identical for comparisons.

For every approved screen, capture its populated state and relevant loading/empty/error/disabled state. Results additionally need top vs selected alternative, each chart mode, sorted comparison, saved progress/filter restoration, modal and advisor open/closed. AI needs preview enabled/exhausted/unavailable and BYOK missing/configured/error. History needs guest/empty/populated and feedback review/feature/bug.

Compare hierarchy, alignment, reading widths, whitespace, surfaces, borders, typography, numerical alignment, legibility, focus and action reachability. Literal sample names/scores/dates are not a pixel-match requirement. Use manual browser captures/diffs with current tools; if an automated screenshot runner is later approved, stabilize fonts/animations/data first. Do not assume `toHaveScreenshot` is available in the current Jest setup.

### F2. Functional and regression matrix

| Area | Required checks |
| --- | --- |
| Entry/profile/demo | Start, valid/invalid GPA, optional inputs, skill chips, tech/soft payloads, resume success/failure, reset, real demo, all tour steps, Escape; no unintended AI request |
| Routing/auth | Direct/reloaded saved result, back/new analysis, hash/popstate, public links, login/account, PKCE callback/return route, sign-out clearing private/AI state, account deletion |
| Scoring/results | Same final scores, sum/max normalization, response weights, rounding and units; five sorts; all careers; alternatives; bars/radar/gap/formula/explanation; selected-career PDF |
| Roadmap/courses | Correct per-career gaps, skill completion/order, readiness-gated persistence, failed state load never overwrites, saved filters, locale-aware filtering, no matches, provider link fallback and course modal |
| History/feedback | Account-only persisted history, real inspect/clear, demo separation, unauthorized session rejection, review/feature/bug validation, consent/honeypot, submit failure/success and public community unaffected |
| Preview/BYOK | Server quota/availability, explicit consent, no auto-send, correct headers and bounded payload, no-key state, provider/key removal, SSE chunks/error/cancellation, voice/speech/copy/resize, key never persisted |
| Cross-cutting | Three languages and translation parity, theme preference, keyboard/tab/accordion/dialog focus, scrolling/zoom/reduced motion, public prerender/canonical/schema and private noindex, build/console/network checks |

Real external-provider, OAuth, voice-device and database scenarios need configured test environments. Mocked interaction tests establish local behavior, not proof of live-service availability. Record skips and pre-existing failures without marking those checks passed.

## G. Risks and Open Questions

### G1. Decisions required before affected implementation

| Decision | Why it matters | Recommended resolution |
| --- | --- | --- |
| Canonical palette/radii | YAML, prose, Profile literals and export utility names conflict | Approve the semantic prose-based proposal in B2/B4, then use it consistently; explicitly accept reference differences |
| Font sourcing and glyph coverage | No local Newsreader/Jakarta font files; EN/RU/KK coverage unknown | Approve available source or system fallbacks; verify glyphs/wrapping before screenshots; no automatic asset download |
| Default theme and existing toggle | App defaults dark, prerender hardcodes dark, user theme persists; exports only establish light Editorial | Decide new-user default; preserve existing preference/toggle unless removal is expressly approved; do not import rejected dark experiments |
| Branding | Exports use a different arrow-square wordmark; app has tested horizontal PNG/WebP assets | Retain current BrandLogo; approve any replacement separately |
| Desktop drawer geometry | AI HTML is top-0/full height/440px; PNG drawer starts below results navigation and shows conflicting backdrop | Approve one geometry; use approved Best Match beneath it; add explicit mobile/focus/scroll criteria |
| Missing responsive/state references | Images have different intrinsic widths and no confirmed viewport metadata | Approve proposed matrix/stacking rules rather than claim exact mobile/tablet fidelity |
| Demo label | Spec labels every guest illustrative; real guests can analyze their own profile | Show demo badge only for actual demo; disclose temporary guest behavior separately |
| Roadmap completion/certificate labels | Export implies course completion/accreditation; production persists skill steps and a certificate boolean | Keep existing contract and truthfully map labels; new course-level persistence/accreditation is separate product work |
| Preview lifecycle/suggestions | Prototype inserts prompts; current enabled suggestions send; FreePreview has local remount-sensitive transcript | Preserve current behavior during presentation work; approve any change independently |

### G2. Implementation risks grounded in current source

- **Shared Results state:** moving effects or changing keys can reset active profession, progress, filters, consent or chat and trigger writes. Keep controller ownership/readiness gates; test transitions before extracting the next panel.
- **Known history failure ambiguity:** history-fetch errors become an empty list; clear paths include ignored errors. Treat these as pre-existing integration concerns requiring characterization and an explicit correctness decision, not evidence that empty/clear states work end-to-end.
- **Signed-in demo feedback ownership:** most session APIs explicitly use guest headers for demo sessions; `submitFeedback` currently uses ordinary authorized fetch without the same demo branch. Backend feedback validates session ownership. Verify signed-in demo submission; do not silently change ownership or weaken validation during redesign.
- **Persistence identity:** completion keys are `category::skill`, not per-course or explicitly per-profession keys. Characterize alternative-selection/restoration semantics; changing them would be a data migration, beyond presentation.
- **Misleading export content:** sample scores, names, history, percentile/ramp metrics, coursework claims, Gemini model and live/browser-only descriptions are illustrative or unsupported. Use actual responses and honest current disclosures.
- **Shared CSS/prerender:** Footer's Hero CSS, global tokens, beta styles and hardcoded prerender theme affect non-exported pages. Include Login/Account/About/public feedback/product roadmap/legal routes in regression checks.
- **Security/lifecycle:** keys must remain memory-only; no provider/OAuth secrets in screenshot fixtures/logs; auth change, provider change and cancellation must stop stale work. Preserve server ownership checks and consent.
- **Course/chart truthfulness:** nullable and heuristic course metadata must not become verified claims; chart palettes must not change axes/units or make normalized values appear to be probabilities.

### G3. Audit verification and approval boundary

At report creation, `frontend/node_modules` and `backend/.venv` are absent. Application tests/build, live auth/providers, real database persistence, device voice/PDF behavior, font rendering and exact viewport reproduction were **not run**. Existing checks and expected acceptance are documented above; no pass is claimed for future implementation.

Planning checks completed: all A–G sections and seven screen mappings present; all nine stages (0–8) include files/reuse/integrations/dependencies/breakage/tests/visual gates; Git shows only this report added alongside the pre-existing untracked exports, with no tracked or staged changes; SHA-256 comparison confirms all 17 export files match the pre-write audit baseline. Report verification does not replace runtime verification.

**Approval boundary:** creating this document did not authorize implementation. Subsequent user approval authorized Stages 0–2 and their verified local checkpoints, then **Stage 3 plus shared typography-only branding and one verified local commit**. Continue one reviewed stage at a time; preserve user assets and existing behavior. Stage 4, push, merge and PR remain subject to further authorization.

## Execution record — Stage 0 and Stage 1 (2026-10-12)

### Approved decisions and scope

- Canonical initial light identity: warm paper canvas, carbon text, restrained accent/status families, Newsreader headings and Plus Jakarta Sans UI with explicit system fallbacks. Validate contrast rather than copy conflicting export literals.
- New users start light. Preserve saved light/dark preferences and the existing toggle, coordinating pre-React HTML, provider initialization, CSS, prerender and browser theme-color metadata.
- Retain existing horizontal brand assets until the approved wave asset is identified. Their white lettering now sits on carbon; no generic export logo replaces them.
- Future advisor geometry is a desktop right-side drawer around 440–480px, with accessible mobile behavior and approved Best Match beneath it. No drawer work belongs to these stages.
- Work remained limited to shared foundations/header. No landing/profile/results layout migration, backend/ML/contracts, dependency versions, invented data or new product behavior was introduced.

### Stage 0 — Baseline and isolation

- Continued the existing isolated `feat/ui-redesign` worktree from approved-plan commit `ffb0050` (`Implementation plan`). Initial tracked/staged state was clean; the 17 original export files were already untracked user assets.
- Installed locked dependencies with `npm ci --no-audit --no-fund` in `frontend/`: 1,310 packages; manifest and lockfile unchanged. Environment: Node v22.22.2, npm 10.9.7.
- With `CI=true`, `npm test -- --runInBand` passed **14 suites / 121 tests**. `npm run build` passed compilation, **9 public prerenders** and SEO artifact checks. No baseline test/build failures. Existing output included dependency deprecations, Node's `punycode` warning and Results CourseFilter debug logs.
- SHA-256 snapshots covered all **17 exports / 2,729,692 bytes**; the final comparison confirms every byte/hash unchanged. Original exports remain outside the task commit.
- The parallel `careerflow-azure-cd` worktree was inspected read-only: initially `feat/azure-cd` at `6a7be24` with its pre-existing changes; final observation clean at `c5f83a6` after independent CI/CD progress. No modifying command or task file change was made in that worktree or `.github/`.

### Stage 1 — Shared foundations

- `frontend/src/index.css`: semantic light/dark surfaces, text, primary/accent/status families, strong control borders, 4/8/16/24/32 spacing, 1280px content width, 8/12px control/card radii, pill radius, restrained shadows, editorial heading/UI stacks, tabular control numerals and visible focus. Dark retains its prior palette; the decorative shell grid is hidden only in light.
- `frontend/public/index.html` and `frontend/src/context/AppContext.jsx`: deterministic light default, normalization of invalid preferences, safe blocked-storage handling, saved-theme prepaint bootstrap and synchronized theme-color. Fonts reuse the existing Google Fonts loading mechanism with `display=swap`; no dependency was added.
- `frontend/scripts/prerender.cjs` and `frontend/scripts/check-seo.cjs`: remove the forced-dark prerender and assert light default metadata for public pages/private shell while retaining existing SEO checks.
- `frontend/src/components/Navbar.jsx` and `Navbar.module.css`: flat shared header, max-width alignment, 44px controls, labeled theme state/language group, visible keyboard focus and wrapped sticky-in-flow mobile navigation. Existing brand/home, feedback, account, language and theme actions remain wired.
- `frontend/src/components/BrandLogo.module.css` and `frontend/src/beta.css`: carbon backing for the unchanged wordmark, shared public-form control foundations and footer width alignment.
- `frontend/src/context/AppContext.test.jsx` and `frontend/src/publicTheme.test.js`: focused preference/remount/locale/blocked-storage/prepaint tests. `frontend/src/App.test.jsx` explicitly seeds the saved dark preference for its existing two-theme brand/navigation test.

### Verification and review evidence

- TDD characterization: the new focused checks initially produced **8 failures / 3 passes**, exposing the old dark/invalid defaults and missing pre-React saved preference. Final frontend gate after the contrast fix: **16 suites / 132 tests passed** with `CI=true npm test -- --runInBand`.
- Final `CI=true npm run build`: successful compilation, **9 public pages prerendered**, SEO artifact checks passed. No new test/build failure; the pre-existing warning/debug output remains.
- Browser production-build shell matrix covered **EN/RU/KK × light/dark** at **1440×900, 768×1024, 390×844 and 320×844**. Header actions remained visible/reachable without horizontal clipping/overflow. Saved preferences and real language/theme controls were exercised.
- Shared-shell spot checks covered `/about/`, `/#login` and untouched `/#profile`; no horizontal overflow. Profile heading remained below the desktop header; existing inputs/upload and footer remained present. Keyboard Tab showed a visible 2px outline on the feedback action.
- Review reported **no Critical/Important findings** and one Minor muted-text contrast issue. It was reproduced at **4.39:1** (`#6B7280` on `#F4F4F1`) and fixed once in the shared light token to `#686F7C`. Fresh rebuilt-browser checks show **4.59:1** on the nested surface, **4.88:1** on canvas and **5.06:1** on white; primary/secondary/accent text also exceed 4.5:1 across these surfaces. Control border on white measures **4.49:1**. Decorative amber stays `#D97706`; small warning ink uses `#9A4E00` for readability.
- Google Fonts CSS advertises Latin/Latin-ext/Vietnamese for Newsreader, and additionally Cyrillic-ext for Plus Jakarta Sans, but neither supplies complete basic Cyrillic coverage. RU/KK use Georgia/Times/system serif and Segoe UI/Arial/system sans where required. With the remote font stylesheet removed and **zero webfont faces**, all six locale/theme combinations still fit the 320px navigation; Kazakh glyphs were visually inspected.
- A **200% root text-size simulation** at 320px retained reachable unclipped controls. This is not actual browser 200% zoom. The existing reduced-motion CSS guard was inspected; OS preference emulation and Framer Motion runtime behavior were not verified.
- Browser console checks showed no warnings/errors in the checked production-shell states; earlier font/style requests succeeded. Screenshots were saved only in the approved temporary directory, including desktop light EN, mobile dark KK and font-fallback KK captures; no new report/artifact folder was added to the repository.
- Scoped diff and whitespace checks passed. Backend, ML, `.github/`, dependency manifests/lockfile, page-layout sources, translation files and utility/API sources remain unchanged. All 17 original export hashes passed the final integrity comparison.

### Remaining differences and review boundary

- This is the shared foundation checkpoint. Landing/profile/results layouts, page-specific spacing/graphics and complete seven-screen fidelity await their approved stages. The existing wordmark plaque remains until wave branding is supplied; unsupported Cyrillic glyphs use system fonts and may differ visually across platforms.
- Actual browser 200% zoom, reduced-motion runtime emulation, backend tests and live OAuth/database/provider/voice/PDF flows were not run for this frontend-only stage. Existing mocked frontend integration tests passed; they do not establish live-service availability. Pre-existing history/feedback concerns in G2 remain documented for later approved work.
- **Stop here for Stage 1 review. Do not start Stage 2 or push, merge or create a PR without further user authorization.**

## Execution record — Stage 2 (2026-10-12)

### Authorization, decisions and implementation

- Subsequent approval authorized **Stage 2 only**, using the existing approved local landing/profile PNGs and Stage 1 foundations, with tests/build, browser comparison, scoped review and one verified local commit. Continued the existing isolated `feat/ui-redesign` worktree from `201bbea` (`feat: add editorial UI foundations`); tracked/staged state was clean at the Stage 2 checkpoint.
- `frontend/src/pages/Hero.jsx` and `Hero.module.css`: centered Newsreader hero with the exact English headline **“A rigorous, auditable compass for your career in technology.”**, aligned live-demo/methodology actions, four-step process, product preview, four scoring signals, seven actual career tracks, dataset/privacy cards, roadmap sequence and carbon closing CTA. Existing start/demo/loading handlers remain authoritative. Section navigation scrolls and focuses its destination without changing the hash router or making a recommendation request.
- The preview uses **actual `DEMO_PROFILE` inputs**, explicitly labels its ranking as uncomputed, and directs users to the real demo for calculated results. It does not invent scores, confidence, market badges, skill gaps or courses. Historical **2023** vacancy data, synthetic classifier profiles, server processing and temporary guest ownership remain explicit; unsupported live-market, browser-only and verified-competence claims from the exports were not copied.
- `frontend/src/pages/Form.jsx` and `Form.module.css`: centered single-column academic, skills, technical-knowledge, soft-rating and dashed resume cards. Existing state/controller, GPA **2–4 / step 0.1**, study-field select/default, **11 binary technical fields**, **five 1–5 ratings**, resume backend/text-fallback handlers, request composition, demo ownership and submission/error behavior remain connected. Ordinary GPA remains blank; ordinary ratings remain 3; demo inputs remain the real production sample.
- Skill add/remove/autocomplete keeps its existing handlers with listbox/option semantics; an empty skill input now permits Tab to leave it, while entered-text Tab-to-add remains available. Remove/rating/action targets retain a **44px** floor. Reset clears ordinary edited profiles as well as demo profiles, input/autocomplete/validation and parsed-resume state. Parsing has busy/disabled upload states; guidance and existing tips remain available in a native expandable section instead of the removed sidebars.
- `frontend/src/i18n.js`: complete EN/RU/KK landing/form labels and truthful preview/privacy copy, four-step descriptions and seven track descriptions. Long classifier/matching guidance stays in the expandable guide; card introductions are concise. `frontend/src/App.test.jsx` and `i18n.test.js` cover the changed interactions and locale structure.
- Shared Footer/privacy-dialog selectors remain in Hero CSS with all existing footer links and behavior. Original header/branding remains the approved Stage 1 shell. No new dependency, asset, component-library abstraction or repository evidence folder was introduced.

### Final verification and review evidence

- TDD characterization initially produced **6 expected failures / 45 passes** for the prior headline/five-step layout, empty-input Tab trap, absent parser busy state and missing locale labels; the initial implementation reached **51/51** focused passes. Preservation checks cover resume success/loading, text fallback/unrecognized input, all 11 technical/five rating payload values, guest/demo options, failed-submit retry, reset and native guide semantics.
- Final `CI=true npm test -- --runInBand --silent`: **16 suites / 140 tests passed**. Final `CI=true npm run build`: successful optimized compilation, **9 public prerenders** and SEO artifact checks. The build performs CRA's lint/compile checks; no standalone lint or type-check script exists in the package. Existing Node `punycode` deprecation output remains; there were no new test/build failures.
- Fresh production-browser matrix: **48 cases = two pages × four viewports × three locales × two themes**, at **1440×900, 768×1024, 390×844 and 320×844**. Assertions passed for actual viewport/locale/theme, no horizontal overflow or clipped headings/text/controls, headings below the header, 11 technical checkboxes and 25 rating buttons. Profile section/rating-label computed colors match the theme's primary text color in every case.
- Captured **19 screenshots** outside the repository: full-page and viewport EN/light captures of both pages at every size, 390px dark/KK captures and a populated desktop demo/error state. Refreshed desktop/tablet/mobile/narrow captures were visually inspected against the approved local PNGs for hierarchy, reading width, surfaces, alignment, wrapping and action reachability. MCP screenshot/emulation calls timed out; an isolated installed headless Chrome/CDP runner provided the actual captures with no new project dependency. A short theme-settle wait initially captured pale offscreen labels in one full-page image; increasing the capture wait and checking computed colors yielded readable refreshed captures without a source-code change.
- Actual browser keyboard checks passed for methodology Enter → destination focus → next Tab within that section, unchanged route hash, autocomplete ArrowDown/Enter, blank-input Tab exit and visible focus. Chip-remove targets measured **44×44px**. Invalid GPA blocked submission and made no request.
- Controlled browser transport checks exercised actual application handlers for resume upload bytes/filename headers, parser busy/success and merged Python/SQL/Pandas, all 11 binary flags/five ratings in the recommendation payload, submit loading/service error/re-enabled action, reset, real demo-profile values and live-demo request/loading/error recovery. Only the temporary browser's transport was controlled; **these checks do not establish live backend/parser/recommendation availability**. Existing mocked integration tests also cover successful results/tour and demo ownership.
- Actual reduced-motion preference emulation confirmed `prefers-reduced-motion: reduce` and the existing CSS scroll guard (`scroll-behavior: auto`). No runtime exceptions occurred in the final CDP run; production console/font/style/script spot checks showed no application errors. Complete animation-runtime reduction and actual browser 200% zoom remain unverified.
- One fresh read-only review found **no Critical**, **one Important** (section navigation left keyboard focus behind) and **two Minor** findings (32px chip target, stale “above” dataset directions). The focus regression was reproduced with a failing assertion; all three findings were fixed and verified in the final tests/browser run. Localized source directions are now position-neutral.
- Final scoped/whitespace checks passed. Task changes are limited to the seven frontend files listed above and this execution record. Backend/ML, `.github/`, Results, routing/auth controllers, shared header, API/scoring/demo utilities, manifests/lockfile and original exports are unchanged. Fresh SHA-256/byte comparison confirms **all 17 original exports / 2,729,692 bytes** unchanged; user assets remain untracked and excluded from the checkpoint commit.

### Intentional visual differences, remaining checks and boundary

- Literal sample-result fidelity is intentionally limited by truthful uncomputed previews and actual production defaults. Existing header/footer branding/navigation, real study-field select, extra provenance/guidance, historical/privacy disclosures and larger accessible control targets differ from export content and spacing. The editorial hierarchy and centered composition follow the approved references.
- RU/KK use the approved system-font fallback for glyphs absent from Newsreader/Plus Jakarta Sans; rendering/wrapping can differ across operating systems. The four-size matrix verifies current Chrome layout rather than a pixel-identical mobile/tablet reference, since those exports were not supplied.
- Live backend/OAuth/database/provider/voice/PDF checks, backend tests, actual browser 200% zoom and complete reduced-motion animation behavior were not run. Controlled transport and mocked tests establish frontend behavior only. Pre-existing history/feedback concerns in G2 remain for their separately approved stages.
- **Stage 2 checkpoint complete. Stop for review before Stage 3. Do not push, merge or create a PR without explicit authorization.**

## Execution record — Stage 3 and text branding (2026-10-12)

### Authorization, decisions and implementation

- Subsequent approval authorized **Stage 3 only**, plus removal of the image wave/carbon plaque in favor of a clean theme-aware **CareerFlow text wordmark**, tests/build/browser comparison, scoped review and one verified local commit. Continued `feat/ui-redesign` from the approved Stage 2 checkpoint `96a2592`; baseline **16 suites / 140 tests** passed. The existing worktree remains isolated from parallel backend/CI/CD branches.
- `frontend/src/components/BrandLogo.jsx` and its CSS now render one Newsreader text span in the theme's primary text color, with no picture, image, icon, badge or backing rectangle. The existing accessible Navbar/Footer home links and Login consumer reuse it. Mobile Navbar uses compact wrapped alignment and retains account, feedback, language and theme controls. Original assets were not deleted. Existing branding/login tests cover home navigation and all login locales.
- Added only the planned presentation boundaries, `pages/results/ResultsNavigation.jsx` and `BestMatchPanel.jsx`, reusing `Results.module.css`. Four controlled tabs have tablist/tab/tabpanel semantics, active state, roving focus and ArrowLeft/ArrowRight/Home/End operation. Results remains the sole owner of selection, chart mode, tour, API/effects, persistence, history, courses and AI state; child panels compose existing chart/scoring/explanation helpers and invoke existing callbacks.
- Shared frame is centered and document-scrolling, with actual GPA/study context, localized session/demo disclosures, an expandable context section and immediately reachable AI/save/copy/share/PDF/new-analysis actions. The old left rail/toggles are replaced by this context section; its profession/roadmap targets are ordinary keyboard-operable buttons. All four existing tab contents and the original feedback/AI internals remain connected.
- Best Match follows the local approved PNG's editorial hierarchy: actual rank/career hero and large score ring, real learning-roadmap/comparison actions, provider-aware AI CTA, four weighted signal cards, native calculation/raw-value inspector, chart/skill-gap analysis split, existing explanation and actual alternative cards. Bars, Radar and Gap remain driven by real response values and the existing helpers. Selected alternatives retain their actual rank and **Selected profession** label rather than being relabeled the top match.
- No scoring helper/math/weight defaults were changed. The four cards use `getScoreBreakdown`, actual server weights and tabular contributed points; absent weights remain unavailable. New gap chips use the selected career's actual gap or the top career's available course-roadmap keys; absent alternative gap data is disclosed rather than presented as complete. Entered profile skills are labeled as entered, not verified. Historical 2023 data and non-probability score explanations remain explicit.
- One narrow preservation correction was required by the selected-career roadmap test: derive category display order from saved order **plus missing available categories**, then let explicit reorder actions use that same effective list. This restores alternative categories that the initial-career order otherwise hid and makes them reorderable. State/readiness effects, `category::skill` completion keys, saved payload fields and persistence schema remain unchanged; restored completion is preserved.
- The Results-only motion variant clears filter/transform after its entrance animation so fixed advisor controls remain viewport-relative when the longer document scrolls. Best Match tooltips are bounded/wrapped, its skill radar scales to the container, and normalized metric tracks stretch instead of inheriting the old grid's centering. The generic four-signal legend appears only in Bars; Radar keeps its own correct legend. The mobile advisor shell occupies the viewport above wrapped navigation so its existing Close control remains reachable; advisor/controller content migration is still Stage 7.

### Final verification and review evidence

- TDD: baseline branding/navigation/gap/alternative checks failed before implementation. Additional saved-order/category reorder regression reproduced the missing-category reorder failure before the fix. Native calculation tests now click the summary and assert `details.open`, skill tests assert exact chips, and chart tests assert actual mode-specific nodes. Independently derived non-default server-weight expectations are **15.00 + 40.00 + 10.00 + 30.00 = 95.0 / 100**; selected-career PDF checks inspect the actual generated career/score HTML.
- Final `CI=true npm test -- --runInBand --silent`: **16 suites / 145 tests passed**. Final `npm run build`: optimized compilation, **9 public prerenders** and SEO artifact checks passed. CRA build supplies compile/lint verification; there is no separate lint/type-check script. Existing Node `punycode` deprecation warnings remain; no unresolved test/build failure.
- Final isolated production-browser/CDP run passed **96 page cases = Results/Landing/Profile/Login × four viewports × three locales × two themes**, at **1440×900, 768×1024, 390×844 and 320×844**. Within Results, **72 chart-mode cases** checked Bars/Radar/Gap. Assertions verify actual locale/theme/viewport, no horizontal overflow or clipped text/controls/SVG, headings below navigation, four signal cards/tabs and text-only transparent theme-correct branding. Four normalized metric tracks each remain wider than 50px at every size; a preceding failing geometry assertion measured the centering regression at **0–0.109px** before the scoped fix.
- Actual browser keyboard checks passed for tab arrows/Home/End, visible focus, native calculation-summary Enter, accessible home-link Enter and all **five GuidedTour steps/targets**. Controlled transport exercised actual result routing, alternative selection, selected-career roadmap and **1 of 3** restored completion, calculation equation, context disclosure and selected-career PDF HTML. Existing unit/integration tests preserve provider-aware CTA behavior, no automatic AI requests, API/auth/key handling and persistence load-failure write gates.
- Scrolled advisor opening/Close reachability passed all four widths. At 1440×900 after a 1000px scroll, the floating launcher stays at **836–880px** and the drawer at **86–900px**. Opening it does not send a chat/preview message. These checks verify the frontend with controlled recommendation/state/preview responses; they do **not** establish live backend, database, OAuth or provider availability.
- Captured **nine screenshots** outside the repository: four full-page EN/light Best Match sizes, mobile KK/dark Best Match, mobile landing/profile/login branding and the scrolled mobile advisor. Refreshed desktop/mobile/narrow screenshots were visually inspected against the approved local Best Match PNG. Chart mode was allowed to settle before capture; source-label/track visibility was checked independently of screenshots.
- Reduced-motion emulation verifies the preference, `scroll-behavior: auto` and the score ring's reduced transition duration (**0.00001s**). Final run recorded **zero runtime exceptions**. Actual browser 200% zoom and complete motion runtime coverage remain unverified.
- One fresh read-only review found **no Critical**, **three Important** (advisor containing block, narrow chart/tooltip overflow, appended-category reordering) and **two Minor** findings (Radar legend conflict and weak new assertions). All five were addressed and the same review seat confirmed them resolved. Final visual inspection additionally caught/reproduced/fixed the collapsed normalized-track alignment described above, followed by a fresh successful build and complete browser run.
- Scoped diff/whitespace checks pass. API/scoring/demo/auth utilities, backend/ML, `.github/`, manifests/lockfile and original exports are untouched. Fresh SHA-256/byte comparison confirms **all 17 original exports / 2,729,692 bytes** unchanged. Additional user branding files that appeared untracked during verification were preserved and excluded from the checkpoint along with the original design exports. Temporary scripts/reports/screenshots are outside the repository; test-owned servers/browser processes are cleaned up.

### Intentional differences, remaining checks and boundary

- The reference's unsupported coursework/verified-skill claims, invented score/percentile/timeline values and duplicate illustrative notices were not copied. Real disclosures, seven actual alternatives, existing feedback, context/export actions and accessible target sizes produce a longer page. Existing chart geometry/heuristic helpers are reused rather than replaced with export sample graphics. Shared text branding is the separately approved departure from the reference icon.
- RU/KK use approved system fallbacks for unsupported font glyphs; platform-specific rendering can differ. Current Chrome responsive acceptance is verified rather than pixel-identical to nonexistent supplied mobile/tablet exports.
- Explicit review dispositions: legacy alternative course fallback, cross-career completion, partial saved skill order and filtered-course transitions remain for separately approved **Stage 5**; existing history load/clear ambiguity and signed-in demo feedback ownership remain for **Stage 6**; advisor transcript/consent/stream/voice/modal-focus internals remain for **Stage 7**. These unchanged behaviors are not certified by the presentation checkpoint. Legacy alternatives without their own course data may still use top-career courses; completion remains shared by `category::skill`.
- Live backend/OAuth/database/provider/voice/device-PDF checks, backend tests, actual browser 200% zoom and full motion-runtime verification were not run. Controlled frontend tests and generated PDF HTML checks do not establish live-service/device correctness.
- **Stage 3 checkpoint complete. Stop for review before Stage 4. Do not push, merge or create a PR without explicit authorization.**

## Execution record — Stage 4 (2026-10-12)

### Authorization, decisions and implementation

- Approval authorized **Stage 4 only**, its verification/execution record and a scoped local commit. Continued the existing isolated `feat/ui-redesign` worktree from `2b00162` (`feat: integrate approved CF branding assets`), with Stage 3 checkpoint `20fc843` present and tracked/index state clean. Intentional untracked originals under `assets/`, `design/branding/`, `design/hero/`, `design/profile form/` and `design/results/` were explicitly approved, preserved and excluded from staging.
- Read the approved local `design/results/careerflow_all_professions_refined/code.html` as text and inspected its PNG. No export scripts were executed, Stitch accessed or assets downloaded. Added only the planned controlled presentation boundary, `frontend/src/pages/results/AllProfessionsPanel.jsx`, composed from `Results.jsx` and styled in `Results.module.css`; necessary EN/RU/KK labels are in `i18n.js`, and focused interactions extend `Results.test.jsx`.
- The editorial hierarchy uses the Stage 3 warm canvas, white/nested panels, Newsreader headings, Plus Jakarta Sans UI, tabular numbers and restrained blue selection with existing dark equivalents. Desktop ranking/detail columns are approximately **2:1**, stacking below **1000px**. Narrow rows wrap career names, scores, contribution metadata and controls; the selected row provides an explicit keyboard-operable jump/focus action to the detail heading.
- All seven backend professions and all five existing normalized sort comparators remain authoritative. Overall ranks are derived once from final scores and stay fixed across alternative sorts; top-match identity is separate from selection. Native sort/selection buttons expose pressed/control relationships. Row selection updates the detail without leaving All Professions; its stable panel key preserves button focus and native calculation disclosure while sorting/selecting. Other panel keys and state ownership remain unchanged.
- The detail rail reuses `ScoringFormulaHeader` and `getScoreBreakdown` for the four response-weighted signals, contributions, normalized equations and raw calculation inspector. Compact signal cards retain label/weight/contribution/track while repeated explanatory prose remains in Best Match and the inspector. Relevant covered/missing roadmap skills replace duplicate entered-profile chips; the existing roadmap callback opens the selected career's Results tab without changing the result route.
- Coverage is derived from **that career's supplied full/gap roadmap**, with legacy fallback restricted to the top career. Missing alternative coverage is disclosed rather than inherited or labeled complete. Missing weights/inputs have explicit unavailable/partial-data copy; absent final scores yield a localized empty ranking. A saved selection absent from partial final scores resolves one stable available identity across detail, gaps, roadmap and persistence, independent of sorting.
- Existing score-circle, bar and gap comparisons remain reachable in a native expandable **Additional score and skill comparisons** section. Their selection actions still open career-specific Best Match. All Professions passes true overall ranks and career-specific coverage to the existing comparison helpers; other callers retain their existing behavior. Historical **2023** market context, non-probability match-score explanations and unverified-proficiency distinctions remain explicit. Backend scoring, ML, contracts, auth/session controllers, Header/navigation, branding and dependencies are unchanged.

### Final verification and review evidence

- TDD: **11 new tests failed / 16 existing tests passed** before implementation. Two initial assertion assumptions were corrected without changing application behavior: tolerate unrounded floating-point CSS contributions and inspect an already-expanded roadmap category before toggling it. The fresh review's three regressions were then reproduced with **6 failing / 22 passing** focused cases before the fix pass.
- Final `$env:CI='true'; npm test -- --runInBand --silent`: **16 suites / 157 tests passed**. Final `npm run build`: optimized compilation, **9 public prerenders** and SEO/branding artifact checks passed. CRA supplies compile/lint checks; no standalone lint/type-check script exists. Existing Node `punycode` deprecation warnings remain; no unresolved test/build failure.
- Focused tests cover five independently expected sort orders, immutable input, stable overall ranks/top identity/scores, non-top selection and four weighted contributions, actual native calculation disclosure, selected roadmap within the same route, preserved Best Match chart mode, comparison actions, missing weights/inputs/coverage/final scores, restored selection/progress and the unavailable-saved-selection fallback. Shared scoring/API/auth/AI/persistence regression suites continue to pass.
- Final isolated production Chrome/CDP matrix passed **150 layout inspections, 150 sort cases and 210 career selections**, across **1440/1024/768/390/320px × EN/RU/KK × light/dark**. The five inspections per combination cover collapsed/expanded All Professions comparisons and Best Match Bars/Radar/Gap. A separate report assertion confirms the actual rendered viewport/locale/theme distribution. No horizontal document overflow, horizontally clipped visible headings/text/controls/SVG or runtime exceptions were recorded; seven ranking tracks remain meaningful, with two columns at desktop/laptop widths and one below.
- Actual browser Enter/Space activation, retained selected-button focus and visible outline, mobile detail-heading jump, selected-career roadmap/gap/restored completion, unchanged result route, AI drawer opening without automatic chat/preview send, and reduced-motion preference/automatic scroll behavior passed. Browser recommendation/state/progress/course/preview transport was controlled; these are frontend checks, not live service verification.
- Captured **seven screenshots** outside the repository: EN/light All Professions at all five widths, 390px KK/dark All Professions and 320px EN/light Best Match. Desktop/laptop/tablet/mobile/narrow captures were visually inspected against the approved local reference. Production inspection caught missing CSS Module exports for two gap marker classes that Jest's CSS mock concealed; scoped rules corrected them before the final build/matrix. Temporary runner startup/React timing fixes stayed outside the repository.
- One fresh read-only review found **no Critical/Minor findings and three Important findings**: legacy comparison falsely implying complete coverage, comparison rank numbers following sort position, and partial-final fallback identity diverging from gaps/roadmap/persistence. All three were accepted, reproduced and fixed in one regression pass, then verified by the final tests/build/browser checks. No new scoring formula or persistence schema was introduced.
- Scoped diff/whitespace checks pass. Fresh hash/byte comparison confirms **21 original design/branding source files unchanged**. Protected tracked paths—including backend/ML, `.github/`, API/scoring/auth utilities, shared Header/navigation, README and branding assets—are unchanged against the Stage 4 base. Temporary scripts/reports/screenshots remain outside the repository; owned server/browser processes were cleaned up. Only the five Stage 4 frontend files and this execution record belong in the checkpoint.

### Intentional differences, remaining checks and boundary

- Real profession identifiers, authoritative scores/weights and localized content replace the mock's sample values. The shared Stage 3 frame/Header, score/historical/coverage disclosures, accessible controls, preserved comparisons and raw inspector produce different content density from the PNG. Compact master-detail composition follows the approved reference; no unsupported confidence, employment-probability, live-market or verified-competence claims were copied.
- RU/KK retain approved system-font fallbacks for unsupported glyphs. Current Chrome responsive layout is verified, not pixel equivalence or cross-platform font identity. Live backend/OAuth/database/provider/voice/device-PDF behavior, backend tests, Safari/Firefox/physical devices, actual browser 200% zoom and full motion-runtime coverage were not checked.
- Existing **Stage 5** alternative course fallback, shared `category::skill` completion, partial saved skill order and filtered-course transitions remain for their separate checkpoint. **Stage 6** history/feedback and **Stage 7** advisor internals retain their prior dispositions. Correct Stage 4 selection/coverage does not certify those pre-existing behaviors fixed.
- **Stage 4 checkpoint complete. Stop for review before Stage 5. No push, merge or PR creation is authorized.**

## Execution record — Stage 5 (2026-10-13)

### Authorization, decisions and implementation

- User authorized Stage 5 only, with **focused automated verification and one final production build**. The earlier full browser/screenshot matrix gates are superseded for intermediate stages; comprehensive verification belongs to Stage 8. No Stage 6 work, push, merge or PR.
- Base: `1187a38` on `feat/ui-redesign`; Stage 4 is committed as `d23f766`. Existing linked worktree verified. Parallel worktrees have no overlapping tracked modifications. One pre-existing unrelated tracked bytecode modification, `backend/__pycache__/main.cpython-312.pyc` (Git blob `a7f429037d1f3cf464a2d7ce0be1ae8e825db90b`), must remain untouched and unstaged. Original branding and design exports remain intentionally untracked.
- References: `design/results/careerflow_learning_roadmap_refined/{code.html,screen.png}` and the shared Editorial Career Guidance specification. Reuse established tokens, Newsreader headings, Plus Jakarta Sans controls and the Results shell; no assets, dependencies or global shell changes.
- Ruling: preserve the existing skill-based completion denominator, dependency rules/next-step selection, completed-last ordering, selected-career adaptation, five filters and Results-owned persistence. Use a controlled `LearningRoadmapPanel` with composed existing dependency/filter/course helpers. Native completion checkboxes and move controls improve operability without introducing another state controller.
- Ruling: the export's invented baseline/course examples, SQL Server/MongoDB dependencies, per-course completion, hours, accredited-certificate tiers, roadmap ID and contextual technology-swap advice have no matching contract. Render actual prerequisite relationships and profile/manual provenance, real course metadata and the existing optional advisor entry instead.
- Scope: `Results.jsx`, `Results.module.css`, `Results.test.jsx`, `pages/results/LearningRoadmapPanel.jsx`, necessary EN/RU/KK roadmap labels in `i18n.js`, the guided-demo completion interaction in `App.test.jsx`, and this execution record. Read-only source review found existing alternative-roadmap fallback, cross-career completion keys, partial restored skill orders and in-flight filter reset limitations; their semantics remain unchanged during extraction.
- The controlled panel renders the current career, actual required skill list/count, remaining steps, accessible percentage/count progress, collapsible categories, completed-last skill groups and manual-completion disclosure. Existing Results handlers own all selection/completion/order/filter state and API effects; only transient drag feedback and focus references are local. Native checkboxes replace custom pressed buttons. Move buttons invoke the same ordering handlers, respect completion-group boundaries and transfer focus to an enabled sibling when a move reaches an edge.
- Real dependency cards retain the existing rules/readiness/next-step calculation and distinguish profile entries, self-marked completion and missing prerequisites. They remain advisory rather than imposing course gates. Legacy selected alternatives lacking career-specific courses disclose the top-career fallback source without changing the fallback rule or stored data.
- Five compact, wrapping filter controls retain their exact preference/request contract, reset and local failure fallback. Course details are native keyboard-operable buttons; direct/provider-search links reuse the existing exported helper, open separately and do not mark skills complete. Nullable titles have translated fallback text; absent language/level metadata is not displayed as normalized default metadata. Copy feedback keys include category and skill to avoid unrelated-card collisions.
- Course details retain existing content/close behavior with dialog labels, initial focus, Tab containment, Escape and trigger-focus restoration. A stable close callback prevents ordinary Results updates from restarting focus setup. Scoped modal link text uses the existing accent-contrast token in both themes. The roadmap advisor CTA uses the existing provider-aware entry handler with no automatic message.
- Styles are scoped to the learning panel/course overlay and reuse the existing tokens/fonts, including dark equivalents, responsive filter/category/course wrapping, visible focus and drag/drop feedback. Global shell, tokens, branding, other Results panels, advisor internals, dependencies and original exports were not edited.

### Focused verification and review evidence

- TDD: new roadmap integration assertions failed against the old presentation before implementation. Two stale interactions were corrected: the guided demo now changes the native checkbox, and restored alternative categories are explicitly expanded when the existing expansion state leaves them collapsed. Further failing regressions reproduced missing fallback disclosure, modal focus reset on Results updates, boundary-move focus, and stale move-focus references after no-op partial-order moves; all now pass.
- Final command, from `frontend/`: `$env:CI='true'; npm test -- --runInBand --silent --runTestsByPath src/pages/Results.test.jsx src/App.test.jsx src/i18n.test.js src/utils/api.test.js src/utils/scoring.test.js` — **5 suites / 127 tests passed**, zero failures. Coverage includes manual mark/unmark/current-career denominator, exact debounced progress/filter payloads, existing load-failure write protection, restoration/shared completion keys, drag ordering/compatibility/cleanup, keyboard move boundaries/focus, five backend filters/reset/empty/failure fallback, nullable metadata/provider links, modal focus/Tab/Escape, failed progress writes, guest/no-roadmap states, EN/RU/KK controls and advisor no-auto-send.
- Final `npm run build` passed optimized compilation, **9 public prerenders** and SEO artifact checks (metadata, CSS modules, JSON-LD, robots, sitemap, private shell and branding). **Two builds were run:** the first passed; a review-follow-up regression then required a production focus fix, so a second build was necessary to compile and verify the final code. No routine repeated builds or browser matrices were run. CRA supplies compile/lint checks; no standalone lint/type-check script exists. Existing Node `punycode` deprecation warnings are non-failing.
- One fresh read-only review found **no Critical/Minor findings and two Important findings**: disabled boundary move controls could lose focus, and the modal provider link retained poor dark-theme contrast. Both were addressed. The same review seat confirmed the contrast correction and identified a stale-focus edge case after a no-op partial-order move. That case was reproduced with a failing integration test and fixed by respecting focus moved to another control; the final focused suite verifies both normal boundary movement and this edge case.
- Review dispositions: legacy fallback source, shared completion namespace, partial saved orders, in-flight filter/reset transitions and category drops intercepted by nested skill targets remain pre-existing behavior. Their data/ordering/request semantics were not expanded during presentation extraction. Comprehensive visual/runtime acceptance and live services were declined under the intermediate-stage verification policy, not asserted passing.
- Scoped diff/whitespace checks passed before staging. The index was empty before explicit task staging. Main bytecode still hashes to the prerequisite blob `a7f429037d1f3cf464a2d7ce0be1ae8e825db90b`. Two additional unrelated tracked modifications appeared in `backend/utils/__pycache__/{__init__,python_types}.cpython-312.pyc`; all three bytecode files remain untouched by this work and excluded from the commit. Intentional untracked originals under `assets/` and `design/` are preserved and excluded. No backend source, ML, API/scoring/auth utilities, manifests/lockfile, shared Header/Footer, branding or README changes belong to Stage 5.

### Intentional differences, remaining checks and boundary

- The reference's sample Data Analyst graph/course content, SQL Server/MongoDB edges, fixed prices/ratings, per-course completion, accredited-certificate tiers, hours, roadmap ID and swap advice were not copied. Real category/skill counts, advisory dependency cards, manual progress, five existing filters, course metadata, accessible move controls and truthful fallback/catalog notes change the reference's content density. No certification/proficiency or completion-time prediction is introduced.
- Existing shared cross-career completion, partial saved-order no-op moves, alternative course fallback and in-flight filter-reset limits remain. Restored career categories may require expansion under the existing expansion-state model. RU/KK retain the approved platform-dependent font fallbacks.
- Full frontend suite, browser/screenshots/visual regression, theme × language × viewport/device matrices, large accessibility audits, physical keyboard/touch/drag/zoom/motion checks, PDF/voice and live authenticated/backend/provider writes were intentionally deferred to Stage 8. Focused DOM interaction tests and a build do not certify browser geometry or live persistence. Backend tests are outside this frontend-only checkpoint.
- **Stage 5 checkpoint complete with focused verification. Stop before Stage 6. Local commit authorized; no push, merge, PR or deployment.**
