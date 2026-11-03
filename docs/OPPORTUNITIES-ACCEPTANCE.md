# Opportunities and pipeline acceptance — 3 November 2026

## Verified in staging

- Public browsing, source and organisation filters, closing-date sorting and direct external application links.
- Country plus actual city/location shown. Graduate titles classified as graduate roles; rediscovery refreshes type, role family and classification version.
- Verified-member saving, persisted Saved opportunities, removal and empty shortlist. Controlled browser test used the synthetic staging listing and removed the save afterward.
- Initial saved status loaded in one server query rather than one request per card. A fallback remains for temporary status failures.
- Synthetic published QA listing archived through admin after testing. Removed listings remain protected from rediscovery.
- Restricted administrator prepares and publishes immutable eligible batches, checks due source links, hides expired/stale jobs and archives listings with a reason. Status messages use ordinary language.
- Extended scan progress now stored in private Supabase scan_checkpoints rather than local files. The completed 332-page/38-vacancy checkpoint was transferred to staging.
- Checkpoint API enforces verified administrator access or a server service role. No anonymous execution or direct authenticated-table access. Revision checks, a 90-second lease and idempotent commit replay protect progress.
- Admin scan batches use one results page and a 45-second overall fetch timeout. Source failure preserves the previous checkpoint. An uncertain commit is never released or overwritten blindly.
- Database tests for access denial, competing leases, commit replay and metadata refresh passed inside rolled-back transactions. Private table RLS-with-no-policies is intentional; table access is revoked and the narrow checked function owns writes.
- 58 member tests, TypeScript and two static packaging-boundary tests passed. Security advisors introduced no new public executable-definer warning for this checkpoint gateway. Existing profile/pilot/Auth warnings remain outside this change.

The optimized Next.js production build passed in an isolated source copy using the installed Node 24.22.1 runtime and synthetic build-time configuration. Earlier attempts on Node 24.18.0 failed with Windows EPERM directory-creation errors. The passing build generated all routes; a non-blocking CSS autoprefixer warning remains. No private environment file was copied into the build check.

## Maintenance entry points prepared, not scheduled

From apps/member: `npm run opportunities:maintenance -- check` reports missing server settings without showing secrets.

Actions `scan`, `verify` and `expire` use the guarded server pipeline client. Scan resumes the durable checkpoint, refreshes completed scans after six hours and restarts scans older than 24 hours. Verify and expiry retain existing safe closure rules. These commands do not send emails or enable Adzuna. No recurring job, production secret or production database connection was configured.

After approving the production target, use Hostinger's actual app directory and Node executable when configuring cron. Suggested starting frequency: scan once per minute, source verification hourly and expiry hourly. Observe runtime and backlog before changing those intervals. Capture nonzero exits and inspect the checkpoint/run audit after uncertain results. Discovery/publication remains an explicit administrator action in this release; automatic publication is not enabled.

## Release gates still open

- Repeat the successful optimized build on the actual Hostinger member-app runtime during hosted preview verification.
- Confirm Hostinger Node.js plan capacity, member-app deployment root, actual production domain and server environment. Existing callback and database guards intentionally remain staging-only.
- Provision the separate website production database, apply reviewed migrations and register only the approved production administrator.
- Approve and configure scheduled maintenance and its server credential; the configuration check currently reports missing pipeline activation, URL and service credential.
- Complete desktop/mobile hosted-preview and anonymous/member/admin smoke checks on the real Hostinger runtime. No main-branch push, deployment or DNS change has occurred.
- Civil Service coverage is still partial. The 332-page result covers selected Work Hub keywords and exact GRS records, not every department or internal vacancy. Cross-provider ID equivalence remains a deduplication limitation.

No email enquiry was sent. No subscription, paid API plan or production schedule was enabled.

Final browser/API verification: the staging member saved the synthetic role, saw it in Saved opportunities, removed it and returned to the empty shortlist. The synthetic listing was then archived through the admin page. Graduate filtering displayed four graduate roles, and the current 939px preview had no horizontal overflow. Anonymous saved-status access returned 401; anonymous admin actions and cross-origin save requests returned 403. Final staging publication wrote/refreshed 139 eligible listings with zero rejected or protected records. Production was not changed.
