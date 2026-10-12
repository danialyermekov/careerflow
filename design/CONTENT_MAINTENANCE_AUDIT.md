# Public navigation and product content audit

Audit date: **12 October 2026**. This maintenance change does not deploy the site.

## Sources and publication boundary

- Current content: `frontend/src/components/{Footer,Navbar}.jsx`, `pages/{Changelog,ProductRoadmap,PublicPage,About}.jsx`, `data/productUpdates.js`, and `productI18n.js`.
- `3ccb8e409e7ab44c40e4da0763ed4f660c245c6d` records the MVP source release. Historical `docs/public-product-pages.md` at `94a6c61305198e9d0163bfb193189076cd022e11` explicitly records the maintainer-confirmed **7 October 2026 launch**. The live changelog still lists it. Retained without changing its date or feature scope.
- The historical `CHANGELOG.md` and candidate verification documents at `94a6c61` expressly did **not** confirm a production release. Their candidate wording cannot establish a deployment date.
- The later README at `aa4877a` records a **9 October 2026 production audit**, image `careerflowacr.azurecr.io/careerflow:v1.1-73e220b`, maintainer-confirmed Google/GitHub login, private PostgreSQL history/progress and an enabled consent-based Gemini preview. This is evidence of availability by that date, not an exact deployment timestamp.
- Read-only live inspection on this audit date: `/changelog`, `/roadmap`, `/feedback` and `/` serve the existing pre-redesign public UI; `/health` returns `{"status":"ok"}`; `/ai/preview` reports available with a total of three messages; `/api/feedback?type=feature&offset=0` and `/api/roadmap` return valid empty listings. No feedback, votes, recommendations or AI messages were submitted.
- Source/controller/test inspection supports sign-in, owner-scoped history/progress, guided demo and moderated/consented feedback with authenticated voting. Public API responses establish availability, not a new end-to-end login, database-write or voting verification. The public copy does not claim that every account-management operation is available; README limitations on account deletion remain applicable.
- Git history contains later merged backend maintenance and local UI work. Neither a merge nor a commit proves deployment. GitHub's public deployments listing is empty. The live site does not identify an exact source SHA; newer backend maintenance is therefore excluded from the release timeline.
- `design/IMPLEMENTATION_PLAN.md` records an ongoing frontend migration, with earlier views implemented locally and further views pending. The live UI remains the earlier version. The public roadmap calls the interface refresh **In Progress**, with no internal branch names, stage numbers or delivery date. It is absent from What's New.

## Content decisions

| Public content | Evidence / disposition |
| --- | --- |
| MVP launch, 7 October | Maintainer confirmation in historical documentation and existing live announcement; preserved. |
| Accounts, guided demo, optional preview and public feedback | Source change `94a6c61`, later production README audit and current live checks. Added as **Availability verified: 9 October 2026**, explicitly distinct from launch/deployment date. No invented version or release date. |
| Career ranking, skill gaps, learning roadmaps, comparison and course discovery | Implemented in the original MVP and retained. Completed means the capability exists, not that course metadata, model outcomes or every edge case is verified. |
| Private accounts and community feedback | Removed stale release-candidate descriptions and moved to Completed, supported by later production evidence. |
| Guided demo and optional Gemini preview | Added to Completed; no claim of unlimited messages, guaranteed availability or per-day allowance. |
| Frontend refresh | In Progress; concise visitor-facing description and explicit non-release notice. |
| Planned | No independently evidenced scheduled item beyond active work. Keep the section with an honest empty state instead of inventing commitments. |
| Fresher market data, additional careers, better validation data | Existing exploratory ideas. Moved from Planned to Exploring; no promise or date. |

### Ambiguities retained for review

- Exact v1.1 deployment date is unverified. The availability-check date must not be converted into a launch date without new evidence.
- No approved community ideas were returned by the live API during inspection. The existing API-backed loading, error, empty and linked-idea UI remains; this audit does not invent suggestions or change backend development statuses.
- Exploratory directions have no confirmed scope, owner-approved schedule or delivery dates. Other broad README directions (adaptive learning and reliability/scalability) are not promoted to new public commitments.

## Navigation and disclosure decisions

- Footer becomes Brand, Product and Resources: unchanged CareerFlow wordmark/home link, short localized description, © 2026, About, What's New, Product Roadmap, canonical GitHub, Contact, Privacy, Terms and Disclaimer.
- Removed duplicate text Home/site-domain destinations, duplicate direct-email Contact, full-policy duplicate, footer LinkedIn and footer Feedback. Contact retains email/LinkedIn access; Feedback remains in the main navigation. All existing pages/routes remain.
- Replaced the duplicated footer privacy dialog with a direct Privacy link. The complete policy and preview data disclosures remain on `/privacy`; Terms and Disclaimer remain accessible. No policy text was removed.
- Removed the promotional Public Beta badge from Header/Footer and replaced About's redundant promotional sentence with neutral development/exploratory guidance. Release version, feature flags, beta-integration limitations and legal/service notices are unchanged.
- EN/RU/KK content continues to use the existing shared structured data and translation dictionaries. Footer and touched public-page styles reuse approved tokens; no logo/favicon assets or design tokens change.

## Verification and review

- Characterization before implementation: **9 expected failures / 30 passes** in the App suite, identifying the redundant Footer, missing availability-dated update and missing four-status roadmap.
- Final `CI=true npm test -- --runInBand --silent`: **16 suites / 163 tests passed**. Existing translation parity, auth/API/scoring/recommendation/AI/persistence tests remain green. New public interactions cover all three languages, unique required Footer destinations, contact email/policy access, date-label semantics and roadmap classification.
- Final `npm run build`: optimized compilation, **9 public prerenders** and SEO/branding artifact checks passed. CRA supplies compile/lint checks; no separate lint/type-check script exists. Existing Node `punycode` warnings are non-failing.
- Final production Chrome/CDP run: **72 page cases = Landing/What's New/Product Roadmap × 1440/768/390/320px × EN/RU/KK × light/dark**. Assertions check actual viewport/language/theme, no settled-layout horizontal overflow or horizontally clipped visible text/controls/SVG, headings below Header, unchanged wordmark, no promotional beta labels, correct dates/groups, quiet theme-correct Footer links and **44px minimum link heights**.
- Native keyboard Tab/focus-outline/Enter checks reached all **eight internal Footer destinations**. Contact email and full policy remain accessible. Canonical repository and both source-commit links returned **HTTP 200**. Controlled community API responses checked the unchanged error and linked-idea states; reduced-motion preference and automatic-scroll behavior passed. No runtime exceptions occurred.
- Seven screenshots were captured outside the repository; desktop/mobile/narrow Footer, release timeline and roadmap were visually inspected. Temporary browser scripts were adjusted to wait for React mounting and the existing landing exit transition before measuring settled layout, and to use actual keyboard focus for focus-ring assertions; these were runner corrections, not unrelated application changes. Owned server/browser processes were cleaned up.
- Fresh SHA-256/byte checks confirm **21 original design/branding files unchanged**. Protected backend/ML/API/auth/scoring/Results/branding/configuration paths, approved tokens and the implementation plan are unchanged against the task base. Original files remain untracked and excluded from the commit.
- One fresh read-only review found **no Critical, Important or Minor defects**. Final visual polish corrected Footer selector specificity so the shared global link color does not make every Footer destination blue. The pre-existing roadmap error message's position-dependent “below” was changed to “on this page” in EN/RU/KK. Tests/build/full browser matrix were rerun after those final edits.
- Not exercised: fresh live OAuth, private persistence writes, feedback/vote/AI submissions, other browser engines, physical devices, actual browser 200% zoom, backend tests or full motion-runtime behavior. Read-only production evidence and controlled frontend checks are explicitly separate. Exact v1.1 deployment date remains unverified.
