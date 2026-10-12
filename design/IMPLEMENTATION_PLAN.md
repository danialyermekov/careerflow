# CareerFlow — Editorial Minimalist Frontend Migration Plan

**Status:** plan approved; Stage 0 and Stage 1 completed and verified locally. Stopped for user review before Stage 2. Execution evidence is recorded below; the original audit describes the pre-implementation state.

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

**Approval boundary:** creating this document did not authorize implementation. Subsequent user approval authorized Stage 0 and Stage 1 and an optional verified local commit. Continue one reviewed stage at a time; preserve user assets and existing behavior. Stage 2, push, merge and PR remain subject to further authorization.

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
