# Repeatable pilot projects — 2 November 2026

## Behaviour

One public brief supports independent teams. Default concurrent active-team capacity is five, configurable per project. Each team has its own minimum member count (default three), required roles, accepting-members flag and lifecycle (forming, active, paused, completed). Starting one team does not close the brief's intake.

Submitting interest records a preference, not membership. Members can prefer joining a forming team, helping form another team or either. The verified account/70% saved-profile rule remains. A coordinator assigns a verified applicant to a specific team and valid project role. Members cannot self-assign or edit team counts.

A confirmed membership write automatically reconciles the project's forming teams, oldest first, under a per-project transaction advisory lock. A team starts only when minimum membership and required roles are met and an active slot is available. Active teams stay active if someone later leaves; operators must manage pauses/completion explicitly. Reducing capacity does not disrupt existing active teams; it prevents further starts. Increasing capacity should be followed by the reconciliation function.

## Public presentation

Library and homepage project cards provide Submit interest and Read brief. They show recorded active teams, forming teams and distinct contributors assigned to active teams. Interests, left memberships, paused and completed teams do not inflate active-contributor counts. One person on two active teams for the same brief counts once.

The library defaults to Most active: distinct active contributors descending, active teams descending, then project reference. Alternatives: Teams forming, Project title, Project reference. Search and facets combine with sorting. No recent-date sort is offered without a reliable date source.

Details include a Teams section showing public team labels, statuses, filled roles and starting requirements without names or member identities. Activity not yet recorded is distinct from a verified zero. Endpoint failures preserve unknown state. No real platform memberships or community records were copied to staging.

## Coordinator operation (trusted operator, not browser client)

Staging project: jxijdjmjuzslmjxolhjl. Production remains separate. Use the authorised Supabase operator session; never place a service key in the website. There is no coordinator web console in this slice.

1. Confirm the existing team's brief, actual participants, roles and minimum starting requirements with its coordinator. Map participants to verified website accounts and their project-interest records. Do not enter names as public team labels.
2. Review public.website_project_briefs.roles and intake_open. Set public.website_project_pilot_settings.max_active_teams as appropriate. The activity_recorded flag remains false until a team is recorded or the operator explicitly confirms no teams.
3. Insert a forming row into public.website_project_teams with project_ref, neutral label, minimum_members, required_roles and accepting_members. Creating the first row marks activity recorded. Keep required roles within that brief's catalogue roles.
4. For each confirmed assignment, insert public.website_project_team_members(team_id,interest_id,user_id,role). The trigger verifies a matching project interest, user, confirmed email and valid role. It refuses new confirmed membership when the team is closed or not forming/active. No assignment is made from an unreviewed interest automatically.
5. Reconciliation auto-starts qualifying teams. A team that is ready but waiting for capacity stays forming. Use public.website_reconcile_pilot_teams(project_ref) after raising capacity. Operator functions and writes are restricted to trusted service/operator roles.
6. Set membership status left to remove a participant from active counts while preserving history. Mark teams paused/completed rather than deleting history; the remaining forming queue is then reconciled. Close accepting_members per team when required. Do not close global brief intake merely because one cohort started.
7. Verify the public aggregate and browser after recording. Record the real teams before announcing participation counts.

## Validation

Applied migration 20261102150000_v2_repeatable_pilot_teams.sql to V2 staging only. All three tables use RLS with no anon/authenticated direct table privileges. The public SECURITY DEFINER aggregate has an empty search_path and returns only public team metadata and counts; membership user IDs and interest IDs are not returned. Write/lifecycle functions are not executable by members or anonymous callers.

The original headcount-only activation test has been superseded by `tests/lab-admission.staging.sql`. The Lab pilot now requires an accepted placement, coordinator, verified repository access and a prepared workspace before manual start. A normal team needs three members; a two-person exception needs administrator approval and both members' explicit agreement. One member cannot hold two current teams in the same project. All synthetic SQL test changes are rolled back; never run the staging test against production.

Public build/catalogue tests include a 20-versus-15 activity ordering case, team/reference tie-breaks and Teams forming order. Member tests retain the existing 19 passing cases. Browser search, title sort, both card actions and 320/390/768/1280px overflow checks passed. The read-only local endpoint returns 50 unknown records with no member IDs. Production hosting still needs same-origin /api/project-activity routed to the member runtime; the static package alone shows unknown activity.

Existing real teams still need coordinator recording. No production deployment, real-member import, automatic email or community announcement has occurred.

Member TypeScript validation passed. The member production build remains unverified for this change: two isolated Windows build folders failed with EPERM while creating Next.js generated type directories. Resolve this environment permission issue and complete the production build before release. The signed-in browser displayed the three team-formation preferences; no interest or profile was submitted during that check.
