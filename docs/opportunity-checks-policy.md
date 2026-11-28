# Opportunity checks policy

Adopted 3 November 2026 for website staging.

- Reviewed source adapters select relevant roles automatically. Clear domain titles do not require tool keywords in truncated summaries. Explicitly internal-only roles are excluded.
- Per-source reports distinguish retrieved, eligible, out-of-scope, internal-only, stale/closed and duplicate records. These are retrieved-record counts, not claims of nationwide coverage.
- An administrator starts staging discovery and publishes an immutable eligible batch. Individual jobs do not require separate manual approval. Production scheduling is not enabled.
- Provider and external vacancy ID identify each record. Publication retries reuse the same batch ID; removed records remain protected.
- More than 500 eligible candidates raises an explicit batch-limit error instead of silently dropping records. Larger runs require a subsequent batching implementation.
- Blocked requests, outages and skipped hosts do not count as closure. Two confirmed missing/absent-feed checks are required to hide a missing listing.
- Passed deadlines and 14-day verification-freshness expiry remain separate existing rules. Freshness expiry does not assert employer closure.
- Before production launch, configure monitored server-side discovery and verification schedules, drain all due checks, and define failure alerts. Do not use member browsers as schedulers.
- Civil Service coverage remains partial. A department registry with last-success and source status is required before claiming all-department coverage. Blocked sources need an approved feed or validated departmental alternative.
