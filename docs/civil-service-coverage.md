# Civil Service coverage

Checked 3 November 2026. Coverage is partial; no all-department guarantee.

| Source | Current integration | Limitation |
|---|---|---|
| DWP Digital | Active official cards | Digital board only |
| CPS | Active official adverts | CPS board only |
| Work Hub / Government Recruitment Service | Active bounded search across nine relevant terms, up to three pages per term | Only exact GRS employer records with real dates and a unique CSJ application identity; not every department or vacancy |
| HMRC Careers | Integrated, currently blocked | HTTP 202 automated-access check |
| Home Office legacy feed | Integrated, currently empty | Does not establish that Home Office has no jobs |
| Home Office newer careers board | Investigated, not ingested | Server fetch receives HTTP 403 |
| MHCLG Digital | Investigated, not ingested | Accessible list lacks closing dates; destination CSJ access check prevents validation |
| ONS | Investigated, not ingested | Digital careers page points to CSJ search rather than dated adverts |
| GDS | Investigated, not ingested | Blog links to CSJ search; careers hub returns HTTP 403 |
| DfT | Investigated, not ingested | Careers route redirects to blocked careers hub |
| MoJ | Investigated, not ingested | Validated structured advert adapter still required |
| Cabinet Office, DSIT, DfE, DHSC, Defra, DESNZ, FCDO, MOD, DBT, HMT, DMS, Scotland/Wales/NI offices and other bodies | Direct sources not yet integrated | Some GRS adverts may appear via Work Hub; do not infer department-level completeness |

Work Hub is linked from https://www.gov.uk/find-a-job. Records retain the published employer as Government Recruitment Service; the underlying department is not guessed from descriptive text. Location variants are merged using the CSJ vacancy ID exposed by the public before-you-apply page. Temporary SID-only links are excluded. A Work Hub reference is retained as the stable source and external application route. Existing source-ID duplicate protection is retained; matching across different source ID schemes remains a limitation.

## Extended staging search

Update: the admin preview now uses the durable Supabase checkpoint gateway (migration 20261103163837), not the earlier local filesystem bridge. Legacy local scan utilities remain development-only. See OPPORTUNITIES-ACCEPTANCE.md for the current state and release gates.

Implemented resumable three-page batches for all nine Work Hub keywords, with exact next-page validation, saved cursor, exclusive local scan lock and atomic checkpoint replacement. A failed batch retains its previous checkpoint. The admin page offers Continue Civil Service scan and Start fresh Civil Service scan. Scanning never publishes directly: prepare a new eligible batch, then publish through the existing restricted admin controls.

The first extended pass checked 332 pages and found 38 distinct GRS vacancies with unique CSJ identities. This describes selected keyword results at scan time, not all government departments. Search results can change during pagination. Temporary SID-only adverts remain excluded.

The local staging preview can supplement its normal discovery with the saved scan. Both scan start and update must be within 24 hours, dates and provenance are validated, passed deadlines are dropped, and production is explicitly prevented from loading this local snapshot. The snapshot and checkpoint live in ignored private-data. No database schema changes or production schedule were introduced.

No outreach or further third-party subscription was made. Continue using the existing sources. Remaining coverage work: supported central feed access if later authorised, department-specific source validation and a durable production scan store/scheduler before deployment. Never bypass access checks or invent publication/closing dates.
