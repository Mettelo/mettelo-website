# Mettelo Lab: pilot admission and website transfer plan

Prepared 3 November 2026. Planning only: no Lab code, schema, member import, Drive records or production services changed by this review.

## Evidence

- Manual source: https://docs.google.com/spreadsheets/d/1QykSVH1TriAsLt6fI0U3YQgZVzdiSRePqN9dWT1qwcs/edit
- Read Team Register A1:Y100, Project Assignments headers and D2:L160, Participant Allocation headers, Handover Guide, Master Operations v2, Access Tracker headers/sample and Issues & Decisions.
- Team Register has 27 populated team rows: 15 Confirmed and 12 Awaiting acknowledgement. These are recorded statuses, not independently verified active delivery. All 27 team rows record organisation/repository access as Not yet. Older handover text still describes the 17-team October baseline. Issues also describe later membership changes and access reports; reconcile those before migration.
- Project Assignments has 93 populated rows in the inspected range: 40 Confirmed, 51 Awaiting acknowledgement, one Withdrawn and one Awaiting project choice. Do not treat all 93 as current accepted memberships.
- Platform checkout reviewed at 4c80cec7d0a6cf6614ec9d0ed0af1e6beaac347f. This is source inspection, not a fresh verification of the running platform.
- Relevant source: app/member/projects/page.tsx; app/member/projects/[id]/page.tsx; components/MetteloLabPanel.tsx; components/MetteloLabNavigation.tsx; lib/project-start-service.ts; lib/project-lab-canonical-data.ts.
- Website foundations: website_project_interests, website_project_teams, website_project_team_members and website_project_pilot_settings; migrations 20261102085628 and 20261102150000; tests/pilot-team-lifecycle.staging.sql.

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
