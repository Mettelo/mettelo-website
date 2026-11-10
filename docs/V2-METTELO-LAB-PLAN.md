# Mettelo Lab: pilot admission and website transfer plan

Prepared 3 November 2026. Planning only: no Lab code, schema, member import, Drive records or production services changed by this review.

## Evidence

- Manual source: https://docs.google.com/spreadsheets/d/1QykSVH1TriAsLt6fI0U3YQgZVzdiSRePqN9dWT1qwcs/edit
- Read Team Register A1:Y100, Project Assignments headers and D2:L160, Participant Allocation headers, Handover Guide, Master Operations v2, Access Tracker headers/sample and Issues & Decisions.
- Team Register has 27 populated team rows: 15 Confirmed and 12 Awaiting acknowledgement. These are recorded statuses, not independently verified active delivery. All 27 team rows record organisation/repository access as Not yet. Older handover text still describes the 17-team October baseline. Issues also describe later membership changes and access reports; reconcile those before migration.
- Project Assignments has 93 populated rows in the inspected range: 40 Confirmed, 51 Awaiting acknowledgement, one Withdrawn and one Awaiting project choice. Do not treat all 93 as current accepted memberships.
- Platform checkout reviewed at 4c80cec7d0a6cf6614ec9d0ed0af1e6beaac347f. This is source inspection, not a fresh verification of the running platform.
- Relevant source: app/member/projects/page.tsx; app/member/projects/[id]/page.tsx; components/MetteloLabPanel.tsx; components/MetteloLabNavigation.tsx; lib/project-start-service.ts; lib/project-lab-canonical-data.ts.
- Website foundations: website_project_interests, website_project_teams, website_project_team_members and website_project_pilot_settings; migrations 20261102085628 and 20261102150000. The original lifecycle test was replaced by tests/lab-admission.staging.sql when manual readiness and unique project placement were introduced.

## Product decision

Reuse and adapt the source Lab into apps/member, using the website session and website database. The public Hostinger static site remains separate from the existing member Next.js application. Lab belongs in the member application, which requires a Hostinger Node deployment at launch.

Do not simply link to the platform and assume a website login grants access. The two Supabase projects have separate identities and memberships. If an external platform Lab is temporarily linked, it must clearly require its existing login and verified platform team access; that is a transitional option, not an integrated website Lab.

Use /member/lab for the accepted-project collection and /member/lab/[teamId] for a specific workspace. A team is the delivery instance of a reusable brief. Task, milestone, discussion, resource and deliverable records must carry team_id; project_ref alone is insufficient.

## Admission and team lifecycle

Keep application decisions, individual placements, team readiness and external access as separate records/states.

1. Verified member with at least 80% profile completion submits interest in a selected project.
2. Administrator reviews preferences, availability, role and workload. The decision is recorded with actor, timestamp and reason. Review can request clarification, waitlist, decline or offer a place.
3. Member acknowledges the offered project/team/role, or an administrator records independently verified existing acceptance with provenance. An email sent is not acknowledgement.
4. Administrator assigns the acknowledged member to a forming team. Preserve legacy IDs such as MTL-DA-001-T02. One person may have several different projects but only one current team within the same project. Preserve previous memberships as history.
5. Normal team minimum is three confirmed, acknowledged members; maximum four unless separately overridden. An authorised administrator can approve a two-person pilot team using an explicit "Allow two-person team" action, recording the reason, actor, timestamp and both members' agreement. This overrides only the team-size minimum, not required-role coverage, coordinator, participation acknowledgement or verified delivery-access checks. Reaching three does not override an explicit four-person preference without acknowledgement of the change.

The existing interest form offers Solo, Team and Flexible. Solo is a separately approved one-person delivery route, not an undersized team. Team normally requires three, with the documented two-person exception above. Flexible respects the saved prefer_team, prefer_solo or no_preference choice, and requires the member to acknowledge the actual offered arrangement before allocation. Never silently convert Solo to Team or use Flexible as automatic agreement to any placement. Retain the separate team-formation preferences (join a forming team, help form another team, or either).
6. Administrator starts the ready pilot team through one server-authoritative transaction. Start does not close project intake or stop another team forming. Do not import the platform's automatic six-hour scheduler into the first pilot release.
7. Paused/blocked teams retain an explanation and history; completed teams become read-only. Withdrawal or removal revokes write access immediately without deleting contributions. Define and test the recovery action if the remaining team falls below its minimum.

GitHub readiness remains separate: exact username verified, organisation invite sent, invite accepted, repository permission granted, access tested. Do not infer any of those from an email or a repository URL. Link to existing GitHub delivery rather than recreate a code hosting system.

## Member experience

- Add Mettelo Lab to the member navigation and a factual accepted/active project summary on member Home.
- Collection cards show project title, team reference, role, team status and next action. Never expose other teams' private contacts.
- Accepted but forming: View team status. Access pending: show the actual blocker and setup action. Active: Enter Lab. Completed: View completed Lab in read-only mode. Paused: View status/read-only workspace where permitted.
- Unreviewed interests stay in Project interests; they do not become accepted Lab cards.
- Empty state explains how to find a project and submit interest; no invented assignments or progress.

## Implementation sequence

### 1. Admission foundation and small admin page

Extend existing website tables rather than create a parallel pilot model. Add decision/acknowledgement/access/audit fields and database constraints. Replace the current headcount-only automatic activation with explicit readiness and authorised start. Fix the existing lifecycle test, which currently intentionally places the same users in two teams for one project.

Build a restricted project administration page for review, offers, acknowledgement evidence, team creation, placement, readiness blockers and start/pause. The first proposed operator is Taiwo; use an explicit project-admin permission rather than assuming opportunity-pipeline rights automatically authorise project administration. No self-assignment or client-controlled administrator roles.

### 2. Accepted-project cards

Build the My Lab collection on real placements with team-scoped server checks and database policies. Synthetic staging fixtures first. A card alone is not a completed Lab.

### 3. Transfer a working Lab slice

Adapt source shell/navigation, canonical brief and resource governance, team roster, milestones, tasks, evidence links and verified repository links. Persist task ownership/status and deliverable evidence. Limit writes by member/coordinator/admin responsibilities. Reuse patterns and styles while replacing platform-specific queries, IDs, auth, service access and API dependencies with website equivalents.

First release is a usable delivery workspace. Chat, events/presentations, advanced Proof review, weekly pulse, growth/recovery and support modules follow as separately working slices. Do not display controls whose backing routes/tables have not been transferred. Participation never automatically creates verified Proof.

### 4. Reconcile and migrate existing pilots

Prepare a private dry-run import report: canonical project mapping, stable team IDs, valid sign-in email matches, conflicting status, duplicates, withdrawals, pending replacements and unresolved acknowledgements/access. Existing accepted members should not reapply merely because the website is new; record a provenance-backed legacy placement rather than fabricate a form submission. Do not grant access from names or email similarity. Claim a placement only after ownership of the matched sign-in email is verified; exceptions need administrator resolution.

Do not import real member data into the synthetic-only staging environment. Real import awaits the separate website production database and a reviewed migration scope. Keep the register operational during the pilot; establish an explicit cutover/reconciliation procedure before making the website authoritative. No silent two-way spreadsheet synchronisation.

## Completion criteria

- Applicants below 80% cannot submit new interest; profile percentage alone never accepts or starts them.
- Ordinary members cannot accept themselves, allocate teams, alter roles or start teams.
- Two concurrent administrators cannot duplicate a placement or overfill a team; stale decisions are rejected safely.
- A member cannot hold two current teams for one project, but can hold acknowledged placements in distinct selected projects.
- Accepted/forming and active states remain different. Start fails with a useful blocker until all pilot readiness conditions pass.
- A normal team cannot start with two people. An authorised, audited two-person exception can start only with both members' acknowledgement and all remaining readiness checks passed. A single-person team cannot use this exception; approved Solo uses its own delivery path. Ordinary members cannot grant or change an override.
- Two teams on one brief have isolated tasks, discussions, contacts, files and evidence. Guessing another team URL or calling its API fails.
- Source canonical briefs are shared safely; private resource copies require approved governance and storage permission. Team membership alone does not grant data reuse rights.
- Active Enter Lab opens a working website workspace using the current website login; task/evidence updates survive refresh and are visible only to authorised team members.
- Removal/withdrawal blocks subsequent writes, completed teams are read-only, and history remains auditable.
- Existing team import is dry-run reviewed; no duplication, guessed acceptance or unrelated emails.
- Desktop and mobile checks cover collection, readiness, workspace navigation, forms, errors, keyboard dismissal and empty states.
- Hostinger build/runtime configuration is validated before launch; staging implementation does not imply production readiness.

## Next concrete scope

Admission foundation + restricted project admin + My Lab cards + one usable team workspace slice in staging. No production deployment, real member import, automatic email, automatic GitHub invites or new paid infrastructure in this scope.

## Simplified pilot approach after source-logic review

The first implementation should expose only Submit interest → Admin review → Accept place → Team forming → Enter Lab. Decline, withdrawal, blocked and completed remain supported outcomes, not extra mandatory workflow steps. Acceptance of an offered team/role also records acknowledgement; do not add a second redundant confirmation wizard.

Use one small project-admin page: applicant list, team roster, role/coordinator selection, readiness summary, Start team and Allow two-person team. Keep the offer in the website rather than adding email reminders or expiry automation. Existing verified acceptance can be recorded with its source by admin, avoiding repeat acceptance for established pilots.

Reuse these platform patterns:

- lib/project-admission.ts: supported Solo/Team/Flexible choices and resolution of saved working preferences. Adapt thresholds to this pilot's explicit Solo=1, Team=3, or authorised Team=2 policy. Do not copy the fallback that returns a one-person threshold for unresolved Flexible participation; confirm the delivery arrangement first.
- app/api/project-offers/route.ts: member accepts or declines a place; successful acceptance forms a membership, separate from activation.
- lib/project-start-service.ts: one server-authoritative, repeat-safe start action with readiness checks. Use manual start for this pilot.
- app/member/projects/page.tsx and components/MetteloLabNavigation.tsx: accepted/preparing versus active project cards, team-specific workspace links and responsive Lab navigation.
- app/api/admin/project-admission/route.ts and migration 20260921095600_admin_force_start_project_run.sql: audited override with a mandatory reason. The source emergency override permits one confirmed member and bypasses broader team/operational blockers; reuse its audit/transaction pattern, NOT its broad permission to bypass readiness. The website exception is specifically a two-person team and still requires all other pilot prerequisites.

Defer the source's AUTO admission lane, six-hour scheduler, offer-expiry/reminder controls, recruitment marketplace, external invitations and advanced Proof automation. Retain privacy and team-isolation controls. Adapt source database/API dependencies to website tables instead of installing the platform's entire migration history.

This conclusion is based on the checked-out source implementation, not an inspection of current per-project live database settings. No platform code or database was changed.

## Transfer the existing Lab, simplify its enabled features

User direction: use the existing Lab as the implementation base rather than designing/building a replacement workspace. Preserve its layout, responsive navigation, visual components and working interaction patterns. Transfer complete feature dependencies together (component, server handler, persistence, authorisation and relevant tests); copying only a screen is not a functioning transfer. Adapt the platform-specific services to website identities and team records. Do not apply the entire platform migration history or copy platform member records into staging.

This supersedes the earlier suggestion to postpone Chat as a default: basic team Chat belongs in the proposed pilot workspace. Advanced modules remain available in the source for subsequent transfers.

| Existing source Lab area | Website pilot scope | Adaptation/dependency |
| --- | --- | --- |
| Shell, Home, desktop rail and mobile navigation | Transfer and retain | Team-specific route, website header/session; remove legacy duplicate workspace chrome rather than reproduce its DOM-hiding workaround |
| Plan and canonical brief | Transfer and retain | Existing website brief identity, milestones, outcomes and source-data rules |
| Tasks and delivery controls | Transfer and retain | Team-scoped ownership/status/history and coordinator permissions; preserve useful status controls |
| Chat | Transfer core team messages | Team-scoped read/post and essential author edit/delete permissions; defer mentions, cross-linking and notification automation if dependencies would widen scope |
| Data | Transfer source references and governance display | Retain provider, licence, reuse and access restrictions; add saved team data-source metadata where supported. No generic file-upload promise without storage policy/limits |
| Resources | Transfer saved references/links | Team-scoped saved URLs and GitHub links; no new file hosting required |
| Team | Transfer roster, coordinator and role context | Accepted website placements; retain multiple isolated teams per project; no automatic recruitment controls |
| Proof | Retain contribution/evidence capture as Contributions | Preserve evidence links and truthful review status; defer verified Proof badges, final Proof packages and platform-wide capability scoring |
| Events | Optional follow-on transfer | Basic meeting links can be added later; defer integrated event providers, webhooks, recordings and presentation-slot booking |
| Support | Keep access to website help initially | Do not imply shared team chat is a confidential support channel. Dedicated private cases require their separate admin/visibility workflow before transfer |
| Weekly pulse, team growth/recovery, architect and reviewer systems | Defer | These connect to platform modules not yet available on the website |

Source files inspected additionally: app/member/projects/[id]/layout.tsx, components/MetteloLabViewSurface.tsx, components/MetteloLabSystemPanels.tsx, components/ProjectCollaborationPanel.tsx, components/ProjectMessagePanel.tsx, components/ProjectDeliveryControls.tsx, components/TaskStatusControl.tsx, components/DataNativeWorkspace.tsx, components/ContributionForm.tsx and supporting project delivery/collaboration/data/contribution/support routes.

Several source handlers call notifyUser/notifyAdmins and email queue services. Do not transfer those calls into active sending behaviour: the current website scope explicitly excludes emails. Omitted modules must be removed from navigation and data loading, not merely hidden with CSS. Keep team access checks on server routes and persistence policies. Preserve existing source tests as reference and adapt meaningful persistence/access tests to website tables.

Deliver in reviewable transfer batches: (1) admission/placement foundation and accepted cards; (2) existing Lab shell + Plan/Team/Resources; (3) Tasks/Chat/Data/Contributions with working persistence. These are implementation batches within one proposed pilot release, not a requirement to launch incomplete screens separately. Pilot release acceptance requires the enabled areas to work together and excludes placeholder controls.

## Team changes, support enquiries and simple meetings — design addendum

Recorded 3 November 2026 from the user's spoken requirements. Status: proposed design for review, not an instruction to send emails or alter placements. This addendum supplements the implemented formation workflow described in V2-LAB-TRANSFER-STATUS.md.

### Requirements captured

1. Administrators must be able to add people to an existing team, including growing an already-started two-person pilot to three or more within its capacity.
2. Administrators must be able to remove a member for withdrawal, inactivity, disruptive behaviour or other recorded operational reasons; existing work must remain attributed and retained.
3. Coordinators need an enquiry form inside each Lab for questions, access problems, membership changes and delivery concerns. Members also need a private route when a concern involves their coordinator.
4. The Lab should support simple meeting scheduling using an externally created Google Meet, Microsoft Teams or other approved meeting URL, with topic, date, time and time zone.
5. All current accepted team members should receive a meeting email with the topic, localised time and join link. No complex platform meeting/video implementation is required.
6. Membership must remain manageable after team formation and after work starts. Formation is not a permanent lock on team composition.

### Current implementation versus proposed changes

| Area | Current website behaviour | Proposed addition/change |
|---|---|---|
| Adding someone | Shortlisted applicants can be offered a place in forming/paused placements; a running team must first pause. | Add a dedicated admission flow to active teams while existing members continue work. Pending invitees have no Lab access. |
| Removing someone | An administrator releases a placement with a reason; an active team pauses, membership access is revoked and records remain. | Structured reason, impact preview, task/milestone reassignment and separate disciplinary restriction on re-offering. Pause according to remaining readiness and risk. |
| Coordinator change | Nominate an accepted member, collect agreement and recheck readiness. | Make this available from membership/support review with a clear acting-coordinator recovery path; never infer new consent. |
| Support | No website Lab support-case module has been transferred. | Private enquiries, replies and admin queue, adapted from platform support boundaries. |
| Meetings | No simple website meeting workflow or meeting email delivery is implemented. | Small external-link meeting form, team agenda and dependable invitation/update/cancellation email delivery. |

### A. Add a member to an existing active team

Admin > Projects > selected team > Add member:

1. Select an unallocated, shortlisted applicant from that project's interest pool. Show Team/Flexible preferences, roles and availability; Solo-only applicants require an explicit change of preference first.
2. Select their offered role and review capacity, essential responsibilities and schedule. A pending offer reserves a capacity slot and the applicant's place on that project.
3. Issue an offer without changing the existing team's active status. The person sees the actual arrangement and commitment and accepts or declines it.
4. Acceptance confirms their placement but does not grant access to the running Lab until onboarding is complete. Track onboarding/access eligibility separately from acceptance; audit every transition.
5. Verify external repository access, record onboarding completion and select Admit to active Lab. Only then grant workspace access, include them in the roster and deliver future meeting notices. For a forming team, keep the existing team-wide start checks.
6. Offer expiry, cancellation and rejection release the reservation. Concurrent offers/admissions cannot exceed capacity or create two current placements for the same person on the same project. Retry of a saved offer/admission must not duplicate it.

Do not apply the initial team's 'no unanswered offers' start condition to everyday work by an already-active team. Pending growth should not freeze an established team. Show accepted, onboarding, active and available-place counts separately.

Two-person growth: retain the historic exception for audit. When a third member is admitted, use the ordinary three-person rule. The third person must not be asked to agree to a two-person arrangement. If later reduced to two, require a fresh administrator exception review and agreement from the actual remaining pair; do not reuse stale consent after a composition change. The current readiness implementation needs adjusting because it checks historic two-person agreement even when a team has grown beyond two.

Solo-to-Team is a deliberate arrangement change, not an ordinary Add member operation. The existing solo owner must agree before a conversion or replacement team is created. A completed Lab does not reopen through a membership offer.

### B. Remove or replace a member

Only an authorised project administrator removes a member. A coordinator submits a request rather than receiving unilateral disciplinary power.

Proposed reasons: member requested withdrawal; unavailable/inactive; change of role or project; capacity/restructure; conduct concern; other. Require a private explanation. 'Conduct concern' is an allegation/review category, not an automatic finding of misconduct.

Before confirmation, display the affected coordinator role, assigned open tasks/milestones, remaining active-member count, minimum/capacity and repository access obligations. Confirm whether a replacement/reassignment is required.

On confirmation:

- Revoke future website Lab access immediately; invalidate any outstanding admission/offer and suppress unsent team notices for that person.
- Preserve authored messages, completed work, evidence and membership history. Do not redistribute or erase authorship.
- Mark open assignments as requiring reassignment. Retained contributors must not be allowed to keep writing through stale sessions or direct API calls; check current database membership on protected operations.
- If the coordinator leaves, nominate a replacement and obtain explicit agreement. Pause delivery actions until the replacement/readiness decision is complete.
- If fewer than the permitted minimum remain, pause and request replacement or a new two-person exception. A one-person remainder must not silently become Solo.
- If minimum, coordinator and responsibility coverage remain satisfied, allow an administrator to keep delivery active after recording that review. A risk-related pause remains available at any time. The current blanket-pause rule is conservative and must not change until the finer checks are implemented and tested.
- A disciplinary release must not return the person automatically to Ready to form. Record a placement restriction/review flag; re-offering requires an explicit authorised clearance. Do not turn a team-specific restriction into an account-wide ban without a separate decision.
- Website removal cannot revoke Google/Teams meeting access or GitHub permissions already granted externally. Show a manual external-access revocation checklist and record completion.

### C. Private support inside Mettelo Lab

Add a persistent Contact Mettelo / Get support action, not another discussion thread visible to the team.

Suggested reason dropdown:

- Project brief, scope or source-data question.
- Lab technical issue or repository access.
- Request another member / replacement.
- Request a member removal.
- Coordinator change / coordination support.
- Inactive or unavailable teammate.
- Team communication or conduct concern.
- Deadline, workload or milestone support.
- Meeting question.
- Other enquiry.

Form: automatically attach project and team IDs from the authorised context; collect reason, short subject, description and optional affected member. Start with text and safe evidence links; no new attachment-storage system is needed. Explain that reports are private to the reporter and authorised support staff; do not promise absolute confidentiality.

On submission, show a case reference and status. The reporter can view their own cases and replies. All current members, including coordinators, may submit; regular members cannot perform administrator membership actions. No automatic removal follows an enquiry.

Admin > Support: filter by project, reason, status and assigned operator. Minimal states: New, In review, Waiting for member, Resolved, Closed. Keep internal administrator notes separate from reporter-visible replies. Link a resulting membership/coordinator action to the case and its audit record.

A case about the coordinator must not automatically be disclosed to that coordinator. Sensitive cases are not visible through team chat, the roster or ordinary project-admin list data. The platform source already contains support privacy hardening; reuse its access principles and selected components, not its full recovery/escalation machinery. Define support permissions explicitly; opportunity-pipeline permission alone is insufficient. Initially restrict support administration to the approved website project operator.

A reporter who later leaves a team should still be able to follow their own case through an account-level My enquiries page, without regaining Lab access. Set no response-time guarantee until an operational owner and response policy are agreed.

Source references inspected: platform app/api/project-support-cases/route.ts, app/admin/project-support/page.tsx, migrations 20260908010000_project_experience_phase_17_support_conflict_safeguarding.sql and 20260908011000_project_experience_phase_17_support_privacy_hardening.sql. These are reuse references, not an assertion that the website module is already transferred.

### D. Simple meetings with external links

Add Meetings within the Lab. Team coordinator and approved administrator can schedule/edit/cancel; members can view and join. A Solo owner can schedule their own project meeting, with no arbitrary invitation list. Members can request a meeting through support initially; broader scheduling permissions can be decided later.

Form: topic, optional short agenda, date, start time, time zone, duration/end time, provider and external join URL. Require valid future time, positive duration, recognised time zone and a safe HTTPS meeting URL. Store the instant in UTC plus the selected event time zone; display each viewer's local time with its zone. Reject invalid daylight-saving transition times rather than silently moving a meeting. Do not create meeting rooms, fetch user-supplied links or request Google/Microsoft account permissions. Provide an approved-provider policy and a reviewed route for other providers rather than unrestricted arbitrary links.

Team view: upcoming meetings ordered by time, topic, organiser, agenda, local time/duration and Join meeting. Keep past/cancelled meetings as lightweight history. Updating or cancelling records an event revision. External provider attendance permissions remain external; Lab visibility is membership-scoped, not proof that an external link is private.

Email behaviour:

- After a meeting is saved, queue an invitation for each currently active/admitted team member, including the organiser where applicable. Offered, declined, removed or not-yet-admitted people do not receive it. Send separately; never expose the team email list.
- Include project/team, topic, start/end with time zone, agenda, external join link and a link back to the Lab. Include a simple calendar attachment where practical. Do not claim an external calendar event was automatically created.
- Queue revised notices on time/link changes and cancellation notices on cancellation. Use stable meeting identity and versioning for calendar updates.
- Add a newcomer to future scheduled meetings only after admission; do not resend past notices to the whole team. Recheck current membership before queued sends. Removal cancels pending delivery but cannot recall already-delivered email or external links.
- Persist an outbox/job in the same transaction as the meeting change. Deduplicate by meeting/event revision and recipient; retry transient failures and show pending/failed/provider-accepted delivery in admin. Reconcile uncertain provider responses before retrying; 'provider accepted' is not proof of inbox delivery.
- Reuse Resend and Mettelo's email styling through a server-only application sender. Supabase Auth SMTP configuration alone does not send meeting emails. Keep credentials server-side. Choose a durable worker/schedule compatible with the eventual Hostinger Node hosting; do not rely on a page remaining open or an in-memory development timer.
- Initial scope is invitations, material changes and cancellations. Automated reminders are optional later work, not silently added here. No real outbound email is authorised by this planning review.

### Small architecture extension

Reuse existing membership/offer/audit records. Add explicit onboarding/admission state and membership restrictions, with team-composition versioning for fresh exception consent. Add private support cases/replies, team-scoped meetings and a private notification outbox/delivery log. Access must be enforced in server/database operations, not only by hiding buttons. All records reference the actual team instance, not just the shared project brief.

Delivery order proposed:

1. Active-team additions, onboarding, reasoned removals, reassignment and two-person-growth fixes.
2. Private Lab support and a small /admin/support queue.
3. Simple external-link meeting form and upcoming-meetings view.
4. Meeting emails, failure/retry controls and synthetic-recipient checks before any real-member sending.

### Acceptance examples

- An active two-person pilot continues work while a third member receives an offer. Only an accepted/onboarded/admitted third member gains workspace access; no two-person consent is demanded from that third member.
- Two simultaneous administrators cannot overfill a team or allocate the same applicant twice on one project.
- Removing a member revokes their API access, preserves history and flags open assignments. A coordinator departure or below-minimum team cannot continue silently. An administrator can review a still-ready remaining team without mandatory unnecessary shutdown.
- A conduct-related removal cannot immediately regenerate a suggested placement for the same person. External repository/meeting access revocation is explicitly tracked.
- A member can privately report a coordinator; unrelated members cannot read the case. A coordinator request cannot remove another member automatically. Former members can still see their own enquiries without seeing the Lab.
- A meeting displays the correct time in two different member time zones and through daylight-saving transitions. Invalid/unsafe links and unauthorised edits are rejected.
- Invitation retries do not duplicate messages. Updates/cancellations have the correct meeting revision. Removed members receive no queued future notices, and newly admitted members get only relevant future meetings.
- Preview/testing uses synthetic records and controlled recipients only; there is no production deployment, real team change or real email send as a consequence of documenting this addendum.

### Addendum implementation status

The membership, support and meeting addendum is now implemented in the website and applied to V2 staging. See V2-LAB-TRANSFER-STATUS.md for exact migration versions and validation. Application email sending remains disabled pending controlled sender/recipient configuration and a delivery check; production hosting/scheduling and final visual QA remain release work. This supersedes the earlier design-only status for these modules. No real-member messages or production deployment were performed.

### Self-service meetings and support UX correction

- Meetings are team operations, with no staff approval step. Any admitted member of an active team can schedule. The organiser, coordinator or authorised staff can edit/cancel; other members can join and copy the link. Compact meeting cards open separate scheduling/editing and cancellation dialogs.
- Get support opens a private enquiry with team/project context. My enquiries is the member's searchable case list and conversation history. The admin Support inbox handles these requests, with staff-only notes kept separate from replies visible to the member. A member reply to a waiting case returns it to In review.
- Email delivery is background infrastructure, not a support approval process. Remove delivery diagnostics from the support inbox. No member meeting waits for email approval; saving it makes it visible immediately. Sending remains disabled in staging.
- Later notification work must map the full journey: interest receipt, placement offer/acceptance, admission, meeting invitations/changes/cancellations and optional reminders, and support replies. Agree useful triggers, preferences, recipient eligibility, deduplication, provider budgets and monitoring together before enabling sends. No quota or sending guarantee is assumed, and no new email-admin dashboard is required by this scope.
