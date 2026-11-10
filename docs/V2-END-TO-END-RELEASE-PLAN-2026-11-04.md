# Mettelo integrated release and migration plan — 4 November 2026

Owner direction: finish one coherent public → member → admin experience, prove it with a three-account hosted staging pilot, then migrate current operations silently and invite members after an approved launch. Keep the product simple. This document updates the plan; it does not authorise sending real emails, creating accounts, importing real members or deploying production now.

The approved member home stays: next step → compact progress → activity → smaller Profile/Opportunities panels. The bell stays between Home and the profile thumbnail. No extra member-home modules or legacy-platform feature parity are implied.

## Current evidence and actual gaps

The initial plan used source/document evidence against 0505c01. Phase 1 local browser/source/HTTP review against c00a2f0 is now complete: see V2-INTEGRATED-JOURNEY-REVIEW-2026-11-04.md. Fresh integrated checks passed 94/94, with navigation/application-state gaps identified beyond route tests. Hosted cross-role write acceptance and email delivery remain unverified; no production readiness is implied.

| Area | Current evidence | Next acceptance work |
| --- | --- | --- |
| Member home / bell | Built, with earlier local build/browser/HTTP/rollback SQL evidence. | Repeat the complete journey with real pilot accounts on HTTPS staging. |
| Coordinator / project leader | Admin can nominate a coordinator during formation or later. The nominee accepts their place and agrees to coordinate; readiness controls govern start/resume. Solo projects have an owner. | Test nomination, agreement, coordinator permissions and replacement. Confirm exact wording in public/member/admin views. |
| Placement administration | Existing admin can offer, admit, release and restrict placements with reasons, readiness checks and preserved attribution. | Verify release does not leave open work orphaned; separately check external repository/meeting access. |
| Global member administration | No all-members management page in the current admin routes. | Propose one controlled Members page; distinguish account suspension from removal from a project. |
| Account email | Branded verification/recovery templates and existing auth flows; historical controlled recovery evidence. | Fresh signup, recovery, activation and expired-link tests on hosted staging. |
| Operational email | Controlled staging-only meeting worker with allowlist, queue/idempotency and unknown-outcome handling. In-app events do not establish delivery of application/offer emails. | Add only the essential touchpoints below; verify provider/sender settings and actual delivery. |
| Project reminder | Bell offer-deadline reminder exists; no once-only return-to-project email found. | Add the separate, bounded reminder policy below. |
| Navigation/footer | Public menu and social links already exist; member menu is separate. Member footer has Support/Privacy/Terms. | Review the whole generated site for consistency, stale copy, mobile routes and current official social destinations. |
| SEO | Public home has canonical/social metadata; News has article metadata; runtime/staging has noindex safeguards. | Define environment-aware indexing, especially public runtime routes, and test the actual production headers/robots/sitemap before launch. |
| Existing forms/import | Private Tally profile-import planning exists with duplicate handling. It is not an implemented full operational migration. | Reconcile both source forms and current project operations, then rehearse identity/placement continuity. |

## Phase 1 — Integrated preview and journey audit

Use the existing public home, new public menu, member home, Lab and admin in one review session. The local public preview is http://127.0.0.1:3002/ and member runtime is http://127.0.0.1:3001/member. Local previews using the staging database are not the same as a hosted HTTPS staging environment.

- Walk signed-out public home → project catalogue/brief → account creation → verified profile → application → admin review/offer → member response → coordinator/readiness/admission → Lab → evidence/progress → support → completion.
- Check signed-in public navigation, return destinations and refresh/back behaviour as well as first-time signup. An existing applicant must never be silently signed up twice.
- Review the public menu as it exists: Projects, Opportunities, Industry News, Ecosystem, Explore and account entry. Home remains reachable through the logo/mobile menu. Explore consolidates learning/community/story/support rather than adding top-level links.
- Preserve member Home, Mettelo Lab, Applications, Projects and Opportunities. Keep Profile, Resources, Enquiries and Account settings in the account menu. Keep the notification bell separate from navigation and applications counts.
- Record each failure with route, role, expected/actual behaviour and severity. Repair existing journeys; do not resurrect the old missing-route inventory.
- Acceptance: no dead ends, duplicated account creation or misleading next steps; clear loading/error/retry states; no member sees another team's private work.

## Phase 2 — Lean operational gaps

### Email touchpoint proposal

| Touchpoint | Proposed email rule |
| --- | --- |
| Account verification / requested recovery | Essential identity email. Keep existing branded flows and test hosted callbacks. |
| Application submitted | One receipt per successful application, with the project and a direct application link. Do not promise selection. |
| Place offered / admin selection | One action email with project, role, actual response deadline and Review offer link. Clarify that an offer is different from member acceptance and Lab admission. |
| Acceptance / Lab ready | Confirm the member's response in the UI/bell. Send one ready-to-start email when access is actually available; combine confirmation and readiness when they occur together. Avoid consecutive duplicate welcome messages. |
| Clarification or decision requiring attention | One relevant action/outcome email, not an email for every internal review status. Never include private admin notes. |
| Coordinator nomination | Action email only where a separate agreement is needed; include it in the offer email if both happen together. |
| Meetings | Retain necessary calendar invitations, meaningful changes and cancellations through the existing controlled worker. |
| Support reply | One thread update for a member-visible staff reply, with a private enquiry link. Internal notes never email the member. |
| Project continuation reminder | One reminder per eligible placement under the policy below. |
| Migration launch | One activation/return email per approved recipient, only after approved cutover and verification. |

Ordinary chat, routine task updates, KPI increases and marketing digests stay out of the email plan. Security email behaviour is reviewed as part of account protection rather than mixed with engagement mail.

Proposed reminder policy, subject to owner confirmation before implementation: one email after seven days without meaningful recorded project activity, measured from admission or the member's last contribution/task update. Only confirmed, admitted members of active Labs with unfinished work qualify. Exclude paused/completed projects, released/suspended members and inactive/unclaimed imported accounts. A sign-in alone is not proof of project work; do not invent offline activity. Recheck eligibility immediately before sending. At most one reminder per placement, including across reruns/reactivation; no daily or weekly drip campaign. The seven-day threshold is a proposal, not an existing feature or an agreed schedule.

Every mail type needs an event/recipient idempotency key, delivery outcome, safe retry handling, current recipient/permission checks and a staging allowlist. A queued record is not evidence of an inbox receipt. Provider uncertainty must not cause blind duplicate retries. Verify sender domain and reply destination, configured transport limits, bounce handling and one-click destinations. Emails are not enabled for the community during development or migration.

### One Members administration page

Proposed addition is confined to Administration, with no new member navigation item.

- Search/paginate/filter members; distinguish verified/unverified, active/suspended and imported/unclaimed accounts. Show relevant applications, project placements and coordinator responsibilities without dumping private source-form fields.
- Review a member's identity and placement summary; make project-specific actions use the existing project workflow.
- Suspend and restore website access with an explicit reason, confirmation and an audit trail. Enforce suspension on server/database reads and writes, including already-open sessions, rather than merely hiding navigation. Prevent accidental self-lockout and removal of the last authorised administrator.
- Distinguish account suspension, project release and archive/deactivation. Preserve work attribution, membership history and evidence. Review open work and coordinator replacement before releasing someone.
- No default hard-delete or unreviewed bulk destructive operation. Any later erasure workflow needs its own scope and impact review. External GitHub/meeting permissions remain a separate responsibility.
- Acceptance: non-admin and coordinator-only accounts cannot manage global members; blocked accounts cannot continue through old sessions/API calls; restoration works; each action is attributable and reversible where intended.

### SEO and footer

- Audit all public generated pages and public runtime pages: unique accurate titles/descriptions, one primary heading, canonical destination, sensible status codes, redirect consistency, social images, image descriptions, sitemap/robots and structured data that matches visible content.
- Keep staging, member, account and admin surfaces out of indexing. Make intended public production pages indexable deliberately at cutover; do not remove staging noindex protections early. Check HTTP headers as well as HTML metadata and avoid a blanket runtime noindex accidentally hiding public News/Opportunities.
- Audit public footer labels, duplicates and obsolete waitlist/“account access being prepared” language against actual launch behaviour. Keep useful platform links, Support, Community Guidelines, Terms and Privacy without turning the footer into a second crowded menu.
- Existing public social links include LinkedIn, Instagram, X and Facebook; YouTube is already used in learning content. Verify the owner's official destinations, consider a single YouTube footer link, and keep links accessible, labelled and safe in new tabs. Do not invent social handles or add social widgets/tracking automatically.
- Keep the member footer compact and consistent with the public support/legal destinations; agree whether it needs the same small social row before implementing it.

Phase 2 acceptance: operational changes have a concrete reviewed design and test evidence, essential email types work only for approved test recipients, and public/private indexing boundaries are proven. Exact reminder timing, admin status meanings and final footer/menu refinements are approval points, not reasons to stop the independent audit.

## Phase 3 — Hosted staging and three-account pilot

- Prepare one coherent HTTPS staging entry point for public pages and runtime, with correct environment origins, cookies, auth redirects, email links and noindex. Verify deployment architecture and available staging resources before changing any hosting configuration. Keep live V1 operations untouched.
- Keep the administrator identity separate. Use three member identities: the owner's own signup and two other approved test inboxes when provided. One becomes coordinator, the others regular members; use separate browser sessions/profiles to prove isolation.
- Let testers complete their own verification, terms and password entry. Creating test accounts or sending test invitations waits for the specific addresses and approved test action.
- Exercise fresh signup/profile, duplicate application prevention, selection/offer, acceptance, coordinator agreement, admission, team visibility, task assignment/review, milestone evidence/acceptance, practised skills, meeting updates, support replies and completed delivery credit. Test the rejection/clarification path separately.
- Verify bell event/read persistence and actual inbox receipts. Use a test clock to prove the once-only reminder and suppression rules without waiting a week; do not enable community sending.
- Test suspension/restoration, coordinator replacement, project release and open assignments. Confirm paused/completed/read-only behaviour and lack of cross-member access.
- Collect route/role evidence and delivered email examples privately. Record pass/fail and fix failures before import. Successful local builds and SQL tests alone do not close this pilot gate.

## Phase 4 — Silent migration rehearsal, then approved import

Only after pilot sign-off: inventory both source forms and current project operations in private storage. Determine which people already have accounts, which merely expressed interest, who actually accepted a project, current team/coordinator assignments and where their working evidence lives. Do not infer admission or leadership from a form response alone.

1. Preserve source snapshots and identifiers; back up the confirmed destination and prove rollback/restore. Verify the website production destination without assuming the old platform database is the new target.
2. Map normalized email and source IDs to member identities. Preserve existing website accounts and saved profiles; reconcile duplicates/conflicts manually. Do not merge addresses using provider-specific dot/plus rules or reset an existing member's password.
3. Produce a private dry-run report with counts for create/link/hold, applications, assignments, teams, coordinators and unresolved cases. Prove rerunning cannot create duplicate accounts, memberships, email jobs or notifications.
4. Rehearse with synthetic/de-identified data first, including one already-active project. Preserve attribution and accurate status. Claim/review imported profile data through verified identity; historical consent is not a new agreement.
5. Implement an explicit server-controlled silent-import mode that suppresses outgoing emails, in-app event replay and reminder enqueueing. Existing notification triggers and application backfill must be reviewed; disabling only the email worker is insufficient. Do not copy a production mail queue into staging or release a backlog after the switch.
6. Reconcile source and destination totals plus sampled member/project histories. A returning approved member must see their correct project and reach the existing Lab after activation/access checks, without reapplying or receiving an invented offer. Keep external repository access verification explicit.
7. Import live records only into the approved destination after review of the exact dry run, mapping and rollback plan. Use bounded batches and checkpoints; leave unresolved people held for reconciliation. No automatic invitations as an import side effect.

Silent means no community email and no unsolicited bell/reminder event generated by importing historical data. Launch messaging is a separate, reviewed action after successful cutover.

## Phase 5 — Approved cutover and invitations

- Review pilot evidence, migration reconciliation, operations/monitoring, backup/rollback, security findings and SEO/route results. Prepare the exact deploy target and recipient list before requesting final release approval.
- After approved deployment, verify real public/member/admin routes, HTTPS callbacks and account activation with controlled canaries before a wider send.
- Recommended activation flow: short-lived one-time activation/set-password links; members set their own password. Do not email reusable or shared generated passwords. Fresh unclaimed accounts and already-existing accounts need distinct invite/recovery/return paths; do not blindly invite an address already present in Auth or silently mark unverified source addresses verified.
- Generate activation links only at sending time so they have not expired during migration. Verify identity before private project access. Keep tokens out of logs/artifacts. Test expired/used links and safe resend.
- Send one approved launch message per recipient, deduplicated, with the appropriate return/activation destination. Do not also release old application/offer emails. Monitor delivery, bounces, access failures and incoming support; keep rollback available.

Supabase provides server-side account administration and invite/recovery-link generation. Exact no-send provisioning and existing-account link behaviour still require a controlled staging proof: [createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser), [generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink).

## Working order / authority

Immediate next work is Phase 1 inventory and integrated review, followed by concrete proposals for the Phase 2 gaps. The owner asked to approve implementation before changes; this plan is not blanket approval for every proposed feature, bulk action, recipient, migration or release. The seven-day reminder and activation-link recommendation remain explicit design proposals. Ask for implementation approval when the relevant gap is concrete and reviewable; do not repeatedly request approval for already-approved work.

This plan supersedes conflicting historical route-parity and obsolete pre-home-design notes. It complements the simplified scope and current member-home implementation report. On this planning pass, no application/schema change, account creation, email, data import or deployment occurred.

## Phase 1 repair status

Owner-approved F01–F04 repairs and account-entry navigation refinement are implemented locally, with the narrow application-status reader applied to staging only. See V2-INTEGRATION-REPAIRS-2026-11-04.md. Static checks, 95 member tests, 94 integrated HTTP checks, TypeScript/build, browser navigation and rollback SQL checks passed within the stated boundaries. This closes those implementation findings, not hosted cross-role acceptance or production release approval. Phase 2 email/reminder/Members administration specifications remain separate work.

Owner refinement implemented: top house icons now open the public homepage. All public pages use a canonical shared footer, including public runtime routes. See V2-PUBLIC-FOOTER-AND-HOME-2026-11-04.md; member workspace/admin footers remain operational.

Approved navigation/account redesign implemented locally: Projects, Job Board, Industry News, About Mettelo and Explore, with one icon/menu contract and responsive account controls. See V2-PUBLIC-NAVIGATION-AND-ACCOUNT-2026-11-04.md for checks and boundaries. No production deployment is implied.

Approved footer simplification is complete, with the owner's infrastructure positioning correction. Three shared link groups replace account-dependent/duplicate links; mobile groups expand/collapse. See V2-FOOTER-REDESIGN-2026-11-04.md. Release gates remain unchanged.

About Mettelo story/design updated locally after approval, incorporating connection with people in one's field as the first part of Connect → Learn → Build → Demonstrate → Progress. See V2-ABOUT-METTELO-REDESIGN-2026-11-04.md. Existing route, shared navigation/footer and release gates are preserved.
