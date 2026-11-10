# Opportunities transfer — staging slice

Transferred from the pinned platform source: OpportunityBoard, opportunity detail presentation and their responsive CSS. The website-owned Next app serves public /opportunities and /opportunities/[id]; member navigation links to it. The public static root is unchanged. Hostinger routing and public navigation still need the coordinated homepage release.

Implemented: search, quick and advanced filters, pagination UI, contextual listing cards, detail facts, official external application links, closed-listing state, loading/empty/unavailable handling. Dangerous application URL schemes and embedded credentials are rejected. No employer application is submitted or tracked by Mettelo.

The isolated staging project now has an additive website-owned opportunities table. Anonymous and authenticated roles can only SELECT published/public/high-relevance records whose publication date has arrived. Browser inserts, updates and deletes are not granted. Expired listings leave the feed; an existing public detail remains readable with its application link removed. No platform database connection, copied platform records or service key is used.

Two clearly labelled synthetic staging records were created: Data Analyst and Remote AI Internship. The internship was expired during acceptance testing and remains closed. These are not real vacancies. No real opportunity import or automated source ingestion has occurred.

## Evidence

- TypeScript and ten member tests passed, including safe external URL checks.
- Rollback-only SQL tests verified hidden draft/private/low-relevance/future records and read-only browser privileges. The SQL test expects the labelled staging fixtures; do not run it against production.
- Browser: two records loaded; unmatched search showed zero with recovery; clear restored two; Remote filter showed one; public detail loaded; expiring the sample changed it to CLOSED and removed the application link.
- Listing and detail at phone viewport 360 had content and scroll widths both 345.
- Root static build, existing public checks and packaging privacy tests passed.
- Security advisors added no opportunities findings. Existing profile definer warnings, private onboarding deny-all policy info and disabled leaked-password protection remain recorded limitations. See https://supabase.com/docs/guides/database/database-linter and https://supabase.com/docs/guides/auth/password-security.

## Still required for acceptance

Saved opportunities and their owner-only persistence/API are not transferred yet; the save controls are deliberately absent. No new alert subscription promises or CMS administration were introduced. Remaining work includes saving, publication/source management, approved real records, pagination and full filter/device acceptance, error-path fault injection, hosted staging, website production database provisioning, and the previously unresolved member production build. This slice is not a completed opportunities release or V2 sign-off.

Update: owner-only saved opportunities have since been transferred and tested; see V2-SAVED-OPPORTUNITIES.md. Real-listing publication and the other release checks remain pending.
