# Source verification recording — 2 November 2026

The staging server-key slot was checked without displaying its contents; it is empty. No authenticated CLI publication or real-feed ingestion ran.

Added a service-only SECURITY INVOKER function recording source availability results in private verification history. It checks the expected URL against the current listing, ignores listings no longer published, rejects inconsistent HTTP/state input and enforces the next-check interval. Observation IDs make repeated recording idempotent. One 404/410 schedules a six-hour retry; a second due missing observation expires the listing. Active responses reset the failure count; skipped/transient responses do not expire a role. A source changing between fetch and recording prevents an outdated observation being applied.

Added a bounded server worker and explicit verify-sources CLI action. It uses the staging-only client guard and reviewed-host probe. It stops on an unconfirmed database write and never reports an entire run as successful after partial failure. It has not run against live sources or been scheduled. Legacy source quality and lifecycle modules remain write-disabled. The employer-host registry is still intentionally limited.

The existing broad public SELECT grant would have included newly added pipeline internals. Replaced it with an explicit public-field column grant, preserving the list/detail/filter and saved-list fields. Internal failure counters, errors and run details are not available to anon/authenticated roles. Anonymous public-feed SELECT passed afterward.

Rollback-only source verification tests passed under service_role, covering URL changes, missing observation replay, not-due checks, transient response, active reset, eventual expiry and public-column/function privileges. TypeScript and seventeen member tests passed. A repeat of the earlier saved-opportunity SQL suite did not complete because its tool confirmation expired; it is not counted as a pass for this slice. Existing security-advisor findings remain unchanged. Private tables intentionally have no browser RLS policy: https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy.

The next authenticated integration still requires the existing V2 Staging server key in ignored apps/member/.env.pipeline.local. Do not use the platform key or put a secret in chat. This is an actual missing input, not a completed runtime check. Nothing was deployed and no real opportunities were published.
