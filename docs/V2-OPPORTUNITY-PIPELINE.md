# Website opportunity pipeline transfer

Owner direction: reuse the platform's ongoing pipeline, rather than relying on a one-time listing copy. This supersedes the pending question about importing the 293 public records into staging. No approval to import them was inferred.

## Source process

Pinned platform source lib/opportunities/{discovery,pipeline,quality,lifecycle}. Discovery fetches Arbeitnow and Remotive, plus optional Adzuna and Jooble. It strips markup, classifies relevance, deduplicates provider IDs and excludes source publications older than seven days. High-scoring listings are published; quality processing adjusts geography, removes irrelevant titles and checks licensed-sponsor context. Lifecycle processing expires passed deadlines, stale discovery records and confirmed dead sources. A licensed employer is not proof that a particular role offers visa sponsorship.

Platform vercel.json schedules discovery at 05:15 and lifecycle at 05:45. This is source configuration, not evidence that either schedule currently runs. Vercel cron configuration does not schedule a Hostinger app.

## Implemented first slice

Copied discovery, quality and lifecycle modules into apps/member/lib/opportunities. Discovery now defaults to dry-run, classifies provider results without database access, and allows fixture injection for tests. Public feed requests have twelve-second timeouts. Quality/lifecycle and write-mode discovery explicitly refuse execution until website write activation is implemented. No cron endpoint or schedule is exposed. Existing platform credentials are not copied.

Local entry point: node apps/member/scripts/opportunity-discovery-dry-run.mjs (run from repository root). The script uses the installed TypeScript compiler as a local development tool; it is not an application route or Hostinger production runner.

Read-only run: Arbeitnow returned 300 and Remotive 12; 303 remained after freshness filtering and deduplication, of which 34 qualified. Adzuna and Jooble were unconfigured. These are discovery candidates, not 34 published website listings or independently verified vacancies. This is a different set from the earlier 293 already-published platform records.

TypeScript and twelve tests passed. Added tests verify stale exclusion, deduplication, classification, partial source failure and that all write paths refuse execution before external work. No database writes, platform edits, credentials changes, recurring job or production deployment occurred.

## Next implementation gates

1. Extend the website-owned staging schema with provider identity, deduplication constraints, source/publication/verification timestamps, quality decisions and a private verification-check history. Existing minimal opportunities schema does not support the full pipeline yet.
2. Add a server-only website database adapter with explicit destination guard, run lock, checked write errors, idempotent upserts and run summaries. Source code currently swallows several write errors; do not preserve false-success reporting.
3. Test provider-to-database-to-public-feed behaviour using synthetic fixtures, including expiry, reactivation, archived/manual records, partial failures and repeat runs. Review sponsorship detection and constrain lifecycle URL probing before enabling untrusted URLs. Protect privileged verification history from browser roles.
4. Configure scoped website/staging credentials securely; use optional provider credentials only when available. No service key in browser code. No copying platform service credentials into website configuration.
5. Run a controlled live-feed staging ingestion only after the destination and change from synthetic data are agreed. Inspect candidates and publication decisions. Decide whether a reviewed initial import is still useful for continuity; no import is currently performed.
6. Establish a supported Hostinger-compatible scheduler for the deployed server app, authenticated job invocation, overlap prevention, timezone and failure monitoring. Verify hosting limits and runtime before activation. Do not copy Vercel scheduling configuration and assume it runs.

The pipeline is not operational yet. Website production database provisioning, member production build, hosted staging, pilot and explicit release approval remain separate release gates.

## Current UK coverage and direct-apply design — 3 November 2026

This section supersedes the older first-slice status above.

Cards and saved-role titles/actions link directly to validated HTTPS source URLs in a new tab. No intermediate Mettelo job detail is required. Legacy detail routes remain so existing bookmarks do not break. Missing links are not replaced with invented application URLs. Existing saved-role records are retained.

Lean publication stores title, employer, short summary (320 characters maximum), source/application URL, location, known deadline and classification/check metadata. Full advert text is used only while reading/classifying a feed, not stored as a long job description. Repeated provider IDs upsert the existing row. Passed deadlines and expired source records disappear from the public board; private saved references are not destructively deleted.

Sources implemented:
- NHS Jobs: official external-only XML endpoint https://www.jobs.nhs.uk/api/v1/search_xml. Documentation: https://www.nhsbsa.nhs.uk/about-nhs-jobs/nhs-jobs-integration-and-benefits (self-serve specification V1.07). Ten UK technical search families, at most two pages of 100 per keyword, unique vacancy IDs. End dates carried to publication. Older adverts can remain eligible while their stated deadline is still future. No clinical jobs inferred to be technical just because the employer is NHS.
- Civil Service: the official Home Office Atom feed linked from https://homeofficejobs.tal.net/vx/mobile-0/appcentre-2/brand-3/candidate/jobboard/vacancy/1. Currently reachable but empty. This is Home Office coverage only, not a claim to cover every Civil Service department.
- Central Civil Service Jobs returned an anti-bot page; its beta endpoint failed. No bypass was attempted. A usable official feed or authorised data-provider connection is still required for broad departmental coverage.
- Existing Arbeitnow/Remotive remain; optional Adzuna/Jooble searches now include UK business/performance/information analysis and technology terms. Those providers need their own server-side credentials; they are not configured in the current environment.

Refresh rules:
1. Prepare a bounded read-only candidate batch (maximum 500 qualifying rows, summary capped at 320).
2. Publish with a stable run ID. Retry the identical saved batch if a result is uncertain; do not fetch a replacement batch for the same ID.
3. Check due source records (up to 100 per invocation). NHS checks use the exact job reference in its official feed; valid absence must occur twice, with the existing six-hour retry interval, before hiding. HTTP errors, bot pages, invalid XML and rate limits are temporary failures, not evidence of closure. Home Office HTTP 404/410 uses the same existing two-confirmation rule; HTTP 200 alone does not prove continued availability.
4. Run deadline/staleness expiry. Dates past their deadline hide immediately on the next expiry pass; fourteen-day stale auto-discovered records are hidden as stale, not asserted employer withdrawals.

Commands, from apps/member:
- npm run opportunities:dry-run
- npm run opportunities:prepare
- npm run opportunities:run -- RUN_ID
- npm run opportunities:verify
- npm run opportunities:expire

Environment: METTELO_PIPELINE_ENABLED=staging, fixed website staging URL and server-only METTELO_PIPELINE_SERVICE_ROLE_KEY. Keep all keys out of browser bundles. The old transferred direct-write discovery/quality/lifecycle paths remain disabled. Only the guarded website runner may publish. Current .env.local has none of these three runner settings; they were not activated here.

Operations proposal for a later hosted release: discovery every six hours, source verification hourly, expiry hourly, non-overlapping jobs and an alert on failed/unconfirmed runs. No recurring schedule is configured. Hostinger static files alone cannot execute this Node runner; verify the deployed server runtime and job facility first. No production deployment or production database connection is made by this change.

Evidence: official-feed dry run scanned 1,077 NHS candidates, 21 qualified; Home Office feed returned zero without error. These are discovery candidates, not newly published website records. Staging migration 20261103080209 enables nhs/civilservice provider IDs, short summaries and exact-NHS feed absence handling. Database rollback test verifies older-but-open NHS publication, 320-character persistence and expiry only after two due absence checks. Automatic review initially rejected malformed generated SQL; corrected replacement handling and reviewed function/lock counts before successful migration. No malformed SQL applied.
# Temporary staging admin console — 3 November 2026

Route: `/member/admin/opportunities` in the member application. The account dropdown exposes the link only after a database administrator check. Currently the only approved administrator is the verified staging account `taiwo.olaoluwaj@gmail.com`; ordinary members and anonymous users cannot run controls. The private database registry is managed through trusted database administration, with no self-service grant endpoint. No service-role key is required by this console.

The console prepares a source-health report and candidate preview without publication, stores the exact batch privately for 24 hours, publishes the reviewed batch idempotently, checks ten due source links per run, expires passed deadlines/stale listings, and removes individual jobs with a reason. Removal archives the record, preserves saved references and prevents rediscovery from republishing it. Actions have a private audit trail. Refresh after an uncertain request and retry the same prepared run rather than generating a replacement. No automatic schedule is enabled.

Civil Service coverage now includes the official DWP Digital vacancy board, linking directly to Civil Service Jobs, in addition to the existing Home Office Atom feed. DWP cards must have an official job ID and a future closing date. Posting dates are left unknown when absent. Department-scoped source checks use the DWP board; two due, valid-feed absences are required before closure. Bot pages, malformed feeds and network errors do not count as closure. This is departmental coverage, not a claim to cover all Civil Service vacancies. Central Civil Service search is currently protected and is not bypassed.

Validation: 28 automated tests and TypeScript checks passed. Staging SQL checks reject nonadmins and anonymous RPC access. A rolled-back synthetic test verified prepared publication, idempotent replay and archiving. The new migration is `20261103082120_website_temporary_opportunity_admin.sql`. Browser review passed on desktop and at 390 px with no horizontal overflow. The console prepared 74 candidates (including four DWP Digital roles), and the expiry control hid one overdue synthetic listing. No real jobs were published and no production deployment occurred. The local preview remains at http://127.0.0.1:3003/member/admin/opportunities.



## Additional Civil Service departments — 3 November 2026

Added official CPS careers discovery and HMRC careers discovery. CPS yielded 12 current adverts, with four relevant roles accepted by the classifier: Area Performance Analyst, Senior IT Service Manager, Lead Corporate Knowledge and Information Manager, and Finance Systems Analyst. CPS cards link to stable official CPS adverts; some Apply now buttons go through a CPS profession page before Civil Service Jobs. Unrelated legal jobs are excluded. A missing posting date is retained as unknown; publication requires an allowlisted CPS advert URL and a future closing date. No posting date is invented.

HMRC exposes structured JobPosting data, but its syndication expiry can differ from the applicant-facing closing date, so the reader requires the visible closing date. Search pagination and advert fetches are bounded and restricted to the official host. The live source currently returns HTTP 202 automated-request checks; the admin preview reports unavailable and neither publishes blocked responses nor interprets them as job closures. Its parser is fixture-tested but live ingestion is not operational while blocked. Central Civil Service search and the current Home Office careers pages remain protected; GDS public board returned no current openings and was not activated. These are documented coverage gaps, not nationwide coverage.

The expanded live dry run scanned 1,390 records and qualified 83 candidates. The latest batch was published to staging through the existing admin gateway. The CPS publication rule was applied in migration 20261103104424_website_cps_civil_service_source.sql; rolled-back SQL tests accept genuine-shaped CPS URLs and reject unreviewed hosts. No new tables, permissions or credentials were needed. Security advisor findings are unchanged. Production remains untouched.


## Admin browser verification completed — 3 November 2026

The previous confirmation check is now resolved in an isolated Next preview at http://127.0.0.1:3004/member/admin/opportunities. The old 3003 preview served the correct HTML and JavaScript files but its React controls did not hydrate reliably; a separate .next-preview output restored interactive confirmation and live search. Keep concurrent development previews in separate output directories. Run npm run dev:preview from apps/member to use the isolated folder and port 3004. Email callbacks remain on the existing approved 3001 origin. The additional request origin is accepted only in development with METTELO_ISOLATED_PREVIEW=1; production and other origins remain rejected.

Browser evidence: publication confirmation opens; Confirm publication calls the protected API and renders success; replay of the exact saved 83-candidate batch leaves 86 total rows and 85 published rows unchanged. All 84 provider-backed rows still have distinct provider IDs, and the batch has exactly one pipeline run record. Live search for Crown returns four CPS listings; Cancel closes the confirmation without publishing. TypeScript and 34 tests passed. No production deployment or platform modifications.

## Durable checkpoint update — 3 November 2026

The active administrator workflow now stores Work Hub scan progress in the website Supabase database using website_opportunity_scan and private_opportunity_pipeline.scan_checkpoints. The migration is 20261103163837_website_durable_opportunity_scan.sql. The previous local JSON scan remains only a development utility/archive; the active admin workflow no longer requires it. The existing 332-page/38-vacancy checkpoint was transferred to staging. One-page scan batches have a 45-second fetch deadline, a database lease and revision-checked commit replay. Anonymous and non-admin checkpoint access, competing claims and commit replay were tested in rolled-back SQL transactions.

Metadata refresh migration 20261103164728 updates opportunity type, role family and classifier version on rediscovery; the Graduate filter was checked in the browser. See OPPORTUNITIES-ACCEPTANCE.md for the current complete validation record and explicit Hostinger launch gates. No schedule, production target, paid API or email was activated.
