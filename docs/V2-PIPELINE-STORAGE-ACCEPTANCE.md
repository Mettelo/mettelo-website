# Pipeline storage acceptance — 2 November 2026

Website staging only. The platform remains untouched and no production release or real-listing import occurred.

Added provider identity/deduplication and verification/lifecycle columns to the existing opportunities table. Added private run summaries and verification history, with RLS and no browser schema/table access. Two service-role-only SECURITY INVOKER functions atomically publish a bounded batch and expire passed-deadline/stale records. Browser access rules and saved-list ownership remain unchanged.

Batch publication records its source fingerprint, preserves IDs through provider-key upserts, rejects invalid/old/low-relevance candidates, and will not overwrite manual or archived listings. An advisory transaction lock prevents competing publication/expiry transactions. Replaying a run ID with the same payload returns its stored summary; a different payload must use a new run ID. A future durable scheduler still needs full-run overlap prevention: this database lock covers individual transactions, not feed fetching.

Tests caught a missing UPDATE privilege on run summaries. A separate repair migration grants only the required summary/timestamp columns and also explicitly rejects SQL-null batch input. Tests then passed under the real service_role database role: publication, identical replay, new-run deduplication, low relevance rejection, deadline expiry, reactivation, archived/manual protection and browser privilege denial. All synthetic changes rolled back. Verification query confirmed zero pipeline test records, zero persisted runs and the two original opportunity samples intact.

Added website-runner.ts, with explicit staging activation and destination checks, safe application URLs and checked RPC errors. It is not exposed by a route or schedule. It uses conservative unknown eligibility/sponsorship values rather than inferring guarantees. It has not executed a live publication: no website pipeline server credential is configured. Source quality/lifecycle modules remain write-disabled pending their separate adapter and source-probe review. The runner currently covers discovery publication plus database deadline/staleness expiry, not the entire source pipeline.

TypeScript and twelve member tests passed. Supabase advisors show two new informational deny-all RLS findings for the private run/history tables; this is intentional. Existing profile-function and password-protection warnings remain. Reference: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.

Next: test runner failure/retry and provider-to-feed integration with a controlled credential; complete quality/source-verification adaptation; agree controlled real-feed staging ingestion; only then activate a supported Hostinger schedule. A persistent real-feed run is not authorised merely by these rollback-only tests.
