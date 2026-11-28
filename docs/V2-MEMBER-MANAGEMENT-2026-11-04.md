# Central member directory — 4 November 2026

Implemented locally with staging Supabase jxijdjmjuzslmjxolhjl only. Production and community imports remain untouched. No emails were sent or enabled.

Role permissions have since been refined: see [Administrative roles](V2-ADMIN-ROLES-2026-11-04.md). Full admins and Operations admins manage this directory; only Full admins change roles.

## Scope and experience

/admin/members is one searchable, paginated directory of all non-deleted registered website accounts, whether or not they applied for a project. Profiles are optional left joins. Existing community contacts outside website Auth will appear after the separately approved migration, not automatically.

The five compact overview cards cover all accounts and operations and do not change with directory search/filter: total registered accounts; email-verified accounts; distinct projects with active teams (team count underneath); new/unreviewed applications without an offered/confirmed placement; unresolved member support cases plus public contact enquiries. These are operational counts, not growth, engagement or revenue claims. The current staging fixtures produce 9 / 9 / 1 / 0 / 2.

Rows prioritise identity, email verification, last sign-in, website access and join date. One member dialog contains profile fields, linked enquiries, collapsed participation/applications and the last ten access-history entries. Public enquiries matched by email are explicitly labelled as such. Filters cover all, active access, suspended and unverified accounts; pages contain 20 accounts.

## Controlled actions and enforcement

Approved project administrators can view records and suspend/restore website access. Both actions require an 8–500-character reason, the member email and a current version; server checks protect against stale edits. All administrator accounts (including opportunity administrators and self) are protected from these controls. Permanent deletion, privilege changes, Auth bans and credential changes are not offered. Existing Auth restrictions are displayed separately.

Suspension preserves accounts and project records. It is a website access state, not an Auth-provider ban or a revocation of external workspace access. Administrators must review coordinator duties and external tools separately. Middleware checks current access for member/admin/onboarding pages and fails closed on an unavailable check. PostgREST's database pre-request hook denies suspended identities, including existing JWT identities; the self-access RPC alone is exempt so the paused page can be reached. Profile and private avatar Storage policies also enforce current access. Already issued avatar URLs can remain usable for their 300-second lifetime. The current app has no Realtime subscription.

The migration refuses to replace an unrelated existing PostgREST hook. Staging had no previous hook and no GraphQL extension. Any future GraphQL/Realtime feature must include its own current-access review. Weekly pulse, project preview eligibility and meeting worker eligibility now exclude suspended accounts. No sending worker/schedule was enabled.

## Verification

- TypeScript: passed.
- Member-management request tests: 3 passed.
- Integrated public/member preview checks: 101 passed, 0 failed.
- Signed-out member API: 401; foreign origin: 403.
- Six SQL rollback groups: ordinary-member denial; all-account counts/global overview independent of search; protected administrator; suspend/stale-write denial/existing-identity guard/profile RLS; weekly pulse exclusion; restore/history. No access or audit rows remained after rollback.
- Signed-in browser: all nine accounts including an account with no applications, member profile/enquiry details, protected admin record and confirmation controls. Browser did not submit access changes.
- Responsive checks: 320, 390 and 768 pixels, no horizontal document overflow; desktop reviewed at normal viewport.

The test exercises request guard logic under a retained database auth identity, not a suspended live browser JWT. A later disposable-account pilot should include that live session step before production.

Security advisor: new access tables intentionally have RLS and no browser policies (INFO). The authenticated-only, zero-argument website_account_allowed helper intentionally returns only the caller's access boolean; its SECURITY DEFINER warning is reviewed, with no caller-selected identity. Existing unrelated public/profile RPC warnings and leaked-password-protection warning remain separate readiness items. References: https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection .
