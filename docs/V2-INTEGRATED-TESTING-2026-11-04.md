# Mettelo V2 integrated staging test report — 4 November 2026

**Scope reset — 4 November 2026:** The owner has superseded automatic platform feature parity. This is a historical reference, not a requirement to build or accept every old route. Current decisions and real release gaps are in [V2-SIMPLIFICATION-AND-GAP-PLAN-2026-11-04.md](V2-SIMPLIFICATION-AND-GAP-PLAN-2026-11-04.md).


Later continuation: see [Career resources and route coverage](V2-CAREER-RESOURCES-ACCEPTANCE-2026-11-04.md) and [46-route coverage](V2-PUBLIC-ROUTE-COVERAGE.md). The missing homepage/member resource connection and signed-in account-entry behaviour below have since been addressed; OneDrive file access and hosted/member-pilot acceptance remain open.

## Decision

**Continue staging acceptance; do not release to production.** The tested public/member/admin connections work and the checks below pass. This is a broad local integration pass, not proof that every advertised feature, every role on every device, or the original full platform transfer is complete.

Branch: `codex/v2-lab-transfer`. Staging database: `jxijdjmjuzslmjxolhjl`. No push, deployment, production database mutation, email or social post. The existing Platform project was not queried or changed. Both projects report ACTIVE_HEALTHY; a separate website production project is not present.

This report supersedes older readiness statements only for the journeys/checks explicitly re-tested here. Older route inventory requirements still apply. Final team handover/verified Proof remains deferred as previously agreed.

## Fixed during this pass

- Unified public-preview API bridges, account/project links and News navigation on the canonical local member runtime, port 3001. The optional isolated preview still uses 3004 when explicitly selected. Email callback origin and staging-only database safeguards are unchanged.
- Added root `npm run preview` to start public port 3002 and the member/News/admin runtime together using Turbopack. Added `npm run test:integrated` for repeatable anonymous integration checks. Build the static output first with `npm run build`.
- Added Industry News to desktop and mobile member navigation.
- Local account Terms/Privacy links now use the current V2 public preview policies; production destinations are unchanged.
- Added noindex headers to static local preview pages.
- Fixed narrow desktop Lab navigation/button wrapping, checked at 1100px.
- Added `tests/lab-delivery.staging.sql` for current formation/admission and delivery permission contracts. Older chat/admission fixtures use superseded setup actions and are not counted as passing current acceptance.

## Verification matrix

| Area | Current result | Evidence and limits |
| --- | --- | --- |
| Automated contracts | PASS | 80 member tests, four catalogue tests, two packaging boundary tests. Public build includes route, asset, anchor, policy, navigation and browser-logic checks. |
| Integrated HTTP sweep | PASS — 86 checks | All 60 public index destinations including 50 project briefs; one H1 and noindex. Runtime account/opportunity/News entry, 11 signed-out protected pages, navigation/activity bridges, unrelated-origin rejection, local policy redirects, missing article, article metadata and PNG signature. Reachability is not visual/content acceptance for every page. |
| Additional runtime/security probes | PASS — 16 checks | Eight optimized-server route/image checks and eight signed-out API write denials using the approved origin. News admin correctly returns 403; other checked APIs return 401. |
| Optimized build | PASS | Next 15.5.28, Node 22.23.4, `METTELO_BUILD_CHECK=1 next build --turbopack`; type validity and 28 prerendered pages completed. Local optimized server smoke checked. Default member build still selects Webpack; Windows directory-creation EPERM has historical evidence and remains a separate CI/environment acceptance item. |
| Dependency audit | PASS at test time | `npm audit --omit=dev`: zero reported vulnerabilities. This is a registry advisory check, not a security audit. |
| Formation/admission | PASS — rollback SQL | Current formation test covers review, team/solo offers, commitments, coordinator agreement, admission/readiness, release and expired offers. |
| Lab delivery | PASS — new rollback SQL | Task owner changes state; blockers require explanation; only coordinator reviews; seven persisted transition history entries; contribution author ownership/GitHub validation; safe shared references; outsider denied; completed history readable and writes denied. |
| Meetings/support | PASS — rollback SQL | Current operations test covers meeting revisions/retry, outbox preparation/provider failure/uncertain-result reconciliation, membership changes, private support and internal-note visibility. No real provider or email delivery. |
| Public contact/admin inbox | PASS — rollback SQL | Consent/validation, retry handling, role restrictions and admin status/notes. No real contact message submitted in browser. |
| News editorial lifecycle | PASS — rollback SQL | Draft privacy, publication validation, saved/live separation, stale edits, slug stability, public projection, unpublish, pagination and permissions. Earlier same-day browser publish/unpublish coverage is recorded in V2-INDUSTRY-NEWS.md; no new publication in this pass. |
| Browser integration | PASS for exercised journeys | Public menu → News → account; dashboard/profile and empty member Lab; account → admin → active Lab; catalogue search → project-interest entry; Solo/Flexible controls; resource save visible in Resources and Data; opportunity save → saved list → remove → empty list; mobile More → News. Existing signed-in administrator used. |
| Responsive/visual | PASS for exercised views | News at 320 and 390px and member shortlist/mobile navigation at 390px without horizontal overflow. Lab Resources/navigation checked at 1100px. This pass does not replace a full browser/device/accessibility matrix. |
| Database health/security | REVIEW REQUIRED | All public tables have RLS. Advisors: six security WARN findings (one anonymous privileged function, four authenticated privileged functions, leaked-password protection disabled); 23 RLS-without-policy INFO findings; three profile RLS performance warnings plus index INFO findings. Private-table denial is deliberate, not a reason to grant direct access. |

## Gaps and required next actions

| Priority | Gap | Acceptance needed |
| --- | --- | --- |
| Release blocker | Hosted HTTPS runtime, website production database and coordinated public/runtime routing are not established/accepted. Static hosting alone cannot run member/admin publication. | Prepare separate hosted staging first; exercise real callbacks/cookies and dynamic News routing without touching V1. Provision/configure release targets only in an approved release task. |
| Release blocker | Original public transfer inventory remains incomplete. Industry News now supplies a new blog/news destination, but legacy content/URL migration is unverified. | Reconcile every route in V2-SCOPE-AND-PUBLIC-ROUTE-INVENTORY.md. Outstanding groups include activity, careers, collaboration/contribute, credentials/Proof, events, feedback/media/mentors, newsletter/preferences, organisation/partnership, public people, project architect/paths, global search, showcase and spotlight. Do not silently label required transfers deferred. |
| High | Fresh-user signup/verification/recovery and actual meeting mail delivery remain unaccepted on hosted staging. | Allowlisted test accounts, actual email receipt, callback/expiry/reuse/error checks and provider/outbox reconciliation. No email was sent during this pass. |
| High | Full browser interest submission → receipt → admin review → offer → member acceptance remains unaccepted as one joined journey. SQL validates downstream formation, not the complete form/API/browser chain. | Use approved disposable accounts; user handles any legally binding acceptance. Recheck Team/Solo/Flexible payloads, receipt, retry and duplicate handling, then placement and Lab entry. Current real account was not submitted. |
| High | Profile/photo and multi-account/browser failure acceptance incomplete. | Test section save/concurrency, invalid and oversized images, replace/remove, private URLs, cross-account denial, interrupted saves and session expiry with disposable accounts. Existing personal profile was not edited. |
| High | Existing-member import/identity claim continuity and a small real member pilot remain unaccepted. | Prove no duplicate/mislinked identities, correct entitlements, honest homepage counts and member/coordinator/admin/read-only experience across actual devices. |
| High | Some advertised career resources have no actionable destination. | Homepage promises CV/application and interview materials but presents text rather than links to the materials. Recover verified resource destinations/access instructions or revise the promise. Third-party recording/community/resource availability needs owner acceptance. |
| High | Opportunity freshness/quality and unattended operation need operational acceptance. | UI showed 188 opportunities; a read-only query found 86 published records with future deadlines and three published records last verified more than 24 hours earlier. These queries use different predicates. Reconcile filters, source relevance and records with no closing date; prove scheduled refresh/expiry, outage handling, alerts and recovery. No pipeline scheduler was activated. |
| High | Security configuration review remains open. | Decide leaked-password protection; review intentional privileged RPC exposure and owner/verified-user guards. Review profile per-row auth evaluation before scale. No security setting or permission was weakened. |
| High | Pilot data/content must be made coherent before acceptance. | Three synthetic News articles remain. Existing active Lab fixture predates newer readiness fields and displays missing commitments/coordinator agreement; it is not evidence of a new readiness bypass. Replace with a fresh current-workflow pilot and remove demo data before release. One new labelled resource QA fixture remains as documented below. |
| High | Release operations are not accepted. | CI/default compiler build, monitoring/error alerts, backup/restore rehearsal, coordinated static/runtime/database rollback and externally accessible social-card/crawler checks. Published article sitemap/indexing must be designed for release; staging stays noindex. |
| Medium | End-to-end keyboard, screen-reader, contrast, slow-network and cross-browser/device coverage is incomplete. | Exercise all critical forms and modal focus/escape/error announcements, 200% zoom, Safari/mobile browsers and real-device navigation. A measured no-overflow result is not WCAG conformance. |
| Medium | Editorial image upload/library, scheduling and legacy blog redirects are absent. | Decide which are required before launch. Current editor supports an HTTPS image URL with alt text and manual publication; external sharing uses final live canonical URLs which are unavailable until release. |
| Low | Profile professional links accept arbitrary safe HTTPS hosts; signed-in users can still see a sign-in form. | Decide platform-specific LinkedIn/GitHub link validation and a signed-in account-entry redirect. Current HTTPS safety validation remains effective; these are quality/UX items. |

Security advisor references:
- [Privileged anonymous functions](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Privileged authenticated functions](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable)
- [Leaked-password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [RLS performance](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)
- [Private RLS notices](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy)

## Test data and evidence

All five SQL suites rolled back. A verification query found zero remaining formation/operations synthetic users. The temporary saved role was removed; the administrator's shortlist returned to zero.

One resource remains in the existing staging team `192db222-60f1-4fb4-a230-0412dff03589`:
**[QA 2026-11-04] Integrated resource save**, linked to the public ONS homepage. Its description explicitly says it is a synthetic integration test. The connector required confirmation for cleanup; that confirmation expired, so deletion was not performed or bypassed. Existing fixture records and real profile data were retained. Audit records from the successful UI action remain.

Screenshots in this chat's outputs: `mettelo-integrated-resource-save.jpg`, `mettelo-integrated-shortlist.jpg`, `mettelo-integrated-news-mobile.jpg`. The resource screenshot proves persisted shared data; the shortlist screenshot shows the temporary saved state before it was removed.

## Recommended next acceptance order

1. Resolve resource destinations and the required public-route/content inventory.
2. Set up hosted HTTPS staging with allowlisted mail, disposable accounts and a coherent fresh pilot.
3. Run one complete applicant → admitted member → delivered task/contribution journey across member/coordinator/admin roles, including profile/photo and failure cases.
4. Accept operational freshness, identity import, security settings, accessibility and restore/rollback; then request a separate release decision.

No production release is authorised by this report.
