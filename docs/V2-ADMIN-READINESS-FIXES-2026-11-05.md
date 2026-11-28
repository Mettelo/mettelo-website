# V2 admin readiness fixes — 5 November 2026

Local staging only. No production deployment, real member import, email delivery or scheduling activation.

## Implemented

- Renamed server News and application-status modules to remove .ts/.mjs basename ambiguity. All server/type imports now use explicit distinct module names. Added a collision regression check.
- Public News and Job Board metadata follow an explicit release policy. Both METTELO_PUBLIC_INDEXING_ENABLED=true and METTELO_PUBLIC_SITE_ORIGIN=https://mettelo.com are required. Defaults remain noindex; private/admin/auth/API routes keep their blanket noindex header. This flag is not a production-hosting switch: existing staging database/callback restrictions remain.
- Runtime sitemap combines the generated 58 static URLs, News, Job Board and anonymous published articles (63 URLs in current staging). Drafts and private routes are excluded. Errors fail the sitemap request instead of silently publishing an incomplete catalogue. The local public proxy now forwards sitemap.xml to the runtime. Deployment must route the real sitemap to the runtime too; a static-only package cannot provide live article coverage.
- Added title/summary/URL preview to the existing News editor. Canonical/social metadata still derives from reviewed article content; no new content-management navigation or overrides.
- Project operations now counts Awaiting review as new, unallocated applications, matching the central member dashboard. Current staging displays 0 on both screens rather than counting three already-placed applications.
- Added staff ownership for public contacts and member enquiries, with assigned/unassigned/unavailable filters. Only available Operations/Full administrators are eligible. Ownership is private, version checked, serialized per enquiry and audited. Member-visible enquiry tables/responses are unchanged. Existing assignments display unavailable owners after role/access changes so staff can reassign.
- Admin overview shows project-event preview counts, weekly preparation counts and meeting queue states. No sending buttons, secrets, recipient addresses or raw provider errors. Provider acceptance is not labelled delivery.
- Added offline migration-manifest validation: two exports, approved consolidated mapping, unique normalized emails/source records, explicit duplicate merges, source coverage, catalogue project references, team status agreement and one coordinator/solo owner per team. CLI verifies both original export SHA-256 checksums, prints counts only and refuses --apply. No database/email dependencies.

## Verification

- TypeScript passes.
- 120 unit tests pass together. Includes checksum success/mismatch and refusal to apply, indexing gates and module collision detection.
- 106 anonymous integrated HTTP checks pass, including both sitemap origins, staging crawl policy, private redirects and support API origin/session protection.
- Static build passes, including 60-page footer/navigation parity and asset checks. Homepage initial local assets remain 99,564 bytes.
- Five SQL test groups pass, all rolled back: operational access denial, safe aggregate mail status, both enquiry sources assign/unassign/audit/stale-version checks, suspended owner rejection and no direct-table/member-response leakage.
- Browser verified support inbox/ownership, 390px mobile alignment (no horizontal overflow), existing article search/share preview, corrected project count and admin email overview. No browser assignments, replies, publications or mail sent.
- Staging migration 20261104204029_website_admin_readiness applied. Tests left zero new ownership records/audits behind.
- Security advisors: no new warning for this RPC/table. Private-table RLS-without-policies notices are intentional deny-by-default. Existing self-service/public aggregate definer notices and disabled leaked-password protection remain separate release review items; no auth setting changed.

## Still required before release

1. Production build verification: Next 15.5.28 repeatedly fails with Windows EPERM creating output subdirectories. Reproduced in clean repo output and a clean source/dependency snapshot, with/without Webpack build worker. TypeScript/dev/HTTP checks pass, but a deployable production build is NOT verified. Do not mark this release ready until a clean build and runtime smoke test pass on the intended host.
2. Project/weekly email delivery workers, provider/idempotency/retry tests and a controlled recipient test remain outstanding. This change adds truthful status visibility, not delivery implementation or activation. Meeting notices have an existing separately gated worker; it was not run. Fresh account-verification email delivery also needs a controlled test.
3. Two-to-three-account end-to-end staging rehearsal, then approved migration mapping from both original source exports. Manifest validation does not grant import approval or create Lab admission/repository access automatically.
4. Approved hosting/routing, canonical-domain, callback/database release configuration and production content review. Do not enable indexing on synthetic staging articles.

## Migration validator usage

Keep the mapping and exports in ignored private-data storage. Run:

    node scripts/validate-member-migration.mjs --manifest private-data/reviewed-migration.json --source members=private-data/members.csv --source projects=private-data/projects.csv

Required JSON shape (synthetic values only; replace hashes with SHA-256 of original exports):

~~~json
{
  "version": 1,
  "target": "isolated-staging",
  "notifications": "disabled",
  "mappingApproved": true,
  "sources": [
    {"id": "members", "sha256": "64 lowercase hex characters", "rowCount": 1},
    {"id": "projects", "sha256": "64 lowercase hex characters", "rowCount": 1}
  ],
  "accounts": [{
    "email": "fixture@example.invalid",
    "profileApproved": true,
    "mergeApproved": true,
    "sourceRecords": [{"source": "members", "id": "submission-1"}, {"source": "projects", "id": "submission-2"}],
    "placements": [{"projectRef": "MTL-DA-001", "teamKey": "reviewed-team-key", "status": "active", "role": "Analyst", "coordinator": true}]
  }]
}
~~~

An account outside project work has placements: []. Row-count coverage is strict; exclusions need explicit review and a reconciled source manifest. Checksums verify source bytes; source-column/profile correctness still requires the approved mapping review. Never commit real names/emails/source rows to repository or public reports.
