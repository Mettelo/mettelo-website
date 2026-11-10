# Administrative roles — 4 November 2026

Implemented locally and on staging Supabase jxijdjmjuzslmjxolhjl only. Production remains untouched. No emails sent. The existing approved administrator is mapped to Full admin; no other account received a persistent role grant. Database test grants, articles and audit entries were rolled back.

## Roles and boundaries

| Role | Administrative access |
| --- | --- |
| Member | None; normal member features remain available |
| Writer | Create, list, read and edit their own never-published Industry News drafts; no publishing |
| Editor | Review all editorial drafts, edit, publish and unpublish Industry News |
| Operations admin | Members, access suspension/restoration, applications, project teams, Labs and enquiries; no role management, editorial publishing or job-board pipeline |
| Full admin | All website administration, including editorial publishing, job-board pipeline and role management |

These are website permissions, not Supabase project/dashboard/database credentials. Project coordinator remains a separate project responsibility. No new member/public navigation item was added. The existing Administration account-menu entry and admin navigation now reflect current capabilities. Writer and Editor accounts cannot open member directories or see operation-wide KPIs.

## Implementation

Private member_roles stores the single role and a version; accounts without a row are Members. Private member_role_audit records actor, member, old/new role, reason and time. Both tables have RLS enabled, no browser policies and no direct browser grants. Authorization reads the current private database role plus verified/current account access, never editable user metadata or a cached JWT role claim.

All legacy administrator checks were replaced across project operations, admission, workspace, chat, support, contact inbox, member-home leadership actions and opportunity controls. Old legacy administrator tables remain historical bootstrap inputs and no longer authorize functions. Internal helpers have empty search_path and no public/browser execute grant. The browser reaches explicit SECURITY INVOKER API wrappers and internally validated private authorities.

Manage role sits in the existing member record and is visible only to Full admins. Changes require a supported role, current role version, 8–500-character reason and typed member email. A global transaction lock serialises role changes and rechecks the actor after acquiring the lock. Demotion of the last available verified Full admin is refused. Grants require a verified, currently allowed target account. Self-demotion with another Full admin available redirects to the appropriate admin overview. Stale writes fail rather than overwrite another administrator's decision. The audit is available within the same member record.

Writers cannot list/read other authors' private drafts, fetch their own already published article through editorial endpoints, or edit a previously published article even after unpublication. Editors and Full admins can review the saved writer drafts from the same editorial desk; no extra submission page, email or workflow was added. Existing draft/public-version separation and revision checks remain intact.

## Verification

- TypeScript passed after implementation.
- All 115 member unit tests passed, including approved role values/version/reason/confirmation validation.
- All 101 integrated preview checks passed.
- Eight SQL rollback groups passed: Member denial; Writer draft/publish/operation boundary; Editor cross-author publication/operation denial; Writer ownership and publication restrictions; Operations scope and escalation denial; immediate demotion under retained identity and stale edit rejection; last-admin protection, handover and audit; direct role-table write denial.
- The six existing member-access SQL rollback groups also passed.
- Staging after tests: one original Full admin assignment at version 1, zero role audit rows, zero fixture articles and zero access changes. Function-source inspection found no remaining legacy administrator-table authority lookups.
- Browser: role shown in directory, five role choices, permission description, required reason/email confirmation, cancel flow and unchanged editorial access for Full admin. No role-change form was submitted.
- Responsive role dialog checked at 390 and 320 pixels, with document/dialog widths contained and a visible sticky identity/close header. Temporary viewport overrides reset.

Database tests exercise retained auth identities in rollback transactions; separate real-account browser sessions for each role remain part of the later multi-account staging pilot. A later change to Auth account deletion/ban or a new administration route must preserve the available-Full-admin and current-permission rules. No password, account-creation or notification behavior changed here.

Security advisors introduced no new warnings. The two private role tables generate intentional RLS-with-no-policy INFO findings, since direct browser access is denied and checked private functions are the only access path. Existing prior profile/public helper warnings and leaked-password-protection warning remain separately documented readiness items. Advisor reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy .
