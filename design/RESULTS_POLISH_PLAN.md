# Results consistency and Advisor polish

Baseline: `e26045a` on the existing isolated `feat/ui-redesign` worktree.

## Binding scope
Use the existing Editorial Minimalist tokens. Preserve four tabs, selection, scores,
chart interactions, exports, persistence, localization and provider/security contracts.
Do not redesign History/Feedback or Learning Roadmap; stop before Stage 8 QA.
Preserve unrelated bytecode and untracked original design/branding assets.

## Tasks and interfaces
1. Results presentation: compact header and secondary action disclosure; retain unique
   profile/token inputs but remove duplicated history/rank/roadmap summaries. Compact
   hero/alternatives; show actual maximum signal contribution and readable bars.
   Keep Results-owned state and callbacks. Red/green integration tests verify these
   contracts, selection, disclosure and truthful model contribution semantics.
2. Explanation/chart presentation: one primary chart per mode, existing supplementary
   charts under disclosure; summarize strongest signed feature contributions with full
   details available. Clearly separate feature input, relative contribution, classifier
   output and composite score. Keep scoring/model calculations unchanged.
3. Advisor: one shared controlled composer with slots for consent/secondary controls,
   status and privacy. Preview and BYOK retain their existing state/send handlers and
   limits. Match conversation/composer spacing; compact existing expandable settings;
   hide unsupported voice controls without changing backend/provider capability logic.
4. Verify the combined focused regression suites, obtain one fresh read-only review
   of this pass, fix concrete issues, run production build, document evidence, review
   status/diff/staged diff/log and create one explicitly staged local commit.

## Pre-flight and rulings
- Tasks 1–2 share Results CSS: scope overrides to Best Match/profile controls to
  protect History/Feedback and Learning Roadmap.
- Task 3 consumes existing Results and FreePreview handlers; presentation component
  receives controlled textarea props and callbacks, never owns messages or keys.
- No task-path changes observed in the other registered worktrees.
- Ruling: continue the suitable existing task branch/worktree; do not disturb unrelated
  dirt. Cost if wrong: branch separation would be needed before integration.
- Ruling: record execution here using PowerShell/native tools rather than POSIX skill
  helper scripts. One final commit is the requested unit; intermediate red/green gates
  are not commits. Cost if wrong: less granular rollback than per-task commits.
- Ruling: keep fixed PDF colors independent of theme-aware UI chart styling; PDF
  exports must not depend on application custom properties.

## Verification commands
From `frontend`, with `$env:CI='true'`:
- Red/green: `npm test -- --runInBand --silent --runTestsByPath src/pages/Results.test.jsx src/components/FreePreview.test.jsx`
- Final focused: `npm test -- --runInBand --silent --runTestsByPath src/pages/Results.test.jsx src/components/Feedback.test.jsx src/components/FreePreview.test.jsx src/components/LLMSettings.test.jsx src/App.test.jsx src/i18n.test.js src/utils/api.test.js src/utils/scoring.test.js src/utils/llmSettings.test.js`
- Production: `npm run build`

Expected: new behavior tests fail before implementation, then all focused suites pass;
build compiles and existing prerender/artifact checks pass.

## Review focus
State retention across mode/close/session changes; unsupported controls; provider/key
privacy and no storage changes; SHAP percentages never interpreted as probability,
causality or learning advice; alternative selection/rank; export actions; theme token
fallbacks; CSS scope against protected tabs; long labels/mobile overflow.

## Execution evidence
Initial red gate: 3 new tests failed on duplicate context, missing separated model
outputs and missing shared composer; 67 existing tests passed (2 suites).
First green attempt: 68 passed, 2 failed. Root causes: composer autosize used a mocked
event `target` rather than the attached textarea (`currentTarget`, confirmed against
React DOM docs); the new forbidden-advice assertion also matched its own negating
caveat. Fixed textarea sizing at the shared handler and scoped that assertion to the
actual feature summary. Green gate: both suites passed, 70/70 tests.
Tasks 1–2 completed; shared composer integration is green. Final provider disclosure
and chart typography/token adjustments are included in the combined verification.
Combined pre-review gate passed: 9 suites / 158 tests. Fresh read-only review
`ses_ece240fe2ffea1Mg0NDvvjllbK` identified model-input labeling and incomplete
browser recording capability gating. Backend code confirms SHAP `raw_value` comes
from preprocessed X_df; original profile inputs must be sourced separately.
Ruling: treat incomplete browser recording gating as Important alongside input
mislabeling — unsupported recording controls violate this pass's capability scope;
cost if wrong: controls may be hidden where the runtime guard would reject recording
anyway. Both findings enter the single red/green fix pass; no second review dispatch.
Targeted review-fix red gate reproduced both findings. The first targeted run also
exposed an existing test-order dependency: this describe block relied on a prior
describe's scrollIntoView stub. Made its setup independent; rerun failed on the three
intended assertions (profile vs processed input, browser capability visibility).
Fixes: profile input/presence comes from the recommendation profile, preprocessed
model values remain separately accessible in full details; microphone visibility
uses existing recording API/audio/secure-context capability guards. Contracts and
model/scoring calculations unchanged.
Final: fixed model-input labeling and browser recording availability — targeted
regressions RED→GREEN, combined focused suite 9/9 and 159/159 tests passed.
Production build: one attempt, successful optimized compilation, 9 public
prerenders and SEO/branding/private-shell artifact checks. Only existing non-failing
Node punycode deprecation notices; no standalone lint/typecheck script exists.
Ruling: move this newly created plan/ledger to `design/RESULTS_POLISH_PLAN.md` — the
repository ignores `/docs/*`, while design implementation records are tracked;
cost if wrong: documentation location differs from the skill default, no runtime effect.
No review findings remain deferred after re-grading and the single fix pass.
Task-path diff/whitespace checks passed; backend bytecode blobs match the recorded
baseline and protected History/Feedback/Roadmap components have no diff.
All tasks verified. Completion boundary: one explicitly staged local commit;
preserve the branch/worktree and stop before Stage 8, without push or merge.
Browser/theme/mobile/localization visual matrix, live providers/voice and exhaustive
frontend QA are deferred to Stage 8; no new standalone lint/typecheck command exists.
