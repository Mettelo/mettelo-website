# Website V2 readiness review — 2 November 2026

**Decision: not ready for public release.** This report supersedes historical completion claims and old build-blocker notes, without changing the agreed expanded V2 scope. Review covers the live V1 homepage, website branch 9ac1954, generated public pages, member routes, release configuration and read-only staging database checks. Platform remains source only. No application changes, production settings, data import, email campaign or deployment were performed for this review.

## Waitlist decision

V2 should have one entry route: Sign up → verify email → establish member identity/profile → member home. Sign in is for returning members. Project interest remains a separate action after account creation. A separate platform waitlist is unnecessary for this journey and currently makes the website appear to offer two competing registrations.

Recommended release change: replace the homepage waitlist section with a useful account/member call to action, remove waitlist links from shared navigation/footer and FAQ, retire the public form and its browser availability request, and update the associated checks, packaging and policy copy together. Preserve historical waitlist records, consent and opt-out status; do not silently create accounts for those people. Optional future product/news updates can have their own explicit preference. Account signup by itself must not be treated as agreement to every promotional mailing.

Keep live V1 operating until the replacement account service is hosted and accepted. Removing the live Tally route before the new signup works would disrupt community onboarding. This review has not changed either live route.

## Launch blockers and completion criteria

| Priority | Finding | Required result before release |
|---|---|---|
| Blocker | Production static signup, signin, opportunity and interest actions still use the member-access availability fallback. Only the local preview rewrites them to port 3001. | Deploy the member runtime at an agreed public HTTPS address; configure every marked public action to that address; verify cross-site navigation and callback links. |
| Blocker | Account origin guard permits only 127.0.0.1:3001; database guard permits only staging/local. | Add reviewed environment-specific production configuration, preserving destination isolation; configure production Auth URLs and SMTP/templates. Verification and recovery must work on a phone, where loopback cannot reach this computer. |
| Blocker | Supabase currently lists Platform and V2 Staging only. Separate website production project still does not exist. | Resolve project allowance/hosting choice without pausing or deleting an existing service by assumption; provision website-owned production data, replay migrations and configure private storage and backups. |
| Blocker | Expanded platform public-page inventory remains incomplete. Existing working website destinations do not cover the entire requested platform scope. | Resolve every route in the coverage table below. Transfer remaining agreed pages with working data/forms, or obtain an explicit scope decision; do not silently move them to a later version. |
| Blocker for advertised opportunities | Feed has staging samples, not an operational real feed. Database has two public/published sample rows; browser displayed one active synthetic vacancy. Runner remains staging-gated and no scheduler is enabled. | Securely configure website runner credentials, approve controlled real-feed ingestion, verify publication/expiry/source-check results, configure a supported scheduler and failure handling. Remove synthetic records from the production experience. |
| Acceptance incomplete | Project form steps and terms render; no end-to-end account submission/receipt was performed. Staging has 50 brief definitions and zero interest submissions. | Submit using a controlled test account, verify one saved receipt and duplicate retry behaviour, validate closed intake/error paths and establish who reviews and responds. All 50 briefs accepting interest does not mean 50 live teams or vacancies. |
| Acceptance incomplete | Profile photo controls and ownership policies exist; actual upload/replace/remove has not been accepted. | Verify upload, thumbnail display, replacement, removal, invalid/oversized files and cross-account isolation. Review long-open-page behaviour with five-minute signed URLs. |
| Acceptance incomplete | Real admitted-member import is prepared only; production claim continuity is not accepted. | Reconcile duplicates, import only into the website production destination, verify matching verified-email claims, and pilot onboarding with existing members before community-wide invitations. |
| Acceptance incomplete | Hosted/device pilot, monitoring, backup/restore and coordinated rollback are not verified. Main auto-deploys the static site. | Accept a public staging journey on desktop and phone, record rollback steps for both public and member deployments, confirm support ownership, then obtain release approval before touching main. |

## Journey and content defects

1. Homepage still has a platform-waitlist section, repeated waitlist links and a waitlist FAQ alongside Sign up. In the preview, its availability check ended with “temporarily unavailable.” Remove this competing journey as one coherent change, rather than just deleting a button.
2. The member-access fallback says accounts and opportunities are “being prepared,” while nearby membership instructions tell people to create an account. Keep a truthful prelaunch state, then switch copy and destinations together at release.
3. Several Explore projects/Project Studio links still lead to the old external GitHub Pages library while other links lead to the new website catalogue. Make the website catalogue the primary destination; retain master repository/source documentation links within briefs.
4. “Access application tools” and “Access interview resources” lead to signup, but signup ultimately opens a general member home. Verify that a member can actually reach the promised resources and existing community channels after joining; label access requirements clearly. Do not imply signup itself grants every private-space permission.
5. Confirmed navigation bug: an unauthenticated request to a specific member project-interest URL redirects to plain /signin. Middleware discards the requested destination before the page's own next parameter can run. Preserve a validated internal destination so signin returns to the intended form.
6. Member home now exists and has profile, projects, opportunities, saved opportunities, project interests, community and support navigation. It is not the entire platform dashboard: no active-team/run/task/contribution/Proof data is connected. Acceptance must distinguish these remaining dependencies rather than invent counts or completion.
7. Project interest has no self-service amendment/withdrawal or reviewer console. The UI directs people to contact Mettelo. Confirm an operational intake/review/support process before inviting submissions; selection and placement remain separate.
8. Five briefs lack verified data-guide documents and ten lack verified governance documents. Pages explicitly disclose this; do not infer dataset licensing. Resolve source guidance before authorising actual work on those briefs, even if people can browse or register interest.
9. Historical development documents still refer to Tally project forms, an absent member app, earlier sample counts and older build failures. This dated report and the native-interest document describe current evidence; consolidate outdated guidance before team handoff.

## Public scope coverage

Existing public static preview has **59 pages**: homepage, start guide, story, community guidelines, terms, privacy, contact, project catalogue, data-use guide and 50 project details. All 59 returned HTTP 200 with one H1 during this review. This proves page reachability, not full visual, accessibility or content acceptance.

The table accounts for every route in V2-SCOPE-AND-PUBLIC-ROUTE-INVENTORY.md. Mapped destinations require owner content acceptance; mapping is not a claim that all platform behaviours were transferred.

| Platform route(s) | Current website destination / gap |
|---|---|
| / | Refreshed homepage preview; competing waitlist and release fallback remain. |
| /about | Existing /our-story/; compare/accept content equivalence. |
| /community | Existing /start/ and homepage community/resources; not an equivalent platform community application. |
| /community-guidelines, /contact, /privacy, /terms | Existing static policy/support pages. Member-app policy links currently redirect to live V1 policies; deploy updated V2 policies in the coordinated release. |
| /faq | Homepage FAQ section; update account and waitlist answers. |
| /join, /membership | Website signup plus homepage membership section; not a full standalone platform membership-page transfer. |
| /signin | Member app signin and signup/reset modes; hosted callbacks pending. |
| /opportunities, /opportunities/[id] | Listing/detail UI, filtering and saving transferred; real data, scheduling and hosted acceptance pending. |
| /projects, /projects/[id], /projects/master/[id] | Website catalogue, 50 static detail pages and master-repository links; no full platform project runtime. |
| /activity | No equivalent page transferred. |
| /blog, /blog/[slug] | No blog index/content/detail transfer. |
| /careers, /careers/[slug], /careers/applications | No internal Mettelo careers/application journey transferred. External opportunity listings do not replace it. |
| /collaborate/[id] | No collaboration-detail/application transfer. |
| /contribute | Existing resource/volunteer links are not a full page/form transfer. |
| /credentials/[credentialId] | No credential-verification page/data transfer. |
| /events, /events/[slug] | Recorded-workshop links exist; no events listing/detail/registration transfer. |
| /feedback | No feedback page/form transfer. |
| /media | No media page/content transfer. |
| /mentors | No mentor directory/application transfer. |
| /newsletter, /newsletter/preferences | No newsletter subscription/preference journey. The platform waitlist is not equivalent. |
| /organisation, /organisations, /partnership | Homepage organisation contact CTA only; no equivalent dedicated page/form transfers. |
| /people, /people/[id] | No public people directory/profile transfer. Website member profiles are private. |
| /project-architect | No equivalent page/form transfer. |
| /projects/paths, /projects/paths/[slug] | No project-path index/detail transfer. |
| /proof/[id] | No public Proof verification/data transfer. |
| /search | Local project/opportunity search exists; no platform-wide search transfer. |
| /showcase | No showcase transfer. |
| /spotlight, /spotlight/[id] | No spotlight index/detail transfer. |
| /submitted | Native project-interest receipt exists; no generic platform form confirmation route or all advertised forms transferred. |

## Verification evidence and limits

- Latest static build/checks passed in the preceding implementation, with three catalogue tests and all existing public suites. This review independently checked 59 public HTTP destinations.
- Member **production build passed on Node 22.23.4** in a separate .next-check output. The earlier Windows build blocker is resolved for this build. There are two non-fatal CSS compatibility warnings about end versus flex-end. This is a staging-config build, not a hosted production runtime acceptance.
- Existing member tests: 17 passed in the preceding implementation. Packaging tests: 2 passed again. Static output audit: 91 public files, no member application source, PHP, environment files or private-data paths.
- Signed-out member pages redirected to signin. Signin/signup/reset and email-state pages responded. Four supported POST APIs rejected missing-Origin requests with 403. Profile's unsupported POST returned 405; its implemented write method is PATCH. Invalid opportunity IDs displayed the framework not-found path; streamed responses can initially report HTTP 200.
- Browser inspected live V1 versus V2 homepage, signed-in member home and active synthetic opportunity feed. Prior implementation traversed every interest step and opened terms without accepting/submitting on the owner's account.
- Responsive override in this review did not affect the inspected homepage: DOM measured 1280 viewport, 1265 content and 1265 scroll width. Count only that desktop no-overflow result; do not claim a new phone pass. Full route/device/accessibility checks remain incomplete. Existing expired invites or restricted third-party resources were not exhaustively accepted by a new member in this review.
- Read-only Supabase check confirmed only Platform and V2 Staging projects. No production website project exists. Staging public record counts: 50 briefs, zero interest receipts and two published/public opportunity samples (one visible active sample).
- Security advisors flag disabled leaked-password protection and two authenticated SECURITY DEFINER profile functions. Their migrations and deployed metadata show verified-user checks, owner-derived writes and fixed empty search paths; authenticated invocation is intentional, not automatically proof of a vulnerability. Three private tables have RLS without browser policies, consistent with denied direct browser access. Review this deliberate design and decide password-protection configuration before production; do not loosen private-table access merely to remove informational notices.

Advisor references: [profile-function warning](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), [private-table notice](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Recommended next work order

1. Clean up the public journey: retire public waitlist, unify project links, fix resource promises, preserve signin return destinations and update policies/FAQ/checks together.
2. Resolve the public-route coverage table and the required member-home data dependencies with the owner. Complete the agreed missing transfers; do not declare V2 done from page reachability alone.
3. Prepare public HTTPS staging/member hosting and website production database, then configure environment-specific origin, email and routing. Keep live V1 untouched while verifying the replacement.
4. Activate and verify the website opportunity pipeline, perform synthetic end-to-end interest/photo/error checks, and validate admitted-member import/claim continuity in the correct destination.
5. Run a small member pilot, verify public/member release and rollback together, then seek explicit release approval. Invite the community only after production smoke checks pass.
