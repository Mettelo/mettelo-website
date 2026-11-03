# Saved opportunities — staging

Transfers the platform SaveOpportunityButton/API/shortlist journey into the website member app. Uses the authenticated client and owner RLS throughout; no service-role reader or platform production connection. Deadline reminder fields, toggle and email promises are not transferred.

Members can save a published, current public listing, reload their private shortlist, revisit its detail and remove it. Saving is idempotent. Closed public listings stay readable in the shortlist. If a listing becomes private or unpublished, its content is not exposed: a removable unavailable-listing row remains instead. Errors are displayed as unavailable rather than an empty shortlist. Mutation requests require a verified account, exact configured origin, bounded valid JSON and a UUID; ownership comes from the authenticated user, never the request body.

The additive staging migration grants only owner SELECT/INSERT/DELETE. Inserts also require a currently open, published/public/high-relevance listing; this is enforced by RLS as well as the API. No UPDATE or anonymous privileges are granted.

## Validation

Rollback-only SQL covers duplicate saves, another user's visibility/deletion, owner spoofing, draft/closed listing refusal, withdrawn-listing privacy, removal and anonymous denial. Synthetic users and their rows roll back. TypeScript and the existing ten member tests pass. Browser evidence is recorded with this change after save/reload/remove checks. Production member build, hosted/mobile email tests and V2 pilot remain outstanding.

Existing Supabase security findings remain: intentionally callable profile definer functions, deny-all private onboarding table, and disabled leaked-password protection. No saved-opportunity-specific advisor finding appeared. Guidance: https://supabase.com/docs/guides/database/postgres/row-level-security and https://supabase.com/docs/guides/auth/password-security.

## Real-listing publication process — not activated

1. Prepare approved records for the separate website database, retaining stable source IDs and source/application URLs. Do not connect the website to platform production or copy unpublished/private data.
2. Validate required fields, HTTPS links, source, eligibility/sponsorship wording, dates and duplicate identity. Import as drafts first. No fabricated verification claims.
3. Review the draft on isolated staging with synthetic data and test list/detail/expiry before approving the production import destination.
4. Once website production provisioning and release are approved, import approved drafts and explicitly publish selected records. Record who reviewed the source and when. Keep draft records hidden by RLS.
5. Remove expired entries from discovery automatically by the feed date filter; withdraw changed or invalid sources. Saved members see closed or unavailable states without losing the ability to remove their bookmark.

Publication tooling/admin interface, ingestion schedule and real-record import are still pending. This document does not authorise a production write or automatic publication.

Browser acceptance completed: saved the labelled Data Analyst staging fixture, opened the private shortlist, reloaded and confirmed it persisted, checked phone viewport 360 (content/scroll widths both 345), removed it and observed the empty state. Database count returned to zero; no test bookmark remains. The two synthetic SQL users also rolled back. Static packaging boundary tests passed. Security advisors reported only the previously documented findings.
