# Website page-by-page QA and redesign tracker

Created 2 November 2026 from the website repository at local commit d6893c1. Platform remains a read-only design and behaviour reference. This is an inventory and review plan, not evidence that these pages have passed QA.

## Review sequence

0. Review the shared public header, signed-in header, desktop sidebar, mobile dock, account panels, footer, typography, controls and spacing. Fix shared defects before page-specific fixes. Recent navigation checks are partial evidence only.
1. Homepage: first impression, explanation of Mettelo, capability ecosystem, visual hierarchy, project presentation, workshops, community, career support and FAQ.
2. Full account journey: sign up → email → verified → username → profile → member home; sign in; forgotten password → email → new password → confirmation. Review each screen and failure state.
3. Member home, profile, interests, saved opportunities and account.
4. Projects and opportunities end to end. Inspect all 50 briefs for content, links and reuse instructions; test shared layouts with short/long titles and sparse/dense data. Include every interest step and the profile threshold.
5. Community guide, story, contact and trust pages.
6. Cross-page regression and release checks after the page fixes.

Work one coherent page or shared component at a time: inspect desktop and mobile → record defects and evidence → define the proposed design → implement locally → verify behaviour and layout → record the result. No blanket redesign, production deployment, member import or email send is implied.

## Page tracker

All rows start **Not reviewed in this audit**. Previous targeted checks do not make a whole page complete. Review order is shown in the last column.

| Area | Route / entry | Scope | Order |
|---|---|---|---|
| Public | / | Homepage | 1 |
| Public | /projects/ | Project library: search, facets, sort and cards | 4 |
| Public | /projects/[reference]/ | 50 individual project briefs; inspect every record | 4 |
| Public | /projects/data-use/ | Data source and reuse guidance | 4 |
| Public | /start/ | Community starting guide | 5 |
| Public | /our-story/ | Our story | 5 |
| Public | /contact/ | Contact and support | 5 |
| Public | /community-guidelines/ | Community guidelines | 5 |
| Public | /terms/ | Terms | 5 |
| Public | /privacy/ | Privacy and cookies | 5 |
| Discovery | /opportunities | Opportunity library: filters, saved state and pagination | 4 |
| Discovery | /opportunities/[id] | Opportunity detail: live, expired and invalid ID | 4 |
| Account | /signin | Sign in | 2 |
| Account | /signup → /signin?mode=signup | Sign up (shared screen, separate journey) | 2 |
| Account | /signin?mode=reset | Request password recovery | 2 |
| Account | /auth/check-email | Verification instructions and resend states | 2 |
| Account | /auth/verified | Verification success | 2 |
| Account | /auth/reset-sent | Recovery email confirmation | 2 |
| Account | /auth/update-password | Set replacement password | 2 |
| Account | /auth/password-changed | Password change confirmation | 2 |
| Account | /onboarding | Choose username; returning-member routing | 2 |
| Member | /member | Member home | 3 |
| Member | /member/profile | Profile: completion, fields, photo and save feedback | 3 |
| Member | /member/applications | Project interests: empty and populated | 3 |
| Member | /member/saved-opportunities | Saved opportunities: empty, populated and expired | 3 |
| Member | /member/account | Account and sign out | 3 |
| Member | /member/projects/[id]/interest | All five interest steps; login, verification and 70% gate | 4 |

## Routing and non-page states

The member runtime root redirects to sign in. Its contact, privacy and terms routes redirect to the public website; verify those destinations in local and production configuration. The signup alias redirects to the shared account screen; review signup separately even though it shares an implementation. Homepage section anchors are sections, not separate pages.

Include auth callback success/failure, expired or reused email links, invalid project/opportunity IDs, signed-out and unverified access, session expiry, missing username, loading, empty, validation, network/server errors, rate limiting, save failures and unavailable activity data. The app has a global error boundary and an opportunities loading screen; verify missing-page behaviour as well. API endpoints are functional checks, not additional visible pages.

## What every page must pass

- Clear purpose, useful first action, accurate language and consistent Mettelo visual hierarchy.
- Correct guest versus signed-in navigation, current-page indication, working back links, no competing menus or obscured controls.
- Layout checks at 320, 390, 768, 1024 and 1440 pixels; no unintended horizontal scrolling, clipped text, overlapping fixed controls or inaccessible footer content. Inspect landscape/short-height layouts where menus can overflow.
- Keyboard navigation, visible focus, logical headings and labels, readable contrast, meaningful image alternatives, touch targets and reduced-motion behaviour.
- Correct working links, preserved filter/form state where appropriate, clear validation, loading, empty, success and failure feedback.
- Protected actions remain enforced by the server; member information stays private; no fabricated activity, claims or statistics.

## Definition of done per page

A page is **Verified** only when its recorded defects are resolved or explicitly accepted, its desktop/mobile evidence is saved, its primary user journey and relevant failure states work, and affected shared behaviours pass regression checks. Browser-only visual checks do not prove database writes or email delivery. Use synthetic staging records for write verification; do not modify the user's real profile or submit interests simply to inspect layout.

Track each defect with: ID, route/state, viewport, screenshot, expected versus actual behaviour, severity, proposed repair, verification result and remaining limitation. Statuses: Not reviewed → Defects recorded → Fix in progress → Ready for review → Verified; Blocked includes the exact blocker. Critical means blocked access/data exposure; High means broken core journey; Medium means material usability/accessibility defect; Low means cosmetic polish.

## Current release limitations

The prior member production build failed with Windows EPERM generated-folder permissions. TypeScript, tests and local development checks passed, but the production member build is still a release blocker. Hostinger same-origin runtime routing and production database setup also need their separate release checks. No full-site QA, WCAG conformance or launch readiness is claimed.

## Exact static URL inventory (59 files)

- [ ] /
- [ ] /community-guidelines/
- [ ] /contact/
- [ ] /our-story/
- [ ] /privacy/
- [ ] /projects/
- [ ] /projects/data-use/
- [ ] /projects/mtl-ai-010/
- [ ] /projects/mtl-ai-046/
- [ ] /projects/mtl-ai-047/
- [ ] /projects/mtl-ai-048/
- [ ] /projects/mtl-ai-049/
- [ ] /projects/mtl-ai-050/
- [ ] /projects/mtl-ba-041/
- [ ] /projects/mtl-ba-042/
- [ ] /projects/mtl-ba-043/
- [ ] /projects/mtl-ba-044/
- [ ] /projects/mtl-ba-045/
- [ ] /projects/mtl-da-001/
- [ ] /projects/mtl-da-002/
- [ ] /projects/mtl-da-003/
- [ ] /projects/mtl-da-004/
- [ ] /projects/mtl-da-005/
- [ ] /projects/mtl-de-006/
- [ ] /projects/mtl-de-007/
- [ ] /projects/mtl-ds-008/
- [ ] /projects/mtl-ds-009/
- [ ] /projects/mtl-xf-011/
- [ ] /projects/mtl-xf-012/
- [ ] /projects/mtl-xf-013/
- [ ] /projects/mtl-xf-014/
- [ ] /projects/mtl-xf-015/
- [ ] /projects/mtl-xf-016/
- [ ] /projects/mtl-xf-017/
- [ ] /projects/mtl-xf-018/
- [ ] /projects/mtl-xf-019/
- [ ] /projects/mtl-xf-020/
- [ ] /projects/mtl-xf-021/
- [ ] /projects/mtl-xf-022/
- [ ] /projects/mtl-xf-023/
- [ ] /projects/mtl-xf-024/
- [ ] /projects/mtl-xf-025/
- [ ] /projects/mtl-xf-026/
- [ ] /projects/mtl-xf-027/
- [ ] /projects/mtl-xf-028/
- [ ] /projects/mtl-xf-029/
- [ ] /projects/mtl-xf-030/
- [ ] /projects/mtl-xf-031/
- [ ] /projects/mtl-xf-032/
- [ ] /projects/mtl-xf-033/
- [ ] /projects/mtl-xf-034/
- [ ] /projects/mtl-xf-035/
- [ ] /projects/mtl-xf-036/
- [ ] /projects/mtl-xf-037/
- [ ] /projects/mtl-xf-038/
- [ ] /projects/mtl-xf-039/
- [ ] /projects/mtl-xf-040/
- [ ] /start/
- [ ] /terms/

## Review log

| Date | Scope | Result | Evidence / next action |
|---|---|---|---|
| 2026-11-02 | Repository page inventory | Complete | Public static files, account screens, member pages, dynamic routes and redirect aliases listed above. |
| 2026-11-02 | Full page QA | In progress | Shared-layout first pass repaired and checked; page journeys remain open. |

## Shared-layout first pass — 2 November

| ID | Severity | Finding | Repair / evidence | Status |
|---|---|---|---|---|
| SH-01 | Medium | Signed-in footer and final homepage CTA still offered sign in | Account-aware links now point to My Mettelo and Your account; confirmed in signed-in browser | Verified locally |
| SH-02 | Medium | Account availability notice remained visible to authenticated members | Hide the prelaunch notice only after authenticated response; guest/error restoration retains it | Signed-in hide verified; failure branch code reviewed |
| SH-03 | Medium | Public active-link text was pale gold on pale sand | Dark navy active text; browser computed rgb(20,24,36) on rgb(247,239,221), visibly checked | Verified locally |
| SH-04 | Medium | Short-screen account panels lacked general height bounds | Scrollable panels bounded by viewport height; public panel bottom 327.5px in 390px-high viewport | Public verified; member rule inspected |
| SH-05 | Medium | Guest account header used a dense row of destinations on narrow screens | Compact Menu disclosure, desktop links retained; sign-in guest Menu and Escape checked | Verified locally |
| SH-06 | Medium | Mobile More did not show current section for profile/account/saved/interests | Current-page state added; profile More state confirmed | Verified locally |
| SH-07 | Medium | Public disclosure could remain open when keyboard focus left it | Close disclosures on focus departure; shared member disclosures close on viewport resize | Implemented; full keyboard traversal still pending |
| SH-08 | Low | Mobile footer trust links and small print were undersized | Trust/navigation links 14px minimum on mobile; small print 12px; 44px link targets retained | Visually checked |
| SH-09 | Low | Member support link forced production during local review | Uses the current website base URL | Code reviewed |
| SH-10 | Medium | No-JavaScript mobile navigation inherited absolute overlay positioning | Static, wrapping fallback for no-JS header | Implemented; JS-disabled browser check pending |

Evidence: outputs/qa-shared-footer-mobile.png, outputs/qa-public-menu-mobile.png and outputs/qa-signin-mobile.png in the parent workspace. No real profile or interest was saved, no account created, no password entered, no email sent and no production deployment performed.

Validation: all 59 static pages' local links and fragments resolved to existing source files/IDs; public build and four catalogue tests passed; member TypeScript and 19 tests passed. Member profile shared layout and signed-out sign-in were checked at 320/390/768/1024/1440px without document overflow. Signup at 390px had labels and appropriate autocomplete for all four required fields; this was a presentation check only. Guest public menu retained public links; signed-in homepage retained member links. Full keyboard order, disabled-JavaScript fallback, contrast across all controls, screen-reader flow, account write journeys and all individual page reviews remain open. The existing member production-build permission blocker remains.

Next review: homepage section-by-section, then the complete account journey. Do not mark any whole page Verified from this shared-layout pass.

## Homepage pass — 2 November

Status: **Ready for review for the checked local presentation; external playback and external submissions remain unverified.**

| ID | Severity | Finding | Change | Verification |
|---|---|---|---|---|
| HP-01 | Medium | At 320px the workshop load button covered the three-line artwork text | Give the button a separate row below the artwork on narrow screens | Both cards: button top equals artwork bottom; visible 320px screenshot; loaded iframe keeps 16:9 sizing |
| HP-02 | Medium | Project FAQ omitted the 70% profile threshold and repeatable-team starting rules | Describe verified account, saved profile threshold, required membership/roles and reviewed assignment | Expanded answer read in browser; 16px answer text on mobile |
| HP-03 | Low | Intro repeated the subject areas while not explaining who can start | Name Data, AI and Technology in the eyebrow; explain starting out, changing careers and developing expertise | Rendered copy checked |
| HP-04 | Low | Illustration explanation was 10px; mobile FAQ and contextual text were small | Raise illustration explanation to 12/13px, mobile FAQ to 16px and contextual notes to 13px | Computed FAQ text and mobile screenshot checked |
| HP-05 | Low | Recordings FAQ described a destination without a usable link | Add links to the learning section and official YouTube channel | Generated links checked |
| HP-06 | Low | Repeated homepage generation accumulated blank lines | Normalise repeated blank lines when writing generated HTML | Second generation produced identical bytes |

Homepage layout checked at 320/390/768/1024/1440px: no document horizontal overflow; seven ecosystem tiles, three featured projects and nine FAQs retained. Desktop project section and mobile ecosystem, hero, workshop and FAQ presentation inspected. Featured project links preserve read-brief and interest destinations, and source catalogue remains unchanged. The existing staged activity feed remains unknown until real teams are recorded.

Media check: zero video iframes before choosing Load. Both buttons created the expected youtube-nocookie embed with descriptive titles; Power Query's YouTube player controls and workshop title appeared in the browser. Focus moved into its iframe. Full playback/audio was not tested, and no external presenter form or community join was submitted. Direct YouTube fallback links remain available. External service availability is not certified by this pass.

Build, four catalogue tests and static packaging checks passed; initial local assets remain below the existing 100KB budget. Removed obsolete project-link CSS and retired grid placement while fixing the mobile card; retained reduced-motion styling. Evidence: outputs/qa-home-workshop-320.png and outputs/qa-home-projects-desktop.png in the parent workspace. No database/auth changes, community email or deployment.

Next: account journey review (sign in, signup, verification and recovery), preserving the user's staging session. Production member-build permission blocker still applies.
## Homepage arrangement correction — 2 November

User review requested a shorter banking card and the ecosystem as the second-to-last section. Removed the two-row lead-card span and changed desktop featured projects to three balanced cards with consistent title scale and aligned actions; cards stack at tablet/mobile widths. At 1440px all three measured approximately 519px high, with no fixed card height. Moved all seven ecosystem tiles after FAQ and before the final account invitation. Updated numbered section labels to follow the new order. Checked 320/390/768/1024/1440px without document overflow; public build and catalogue tests passed. Evidence: outputs/home-balanced-projects.png in the parent workspace. No production deployment.
## Homepage simplification and FAQ redesign — 2 November

Removed the exact project disclaimer paragraph requested by the user from the homepage generator. Detailed project governance and source-data pages remain the places for project rules. Simplified the opening to one short description and two actions; replaced the long three-step narrative and portfolio examples with a compact typographic Learn / Build / Show panel. Removed the redundant audience paragraph and signature from the opening.

FAQ now has three labelled groups, bordered rounded question rows, highlighted open answers, circular expand indicators and a separate contact card. Native details with a shared name allow one answer open at a time without new JavaScript. In browser, opening the second question closed the first. All nine questions retained; keyboard-native summary controls remain. Checked 320/390/768/1024/1440px without document horizontal overflow; confirmed the removed paragraph is absent and three FAQ groups render. Public build and four catalogue tests passed; initial asset budget is 99,125 bytes. Screenshots: outputs/home-simple-hero.png and outputs/home-faq-redesign.png in the parent workspace. No deployment, auth or database changes.
## Broader homepage promise and topic slider — 2 November

The left opening now connects practical experience with learning, portfolio development, career resources and opportunities. Primary actions are Join Mettelo and Explore projects. Removed the extra hero baseline slogans. The right panel has four manually selected topics: practice, learning, community and career, each with a short personal problem, a supporting benefit and a relevant page/section link. No automatic rotation or external carousel dependency.

Native horizontal scroll snap supports touch panning. Numbered topic buttons and Previous/Next work with keyboard activation; unavailable end arrows are disabled. Only the current slide is interactive after enhancement, using inert on other slides. Without JavaScript, all slides remain in the scrollable track. Reduced-motion preference selects instant transitions. Physical touch-device testing and disabled-JavaScript testing were not performed.

Browser verified: Next moves to Learning; Enter on Community selects that topic; direct Career selection reaches the last slide and disables Next; three inactive slides have inert attributes. At 320/390/768/1024/1440px all four slides remain present and there is no document horizontal overflow. Screenshot: outputs/home-broader-hero.png in the parent workspace. Public build and four catalogue tests passed; initial asset size is 99,405 bytes. Retired hero CSS was removed and source whitespace reduced to retain the existing size budget. Static preview restarted on port 3002. No production deployment or backend changes.
## Reference-style mobile drawer — 2 November

Applied the supplied reference to the shared public website navigation: white right-side modal panel, dimmed backdrop, Menu heading, explicit close button, Main/Mettelo groups, icon cues, current Home highlight, expandable Explore links and bottom Join Mettelo/Sign in actions. Uses existing website destinations rather than adding unshipped Proof/Events/organisation pages. The same navigation node moves back into the desktop header at the desktop breakpoint; signed-in navigation can still replace its destinations through the existing session endpoint. Account/auth APIs and the member application sidebar were not changed.

Native dialog blocks background interaction; explicit keyboard wrapping keeps Tab/Shift+Tab between close and the last visible menu control. Browser verified reverse wrap to Sign in and forward wrap to Close navigation, Escape closure with focus returned to Menu, explicit close, backdrop closure, and drawer presentation at 320/390/768/1024px. At 1440px the drawer closes and inline desktop navigation returns. No document overflow in those checks. Guest presentation was verified; the signed-in replacement branch and JavaScript-disabled fallback still require their separate regression checks. Reduced old mobile overlay CSS; CSS whitespace/comments compacted to retain the existing 100KB asset budget (99,962 bytes). Public build and four catalogue tests passed. Evidence: outputs/mobile-navigation-drawer.png in the parent workspace. No deployment or real account changes.
## Menu trigger polish — 2 November

Refined the shared mobile Menu trigger to a 44px-high white control with a single subtle border, 12px corners, semibold label and consistent 10px icon spacing. Removed the redundant icon margin and conflicting homepage navigation focus overrides; keyboard focus now uses a 2px blue ring with a 3px offset. Existing compact icon-only treatment below 380px remains. Public build and catalogue tests passed; initial assets 99,886 bytes. Browser verification could not be completed because the browser URL security policy rejected the reload; no alternate browser surface was used to bypass it. No visual pass or deployment is claimed for this small change.

## Account-page presentation pass — 2 November

Status: **Local presentation reviewed; end-to-end authentication verification remains open.**

Reviewed eight screen/state presentations: sign in, signup, request password reset, check verification email, verification landing, reset email sent, unavailable recovery link and password-change confirmation. Introduced a shared confirmation layout with clear headings, numbered instructions, consistent actions and a contact route. Shortened signup copy and added Account / Verify email / Profile guidance.

Repairs:
- Direct signup/reset URLs now initialise the correct form on the server, avoiding an initial sign-in screen.
- Removed the misleading “Open email app” action: its mailto link opened a composer rather than the inbox.
- Verification resend cooldown now cleans up its timer on unmount and guards duplicate working-state requests. Email APIs and redirect configuration are unchanged.
- Invalid recovery links show a focused request-another-link screen instead of disabled password fields. Valid recovery controls have distinct accessible password-visibility labels.
- Verification landing keeps conditional verification wording; reset-email confirmation retains account-privacy wording.

Validation: member TypeScript passed; 19 member tests passed; diff whitespace check passed. Browser checks at 320, 768 and 1440px found no document horizontal overflow across the eight presentations. Signup/reset direct-route headings were rechecked after the initial-mode fix. Mobile signup, verification and invalid-recovery states were visually inspected. Evidence in the parent workspace: outputs/qa-signup-refined-mobile.png, outputs/qa-verification-mobile.png and outputs/qa-reset-invalid-mobile.png.

Limits: no account created, form submitted, email sent, password changed or real member record written during this pass. Valid verification callbacks, actual resend cooldown after delivery and successful password recovery still need end-to-end checks. The valid recovery form was not exercised with a token. The existing Windows EPERM member production-build blocker remains unresolved; development rendering and TypeScript checks do not replace that build. No deployment performed.

Next: username onboarding, then member home and profile page-by-page review. These pages and the complete authentication flow are not marked fully verified by this presentation pass.

## Username setup and member-home guidance — 2 November

Username setup now uses the shared account card, explains the distinction from GitHub and describes the next profile step and saved 70% interest requirement. Its form has a clear Save and continue action and a duplicate-working-submit guard. Existing identity endpoint, validation and account gates are preserved. This account already has a username, so the new onboarding presentation and username submission remain browser-unverified; no identity was changed to force this state.

Member home now calculates completion using the same existing ten-item helper as the profile form, from saved profile fields. Replaced the misleading saved-once readiness check with the 70% eligibility result. Shows a labelled native progress bar and percentage, guides incomplete members to profile, and provides an explicit zero-interest state. Existing server-side verified-user and username gates, user-scoped counts and database submission enforcement remain intact. No new tables, migrations or permissions.

Verification: member TypeScript passes and all 19 existing tests pass, including completion-threshold tests; whitespace check passes. Authenticated staging browser displayed the saved 80% score, zero-interest message and project-discovery next action. Visually inspected home at 390px and 1440px. Screenshots: outputs/qa-member-home-progress.png and outputs/qa-member-home-desktop.png in the parent workspace. Incomplete-profile branch and new onboarding are code-reviewed, not browser-verified. No profile saved, email sent or production deployment. Existing production-build EPERM blocker remains. Next: professional profile page including field grouping, progress and photo controls.

## Simplified daily member home — 2 November

Implemented the agreed activity-first layout. Removed profile percentage/readiness prompts from home, the oversized recommendation banner, repeated standalone profile/community/support cards and the body sign-out action. Profile and sign-out remain available through account navigation; project-interest eligibility enforcement is unchanged.

The compact activity strip contains submitted project interests and saved opportunities. The current schema does not provide reliable review status or confirmed assignments for this view, so neither Pending nor Active projects is displayed. Existing authenticated, user-scoped reads are retained. The interests read now returns the latest three rows plus an exact total count; recent submissions link to their existing interest pages. Empty members receive first-project guidance; returning submitters receive their latest interests. Failure states say unavailable instead of implying zero. No synthetic task alerts or team counts.

Desktop uses a common aligned welcome, two-figure strip and main-work/discovery grid; tablet/mobile stacks the content. Mobile figure labels reserve consistent space to align the numbers. Compact footer provides help. A saved-profile confirmation still appears only after a save redirect, without turning profile completion into a homepage KPI.

Verification: TypeScript and all 19 existing member tests passed; diff whitespace check passed. Authenticated browser displayed the current account's zero-interest/zero-saved state. Visually inspected 320, 768 and 1440px; mobile figure alignment corrected and rechecked. Saved screenshots: outputs/member-home-simplified-desktop.png and outputs/member-home-simplified-mobile.png in the parent workspace. Recent-submission and query-error branches were reviewed in code but not exercised with added records or induced database failures. No user records changed, no email sent, no deployment. Production-build EPERM blocker remains outstanding.

## Shared member-page spacing — 2 November

Replaced the centred 1120px public-style column in signed-in workspace layouts with 40px desktop side insets and 16px mobile/tablet insets. Breadcrumb, content shell and footer now share the same left edge. Profile retains its 900px maximum reading width, anchored to that edge. Inspected source containers for home, profile, project interests, saved opportunities and account; all use the shared shell and receive this correction. Guest/account-only layouts remain outside the workspace selector. No page logic, account data or submission rules changed.

Whitespace check passed. Visual regression is pending: local dev server had stopped and was restarted (Ready), but browser URL policy blocked navigation from the existing connection-error page. No alternate browser surface used to bypass that restriction, and no screenshot/visual pass claimed. Next: re-open the preview normally and verify these member pages on desktop/mobile. Existing member production-build permission blocker remains. No deployment.

## Dark icon and public sharing metadata — 2 November

Changed the browser icon to a compact dark navy tile with cream/gold Mettelo mark, including a Next app icon for member/account routes. Homepage title now names the Data, AI and Technology community; description explains practical experience, collaborative projects, workshops, peer learning and career resources. Added a repeatable public-only metadata generation step after homepage/catalogue generation. It preserves page-specific titles/descriptions, supplies Open Graph image dimensions/alt text and Twitter large-image metadata using the existing community-collaboration-1200.webp (1200×800) asset. This is illustrative collaboration imagery; no claim of actual Mettelo member photography. Private member routes remain noindex.

Public build/check suite passes; initial asset budget 97,978 bytes. Preview image confirmed in the Hostinger package. Whitespace check passed. No deployment, and WhatsApp/other platform rendering or cache refresh is not verified. Metadata URLs point to the final public domain and become effective when released. Browser screenshot not claimed; existing source image inspected locally. Email templates excluded from the public metadata generator.

## Professional profile clarity pass — 2 November

Refined profile introduction, added explanations for About you / Work and goals / Professional links, and associated field examples/help with controls using aria-describedby. Completion is explicitly labelled as a draft including unsaved edits; saved information remains the only basis for project interest. Reduced repeated privacy/threshold paragraphs. Fieldsets disable during a save to prevent later edits being mistaken for submitted values. Existing optimistic version check and validation are unchanged.

Photo area now identifies the photo as optional, explains separate saving and warns to save profile edits before updating it. Added busy/status semantics and duplicate-busy guard. No upload, deletion or save performed. The existing refresh behaviour remains; warning is explanatory, not a new unsaved-navigation guard.

TypeScript and 19 existing tests pass. Browser attempt to profile route timed out; responsive appearance and control interactions remain pending. No visual pass claimed and no production deployment. Next: finish profile browser review when the local preview is reachable, then project interests and saved opportunities. Existing production-build blocker remains.

## Project interests and saved opportunities — 3 November

Applied shared collection layouts with aligned page headings, primary discovery actions, restrained guidance notices, consistent status badges and responsive cards. Project interests now has a useful first-project empty state, separate submission/brief actions, clearer role/reference information and a contact route for amendment/withdrawal. Missing participation values have a safe text fallback. Saved opportunities retains its closed/unavailable distinctions, adds an explicit view action alongside existing save/remove control and a clearer first-shortlist state. Full-page reload links replace soft retry links in query-error states. Article accessible names identify their project/opportunity.

Existing authenticated user-scoped reads and save/remove API calls are unchanged. No statuses invented: Interest received is a recorded submission, not confirmed selection or assignment. TypeScript passed after final markup/fallback edits; 19 existing member tests passed after the collection redesign. Diff whitespace check passed before final documentation update. Browser preview refused connection; restarted member dev server reached Ready, but subsequent navigation timed out. No browser presentation, populated/empty-state visual verification or write journey pass claimed. No records created/removed and no deployment. Existing production-build blocker remains. Next: verify these collection pages in-browser, then project-interest detail/form and opportunity detail.

## Interest submission and opportunity detail — 3 November

Project-interest page now handles profile-query failure explicitly instead of treating it as missing username/setup. Retains verified-account, existing-submission and saved 70% checks. Added a route back to interests, clear received-versus-confirmed wording, five-step guidance and left alignment for the transferred form. No admission rules or submission payload changed.

Opportunity detail now labels itself External listing rather than asserting OPEN from absence of a past deadline. Past deadlines are described as listed deadlines, with discovery of other roles offered. Application channel/label follows the validated HTTPS link actually used, including safe source fallback. Missing usable links have an explicit state. Hero summary limited to 220 characters; full summary retained in body. Saved-role control remains accessible for closed listings. Displayed listing status replaces underscore separators. No external application submitted or shortlist changed.

TypeScript, 19 existing member tests and whitespace checks passed. Live visual, keyboard and account-write checks remain pending; no successful browser review claimed in this pass. Existing local preview connectivity and production-build blockers are not resolved by typechecking. No deployment. Next: account page, shared error/not-found states, then consolidate outstanding browser checks before further readiness claims.

## Account and recovery screens, live preview — 3 November

Account now separates profile editing from the browser-session sign-out action, with shared card spacing and support link. Generic error text applies to any page, removes the unprovable guarantee that nothing changed and advises checking submission status before retrying a write. Added a custom not-found page with member-home, opportunity and support routes.

Opened a separate visible development preview on 127.0.0.1:3003 because the existing 3001 tab rendered older code; did not stop the other process or reload its profile form. Preview initially timed out; network permission granted and the owned 3003 server restarted, after which authenticated account page loaded. Auth settings and redirect allowlist unchanged; 3003 is for interface review, not new email-auth journeys. Browser account inspected at 390 and 1440px, mobile no horizontal overflow; custom 404 inspected on desktop. Error boundary not deliberately induced; sign-out not clicked. TypeScript, 19 tests and whitespace checks pass. Evidence outputs/account-page-live.png in parent workspace. Preview left visible on account page. No writes/deployment; production build remains unverified due earlier EPERM blocker.

## Live profile and collection follow-up — 3 November

Working 3003 preview used for authenticated review, with no profile edits or writes. Confirmed profile guidance, draft score and successful photo image loading. Found sticky profile Save bar overlapped persistent mobile dock; moved it above dock (80px plus safe area), compacted mobile actions into two columns and tightened photo spacing. At 390px, save bar bottom 764px and dock top 775px, no document horizontal overflow. Evidence outputs/profile-mobile-savebar.png in parent workspace. Profile save/upload not exercised.

Project-interest and saved-opportunity empty states visually checked at 390px in authenticated session; populated, closed/unavailable and remove/save workflows still unverified. Desktop saved-page capture clipped unexpectedly during viewport switching; do not claim full desktop visual pass from that capture. Normal viewport restored; saved opportunities left open as deliverable. CSS-only change; whitespace check passed. Previous TypeScript/test results remain applicable to unchanged component logic. No deployment.

## Tally relevance audit and 80% requirement — 3 November

Read only the header of the supplied community-registration CSV; no member responses displayed or imported. Existing profile covers name, location, role, experience level, biography, Mettelo goal and professional links. Tally additionally contains skills, technical interests, weekly contribution hours, preferred roles, problem/sector interests and community contribution. Recommended next profile extension: persist those six matching fields in the website profile schema and API, with bounded inputs and reviewed historical prefill. Keep Git/open-source experience as an optional project-specific question. Do not copy marketing/social-follow confirmations, acquisition source or old agreements into profile readiness; do not reuse historical consent. WhatsApp/employment status are not necessary for project-interest eligibility. Exact years must not be inferred from broad experience levels.

Implemented requested 80% threshold in shared scoring, API response and guard, interest-page guidance, onboarding and public project/FAQ copy. Replaced repetitive optional labels on core completion fields with Profile readiness. Incomplete profiles remain saveable with a name; eight core completion items can meet 80% without employer/photo/social links. Existing score still permits photo/link items to contribute as before; labels do not make all eight individual fields mandatory. Added forward migration 20261103120000_v2_profile_threshold_80.sql for restrictive database insert policy. Migration PREPARED ONLY, not applied: database direct inserts still use prior policy until migration; application rejects below 80% now. Existing interests unaffected. No new matching fields claimed implemented in this pass.

TypeScript, 19 member tests including explicit 70%-rejected/80%-accepted boundary, public build/check suite and 4 catalogue tests pass. Public initial assets 97,978 bytes. Browser profile displays 80% copy and readiness labels in current authenticated preview; no profile saved. Evidence outputs/profile-readiness-80.png. Database-policy test/application remains a release prerequisite; no live schema or production deployment.

## Database-backed project matching profile fields — 3 November

Added six bounded private profile strings: skills (400), technical_interests (400), preferred_roles (240), weekly_availability (40, enumerated ranges incl Not sure yet), problem_interests (400), community_contribution (1000). Form, profile column selection and API validator use the same contract. New section has field examples and a clear statement that matching fields do not change the current ten-item completion score. Eight-of-ten / 80% requirement remains. Skills and weekly availability seed the existing project-interest form for review, without automatically choosing roles or committing availability.

Applied migration website_profile_project_matching_fields to Mettelo V2 Staging jxijdjmjuzslmjxolhjl ONLY. Connector-generated version 20261103071632 recorded locally. Official CLI failed twice creating its cache despite permission grant; used connector migration with returned version rather than inventing a new filename. Schema adds nullable constrained fields and extends the existing caller-owned save RPC; verified identity, row lock, expected version, partial updates and restricted EXECUTE preserved. No new table writes granted. Same migration installs restrictive 80% insert policy, closing the earlier app/database mismatch. Platform project untouched. Production website database still not provisioned; this is not a production rollout.

DB verification: six columns present, profiles RLS enabled, anon cannot execute save, authenticated can execute save, authenticated cannot directly UPDATE skills, interest policy >=80. Rolled-back transaction roundtripped all six fields, verified version increment/name preservation, rejected stale version, >400-char skills, invalid availability, identity patch and unauthenticated caller; verified clearing a field preserves omitted matching values. All test writes rolled back. Security advisors retain known warnings for intentionally authenticated definer RPCs, existing public pilot RPC, private RLS-only tables and leaked-password protection; no new public-profile exposure introduced. Existing save RPC remains a narrow definer operation with empty search_path and caller ownership.

Form usability: section jump links, readable experience labels, dirty indicator, beforeunload warning, stay-on-profile success feedback for ordinary saves; explicit project return paths retained. Local-development-only profile API origin allowance for fixed 127.0.0.1:3003 preview avoids previous CSRF origin mismatch; configured 3001 email callback and production auth config unchanged. Tests verify preview origin is rejected in production and unrelated origins are rejected. Profile/avatar endpoints use the same helper. No browser Save clicked; full browser-to-API save remains pending, distinct from verified database RPC roundtrip.

Validation: TypeScript and 21 tests pass; diff whitespace check passes. Authenticated profile loads all six schema-backed fields. 390px view shows six controls and no horizontal overflow; section jump link and draft dirty/clear feedback checked without saving. 1440px section inspected and evidence outputs/profile-matching-fields.png saved; viewport restored and profile left visible. User record unchanged. No code deployment; member production build still carries earlier EPERM verification blocker. Historical Tally prefill is unchanged and these new fields were not bulk imported or inferred.

## Profile save-state browser follow-up — 3 November

Existing browser already displayed a successful save with unchanged draft; no new Save click performed by agent. Compared all 18 editable values before/after reload and found them identical. This verifies reload persistence of displayed values (new matching fields currently empty), not a new non-empty matching-field API roundtrip. Earlier rolled-back RPC tests cover new-field storage separately.

Changed completion guidance to distinguish saved versus dirty draft, and clears old success feedback when an input changes. Browser checked temporary skills edit triggers unsaved indicator; restored exact original value. Empty name rejected by native validity; restored original name. No submit or persistent member writes performed. TypeScript passed after final handlers; 21 tests passed before final handler-only refinement. Screenshot outputs/profile-saved-state-review.png. Browser left on profile. No deployment. Full non-empty new-field browser save, network-failure UX and concurrent-browser stale save remain separate unverified cases.

## Project-interest pre-submission browser pass — 3 November

Walked team participation through all five steps for MTL-DA-001 using clearly labelled preview-only draft text. Verified missing-role and missing-commitment feedback; current heading receives focus after step changes. Initial professional link prefilled from saved profile; skills/availability empty because saved values empty, so non-empty prefill remains unverified. Added HTTPS-without-credentials validation before Review using existing link helper; browser HTTP link rejected, blank link accepted.

Review previously omitted submitted fields. Now includes role-fit, leadership choice, availability/collaboration notes, skills and professional link, respecting solo-hidden values. Busy semantics added and progress navigation disabled while working. Found shared current-state style made dark text on dark step button; scoped sand/navy override verified computed background rgb(247,239,221), text rgb(20,24,36). Progress now states Step n of 5, helpful when mobile hides other steps. Final TypeScript passes; 21 tests passed before step-label/CSS-only refinement. Whitespace check passes.

Terms checkbox never checked, Submit Interest never clicked, no interest created. Reload cleared preview draft and returned to step one. No writes or deployment. Screenshot outputs/project-interest-progress-fixed.png; earlier review evidence outputs/project-interest-review-qa.png captured before contrast correction. New submission API end-to-end, solo/flexible branches, terms dialog keyboard loop, and 3003 submission-origin compatibility remain pending. Preview left open on clean first step. Next: opportunity discovery/detail browser QA.

## Direct apply and UK opportunity sources — 3 November

User changed the product direction: cards should send members directly to the external application source, without an internal detail step. Updated board and saved-role titles/actions to validated HTTPS external URLs, with new-tab semantics. Missing links show unavailable text; closed saved roles do not get an apply CTA. Existing detail routes retained for old bookmarks only. Browser confirms the staging card's external example.com href, target=_blank and zero View opportunity links. No link followed/application submitted. Evidence outputs/opportunities-direct-apply.png; preview still contains the existing synthetic fixture, not published NHS results.

Implemented official NHS XML adapter and official Home Office Civil Service Atom adapter, pinned fast-xml-parser 5.11.2 (install audit reported zero vulnerabilities). XML size bounded at 2MB, malformed XML/DOCTYPE rejected, redirects not followed, job links restricted to reviewed official hosts. NHS externalOnly=true, bounded keyword pagination, ID deduplication and known deadline transfer. Expanded classification/search terms for business/performance/information analysis, software/cloud/cyber/platform roles and existing Data/AI/governance/architecture families. Dry run: 1,077 NHS candidates, 21 qualified; Home Office source returned zero without error. Central CS Jobs returned bot-check HTML and beta failed; no bypass and no claim of all-department coverage.

Lean prepared batch caps 500 candidates and 320-character descriptions. Staging migration 20261103080209 extends provider IDs, admits older adverts only when a known future deadline remains, caps persisted summary and recognises two due exact-NHS-feed absences before expiry. It preserves existing HTTP failure handling/run locks/idempotent publication. Rolled-back DB test passed NHS acceptance, older-open deadline, 320-character storage and first-absence retain/second-absence expire. No real jobs published and no existing jobs expired here. Original generated SQL was blocked by automatic review due malformed replacement-token expansion. Rebuilt and inspected two-function/two-lock structure, then corrected migration applied successfully. No rejected SQL applied and no review bypass used.

Manual runner commands and prerequisites documented in docs/V2-OPPORTUNITY-PIPELINE.md. Runner activation, URL and service-role credential are absent from current .env.local; no key copied or scheduler enabled. Automatic refresh remains NOT operational. Source verification handles up to 100 due records per run. Hosting runtime/job scheduling must be configured before promising live refresh; static Hostinger delivery alone cannot run this server process. Staging tests are not production activation.

26 member tests and TypeScript pass; whitespace check passes. New tests cover NHS deadlines/host checks, external-only pagination/dedup, Atom empty/official-source cases, outage-vs-absence and UK technical classification. No deployment, member write, outbound application, real publication or destructive deletion. Production website DB and member production-build blockers remain separate release gates.


### Temporary opportunity admin console — 3 November 2026

Implemented /member/admin/opportunities with database-checked access limited to the approved staging owner account. Desktop and 390px mobile checks passed without horizontal overflow. Preview preparation returned 74 candidates, including four official DWP Digital roles, without publication. The expiry button hid one overdue synthetic record. SQL rollback checks validated admin publication, replay and archiving; anonymous and nonadmin access are denied. All 28 tests and TypeScript checks passed. No production deployment, automatic schedule or real-job publication. Further Civil Service department integrations remain necessary for national coverage.
### Additional Civil Service sources — 3 November 2026

Added CPS discovery and a guarded HMRC reader. Live run: 83 qualifying candidates; CPS returned 12 current adverts and four relevant roles. Published the prepared batch through the protected staging admin gateway and verified all four CPS cards by searching Crown Prosecution on the opportunity board. HMRC returns an HTTP 202 automated-request check and is explicitly unavailable; no HMRC jobs were published. Posting dates are never invented. CPS official adverts with future deadlines are accepted through a narrow publication rule; unrelated/no-date hosts are rejected in rollback tests. All 33 automated tests and TypeScript checks passed; security advisor findings are unchanged. Production untouched.

Admin confirmation follow-up: replaced browser window.confirm with an in-page React confirmation. TypeScript passes, but the browser button activation did not reveal the panel consistently during this run. Restarting the owned local preview process was rejected by the session's approval policy, so this UI check remains pending. Do not claim the new confirmation journey is browser-verified. Protected database publication itself succeeded and the member board displays the records.



### Admin confirmation and replay follow-up — resolved

Verified the entire browser → authenticated API → database → confirmation flow on the isolated 3004 preview. Confirmation opens, publication replay succeeds without changing row counts (86 total, 85 published, 84 unique provider IDs), search filters to the four CPS roles, and Cancel closes the panel. This supersedes the previous pending browser-confirmation note. Added a repeatable dev:preview launcher using .next-preview to avoid conflicting concurrent development output. The optional 3004 origin requires both development mode and explicit preview activation. All 34 tests and TypeScript passed. Production unchanged.
