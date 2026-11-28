# Mettelo V1 progress

## Homepage — ready for review, not approved

Continues from main commit `6ec40b37552e46028cf33cfb4a80c4ca250e20e3`.

Implemented: career-first homepage, six member benefits, getting-started steps, seven ecosystem areas, external resource directory, membership CTA and FAQs. Preserved membership/project forms, Project Library, GitHub, YouTube, Discord, both OneDrive destinations and official social links.

Final review changes: official tagline in accessible HTML, shared design tokens, removed obsolete design styles, readable source, improved mobile navigation focus and no-JavaScript fallback, footer navigation, SVG favicon and social metadata. No backend or live infrastructure changes.

## Approval gate

Wait for explicit homepage approval before moving to Start Here. Individual CV reviews, mock interviews and mentoring session availability still need confirmation before advertising dedicated bookable services. Employment and project placement are not guaranteed.

## Remaining pages, in order

1. Start Here / New Member Onboarding — not started.
2. Community Guidelines — not started.
3. Learning & Resources — not started.
4. Project Studio — not started.
5. Get Involved — not started.
6. FAQs — dedicated page not started (homepage has a short FAQ).

Production domain/hosting verification and deployment remain separate from this homepage preview and PR. Set canonical and social image URLs once the actual production route and hosted image are confirmed.

## Validation for this review
- Static checks and JavaScript syntax: passed.
- Browser review: desktop full page, 768px tablet and 390px phone.
- Verified menu open, Escape close, section focus transfer and native FAQ expansion; no browser console errors observed.
- Tablet navigation and hero now switch to the stacked layout at 900px.
- No horizontal overflow at reviewed tablet/phone widths. Local asset budget: approximately 47KB before compression.
- No formal Lighthouse score or full assistive-technology certification claimed. Third-party form submissions were not performed.

## Phase 2 — Start Here / New Member Onboarding
Explicitly requested by the user after homepage review. Implemented on a separate branch based on homepage-final-review; PR #1 remains unmerged and its approval is not assumed.

/start resolves to the static start/index.html route. Reuses official assets, tokens, shared navigation/footer and progressive navigation. Adds seven-step browser-local checklist, eight exploration cards, the eight-stage pathway, eight essential services, expectations, FAQs and social channels. Membership and project participation remain separate. The Community Guidelines checklist item links to an interim summary while the dedicated page is pending.

Static and state tests cover persistence/reload, unchecking, completion/reset, malformed data and blocked storage. External HEAD checks returned 200 for Tally, Project Library, YouTube, Discord, GitHub and social destinations. Both supplied OneDrive links redirected but returned 403 to automated requests; preserve them and verify access in a normal signed-in browser before release. No forms were submitted.

Status: onboarding ready for review after browser QA; do not begin Community Guidelines until the user approves the next step. No live domain or hosting changes.

Browser QA completed: desktop full-page inspection, 768px tablet and 390px phone; no horizontal overflow at the tested widths. Verified checkbox keyboard operation, persistence across reload, reset, FAQ expansion and mobile menu Escape behaviour; no console errors observed. Start Here is awaiting approval; Community Guidelines has not been developed.

## Phase 3 — Community Guidelines & Membership Guide
Explicitly requested by the user via pasted brief. New static /community-guidelines/ page builds on start-onboarding; earlier PRs remain unmerged. Implemented introduction, membership/access roles, ten standards, learning/mentoring guidance, project/GitHub expectations, evidence/career boundaries, responsible data sharing, reporting placeholder, proposed moderation disclosure, the four membership statements and existing community links.

Navigation/footer and onboarding checklist now link to the full guide. No membership acceptance controls, new storage or backend. POLICY-REVIEW.md records the decisions needed before adoption/public launch: standards approval, reporting route/responsible admins, report handling/moderation decisions, Privacy Notice and confirmation of live Tally agreement text.

QA: homepage, onboarding and cross-page checks passed; routes, anchors and assets resolve. Browser review covered desktop, 768px tablet and 390px phone, contents links, native moderation disclosure, menu/Escape, onboarding-to-guide navigation and membership statements. No horizontal overflow or console errors observed. Existing external links were retained; the previous OneDrive automated-access limitation remains. No forms submitted; no domain or hosting changes.

Status: Page 3 ready for review, policy content not approved. STOP before Page 4 (Learning & Resources) until explicit user approval.

## Page 4 — Our Story & Meet the Founder
User explicitly selected Our Story as the next page. Built /our-story/ on the community-guidelines review branch. Reuses official assets, tokens, shared navigation/footer. Includes the learning-to-experience narrative, community foundation, mission/vision, Community/Labs/Proof/Talent overview, founder biography, personal motivation, approved message, professional links and participation/membership CTAs. No dated timeline or invented milestones.

The user supplied O. Johnson Taiwo's approved name/title, over-seven-year professional background, MBA/postgraduate qualifications, motivation, UK/US/Nigeria vision, founder message, LinkedIn and professional website. Implemented those supplied details. An approved founder photograph is still missing; the visible brand-mark placeholder is labelled accordingly. FOUNDER-CONTENT.md tracks that publication requirement. AboutPage/Person structured data uses supplied details only, without a portrait/founding date.

Our Story links were added to all page headers/footers. Expanded navigation now uses the existing disclosure pattern below 1101px to avoid crowding. No completed page content was rewritten. No database, accounts, payment systems, domain or hosting changes.

QA: all four pages/routes/assets/anchors pass static checks; onboarding persistence tests remain passing; JavaScript syntax/whitespace checks pass. Browser QA: desktop, 768px tablet, 390px phone, founder anchor and menu/Escape; no horizontal overflow or console errors observed. Personal website HEAD returned 200; LinkedIn HEAD returned 405 (automated verification limited). Existing service links preserved. No forms submitted.

Status: Our Story ready for review with portrait pending. All review PRs remain unmerged. STOP here and wait for explicit approval before developing another page.

### Founder portrait follow-up
The user supplied the founder portrait. Replaced the pending placeholder and removed the missing-photo notice. Added 480px/960px WebP variants (about 16KB/60KB) and a 960px JPEG fallback (about 77KB), alt text, dimensions, lazy loading and async decoding. Portrait pixels were only resized/compressed. The outstanding portrait requirement is resolved; the page and PR still await approval.

## Terms review checkpoint — 21 October 2026
Adapted platform public content to a draft V1 Terms page. Added shared trust links and source/data-flow gap analysis. Privacy, Cookies and Contact remain audit-only pending approval. Five local check suites pass; no production deployment or domain changes. See TERMS-REVIEW.md and docs/V1-TRUST-GAP-ANALYSIS.md.

## Public-site quality and waitlist review — 21 October 2026

Owner requested a cross-page public navigation/footer/content review and a future-platform waitlist. Start Here is now unlisted/noindex while remaining accessible by direct URL. Shared static header/footer templates keep all five pages consistent. Removed repetitive Our Story cards; approved founder content and integrations preserved. Implemented PHP/HTML Hostinger waitlist to owner-confirmed hello@mettelo.com with validation, consent, private abuse counters and failure handling. Collection disabled until approved notice/privacy arrangements and actual Hostinger delivery verification. Seven Node suites, PHP syntax/handler tests and disabled-endpoint HTTP checks pass. Desktop/tablet/mobile reviews complete. No deployment or domain changes. See docs/PUBLIC-SITE-QUALITY.md and docs/HOSTINGER-WAITLIST.md.


## Trust pages and launch handover — 21 October 2026
Completed Terms, Privacy, Community Support and Guidelines wording using owner-confirmed Mettelo Technologies Limited and 18+ eligibility. Removed public version/draft/pending labels. Added retention/basis/transfer/operations record and Hostinger step-by-step guide; website metadata/sitemap excludes onboarding. Checklist no longer creates initial storage and reset removes it. Existing Tally flows remain; no new membership/access system. Provider/retention/form-notice checks and real Hostinger delivery remain launch tasks, with waitlist disabled. No production/domain changes.


## Product design refinement — 21 October 2026
Updated the Discord invite to the owner-confirmed yy9qJZ7W link. Refined all seven pages with a lighter editorial system, page-specific layouts, native-radio support finder, local resource search, onboarding resume shortcut, mobile contents/section state and contact copy affordance. Existing legal content, integrations and waitlist gate preserved. Nine Node suites and PHP handler tests pass; all pages reviewed at 320/390/820/1280px with no horizontal overflow. Targeted contrast issues found during review were fixed. No tracking, production deployment or domain changes. See docs/DESIGN-REFINEMENT.md.


## Homepage correction — 21 October 2026
Restored the earlier dark homepage, compact three-row desktop ecosystem and two-column resource directory following owner feedback. Added Apply for membership, Explore member support and Join the waitlist hero buttons. Corrected Discord and waitlist form preserved. Shared generation now keeps homepage styling separate from supporting-page refinements. No deployment or collection activation. See docs/HOMEPAGE-CORRECTION.md.


## 5 November 2026 — admin readiness fixes
News/application server imports, SEO release gates/live sitemap, private support ownership, review counts, email readiness visibility and offline migration checks implemented. 106 integrated checks pass; production build remains blocked by Windows EPERM. Email delivery and real-member migration remain inactive. See docs/V2-ADMIN-READINESS-FIXES-2026-11-05.md for evidence and remaining release gates.

## 5 November 2026 — occupational taxonomy pipeline upgrade
Integrated the supplied role library into 21-category rule-based discovery/classification, structured metadata, contextual review previews and version guards. Bounded rotating search plans and explicit checkpoint restart are in place. 136 unit/107 integration checks and six rolled-back SQL groups pass. Existing listings/schedules unchanged. See docs/V2-OPPORTUNITY-TAXONOMY-2026-11-05.md.

## Pipeline quality corrections · 2026-11-05

Implemented v9 duplicate holds, corrected compound occupations/warehouse exclusion, regional source checks and evidence-based public-sector context. 143 unit, 107 HTTP and 7 rollback SQL groups passed; TypeScript/static build passed. Final preview 63 eligible / 67 review, including 4 duplicate holds; 232 published listings untouched. No publication or email/schedule activation. Details: docs/V2-PIPELINE-QUALITY-2026-11-05.md.

## Hosted staging architecture preparation · 2026-11-05

Audited hosting, routing/auth, database/storage, email, SEO and build boundaries. Added one-origin staging assets/routing, exact staging URLs, access protection, environment preflight, standalone packaging/start and manual Linux build workflow. Hostinger Business confirmed Node 22 and 1/5 web-app slots. 147 unit, 107 local HTTP and 20 hosted-configuration HTTP checks passed; TypeScript/static build passed; dependency audit 0 known production vulnerabilities. Hosted DNS/SSL/callbacks/Linux production build and three-account UAT remain pending. Reviewed all 22 cleaned malware-history rows: hometechway.com only; shared-account security follow-up required before deployment. No production, DNS, VPS, account, email or schedule changes. See docs/V2-HOSTED-STAGING-ARCHITECTURE-2026-11-05.md.

### 2026-11-05 — Separate hosted staging deployment

- Hostinger Linux build and standalone environment-file check passed from source commit 98fdfa7. Separate staging.mettelo.com app deployed; Next.js ready in 581ms, zero startup errors shown.
- Verified HTTPS and 503/noindex/no-store on five anonymous page/API/asset routes. Owner staging credential and exact Supabase callback remain pending; no shared UAT yet.
- Production/main, VPS, member data, email activation and schedules unchanged. Shared-hosting historical WordPress security follow-up remains before shared testing.

### 2026-11-05 — Member enquiries and workspace alignment

- Approved local-preview fixes: remove the centred 1080px member-home constraint; align breadcrumb, hero, KPIs and lower cards with 40px desktop / 16px mobile gutters. Improve supporting-text readability without new homepage sections or navigation.
- General enquiries now work without a project placement. Existing private support inbox, ownership, replies and notifications are reused. General/project topics have server-side boundaries; explicit team enquiries retain placement checks. Nonces prevent duplicate retry submissions, reporter identity comes from auth.uid(), and creation is limited to five per hour.
- Applied isolated staging migration 20261105182110_website_general_member_enquiries. Existing records and staff roles retained; no public table grants. Member footer Support now opens My enquiries. Enquiry dialog has one scroll container on mobile and locks background scrolling.
- Verification: 147 unit tests; TypeScript; eight SQL groups in rollback (submission, retry, cross-member privacy, writer/editor separation, staff notes, replies/notifications, closure, project scope, account restrictions and rate limiting). Nine existing accounts remain; zero synthetic accounts/enquiries retained. Security-advisor counts unchanged.
- Browser: signed-in owner with no current placement can open General help and see its four topics; empty submission stays in the form with native validation. No real support message sent. Member home tested at 1920, 1024, 768 and 390px; no horizontal overflow and breadcrumb/content alignment matched at all four sizes. Mobile enquiry has one internal scroll container.
- UI changes are available on local port 3001 only; hosted staging has not been re-uploaded. The exact Supabase Auth callback remains an unsaved draft awaiting separate confirmation. Production, email delivery and schedules unchanged.

### 2026-11-05 — Multiple placement responsibilities

- Approved local-preview change: solo owners automatically receive every selected essential responsibility; team members can receive several roles. People and capacity are still counted per member, with coordinator agreement unchanged.
- Migration 20261105185608_website_placement_responsibilities adds a validated responsibilities array and preserves canonical primary roles. Existing memberships backfilled with their original role only. Formation, additional offers, acceptance displays, Lab roster, admin member directory, email previews and public role-coverage aggregates carry all responsibilities. No existing accepted placement was reassigned.
- Readiness and activation guards recognise all assigned responsibilities. Project-catalogue validation rejects foreign roles; staff authority and placement constraints remain. Accepted role sets cannot be silently edited.
- Verification: 150 unit tests, TypeScript, six rollback SQL groups covering solo/team offer → acceptance → readiness → start → roster, plus existing formation and operations rollback suites. No test identities retained; nine existing accounts remain. Security-advisor counts unchanged. Operations test now prioritises its own synthetic outbox entries so unrelated older staging jobs cannot invalidate its queue assertion; no mail provider called.
- Browser: previewed solo auto-assignment and team multi-selection without submitting offers. Formation references reset when switching arrangement. Responsibility dialogs use one scroll container. Hosted UI remains unchanged; no emails, production deployment or Auth URL save.

### Follow-up review requested during this build — approved and implemented below

- Offer copy must identify actual Solo/Team placement. Flexible is an application preference, not a third working arrangement; show which arrangement this offer uses and whether additional teammates may join. Never silently convert Solo to Team.
- Current solo test is accepted but repository access is unchecked. Staff preview is visible to the owner because the account also has administrative access; ordinary member entry still waits on activation. Separate staff preparation copy from member-facing readiness.
- Propose one member acceptance, clear remaining blockers/owner, and automatic Lab activation when existing readiness checks pass, avoiding an extra manual Start action. This changes workflow and has not been implemented or approved yet. Do not automatically claim external repository access is verified.
- Lab focused tabs centre content at 1180px; other tabs reserve a 286px right rail with duplicated loose links. Propose one consistent full-width Lab workspace across all tabs with useful text widths inside panels and existing nav providing context/actions.
- Chat hides its composer when workspace is forming/paused/completed or viewer is unassigned; it currently labels all assigned read-only states as completed. Propose accurate state-specific messages; composer for active assigned members, project notes wording for Solo, and a compact input fixed within the Chat panel. No request to weaken access checks.

### 2026-11-05 — Clear placement journey and consistent Lab workspace

- User approved the preceding review. Solo/Team offer and acceptance labels now name the actual arrangement; Flexible is shown as the original application preference. Solo explicitly promises independent work without surprise teammates. Member home uses the same journey copy.
- Isolated staging migration 20261105191350_website_lab_ready_activation prepares the starter milestone after ownership/coordinator confirmation and activates forming placements after validated readiness-changing actions when every check passes. Members accept once; remaining checks are visible on their card. Repository access is never inferred. Existing account, role coverage, commitment, coordinator, two-person consent and project capacity gates remain. Paused work still requires deliberate administrator resumption; additional active-team members still require onboarding admission. No migration-time activation or reassignment of existing placements.
- Admin readiness explains automatic initial opening; Resume remains explicit. Successful acceptance redirects directly to a newly opened Lab. All Lab tabs share the same available-width layout, without a separate right rail. Solo navigation uses Notes/Responsibilities. Chat composer is contained in the panel and read-only messages distinguish preparation, pause, completion and unassigned staff preview.
- Validation: 157 automated tests and TypeScript pass, including rendering the actual Solo/Team Chat component to verify its labelled textarea and Send control, and absence of a writable composer in preparation. Five rollback activation groups plus six multi-role and eight enquiry regression groups pass. Existing multi-role tests now assert automatic opening rather than invoking a redundant manual Start. Synthetic fixtures all rolled back; nine existing accounts remain. Security-advisor categories/counts unchanged from the preceding review.
- Browser verified current accepted Solo card and its actual repository-access blocker; notes layout has no horizontal overflow at 1920, 1024, 768 and 390px. Current user placement was not activated or marked verified. Active-member note submission is covered in rollback SQL; interactive composer still needs the planned signed-in active-member journey check. Saved local preview screenshots in hyi/outputs.
- Frontend available locally on port 3001, not yet uploaded to hosted staging. No production changes, email sends, schedule activation or Supabase Auth URL save.

### 2026-11-05 — Restore clear Chat naming

- User clarified that shared member chat must remain prominent. Restored Chat on Solo desktop/mobile navigation, heading and overview link instead of Notes. Team messaging remains the existing shared bubble conversation with message input and Send; no AI chatbot was added.
- Read-only Chat now retains a visible disabled message field and Send control alongside the precise access explanation. Actual member/status permissions are unchanged. Corrected composer grid placement so the accessible label cannot occupy the message-input column.
- Seven affected render/journey tests and TypeScript pass. Browser verified the current Solo preparation view with Chat navigation, correctly positioned input and Send, and clear preparation message. Screenshot: hyi/outputs/mettelo-chat-restored.png. No placement activation, repository verification, external messages or hosted deployment.

### 2026-11-05 — Lab functionality and mobile/tablet audit

- Reviewed all ten Lab destinations: Home, Plan, Tasks, Chat, Data, Contributions, Meetings, Support, Resources and Team. Meeting booking and contribution controls were hidden by the current forming status, rather than deleted. Both actions are now discoverable in the header and open their existing editors. In unavailable states, the editor states why it cannot save and keeps its fieldset disabled; handlers also reject a submit before any request. Active member forms retain their existing API and backend authorisation.
- Forming, paused and completed views receive accurate explanations. No readiness requirement was removed or auto-verified. Current MTL-AI-010-S02 still needs repository verification. No existing user or placement was changed.
- Lab dialogs now use one scroll container, lock background scrolling, fit the viewport and retain 44px close controls. Phone/tablet inputs use 16px text, form rows wrap, and contribution actions remain visible. Browser opened the actual meeting and contribution editors on mobile and tablet, verified their fields, permission messages, no horizontal clipping and single scrolling area. Mobile More reaches Contributions and Meetings.
- Browser checked every destination at 360, 390, 768 and 1024px: 40 successful page/width checks, no horizontal overflow or application errors. Evidence saved in hyi/outputs/mettelo-lab-responsive-audit.json, mettelo-meeting-form-mobile.png, mettelo-contribution-form-mobile.png and mettelo-contribution-form-tablet.png.
- Verification: 161 automated tests and TypeScript pass. Extended rollback SQL covers active Solo owner and ordinary Team member meeting creation/retry/edit/cancel, contribution attribution and persistence, resource links and Chat, plus task creation → assigned-member progress → coordinator review. Eight activation/functional groups pass, as do existing operations and delivery SQL suites. Those older fixtures now assert automatic opening instead of issuing a redundant Start. Nine existing accounts remain; zero synthetic test identities retained. No email provider was called.
- Remaining release check: a signed-in multi-account journey on hosted staging, including actual browser save/refresh/re-login and cross-member visibility, still needs completion before production. Local/read-only UI checks and rollback backend tests are not a production release approval. Hosted frontend, production, Auth URL settings, email delivery and schedules unchanged.

### 2026-11-05 — Current member photo on Lab roster

- Fixed reported Johnson card showing J while the header showed his photo. The roster previously rendered initials only. It now receives the current member's existing short-lived private photo URL from the cached header account, with an image-error/missing-photo initials fallback.
- Other members retain initials under the existing owner-only photo-storage policy; no bucket was made public and no cross-member photo access was granted. No database migration or profile mutation.
- TypeScript passes. Browser verified the actual photo loaded at 52px desktop and 44px mobile, without mobile horizontal overflow. Screenshot: hyi/outputs/mettelo-team-photo-fixed.png. Existing placement is now active following user activity; this fix did not activate it or change access. Local frontend only.
