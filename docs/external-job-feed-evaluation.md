# External job feed evaluation

## Adzuna

Status: initial read-only test completed; findings below. No publication enabled.

Run from apps/member with private credentials available: `node --env-file-if-exists=.env.adzuna-evaluation scripts/adzuna-coverage-preview.mjs`.

The test queries eight UK role terms, samples up to 50 results each, deduplicates by Adzuna ID, and reports exact known Civil Service employer-label matches separately. Employer matching is deliberately conservative and incomplete. No jobs are published, no source links are followed, and credentials never appear in reports. Reports live in ignored private-data. Adzuna only supplies description snippets; independent closing dates and direct official application routes still require evaluation.

Before regular use: confirm actual government department coverage, attribution, permitted application redirects, refresh/removal behaviour, ongoing licence and cost. An evaluation key is not approval for ongoing organisational use. Keep the general pipeline's Adzuna credentials unset while running the isolated evaluation; do not restart the website with trial credentials enabled for publication.

## Civil Jobs partnership request — prepared, not sent

Subject: Civil Service vacancy feed partnership for Mettelo

Hello,

I run Mettelo, a community for Data, AI and Technology professionals. We are developing a curated opportunity board at mettelo.com, with applications completed on external source websites.

Do you offer an authorised API, JSON/XML feed or data partnership for public Civil Service vacancies? We would like to include relevant Data, AI, Information Governance, Business Analysis and Technology roles across departments.

Could you share the available fields, department coverage, refresh frequency, stable vacancy identifiers, closing/removal updates, attribution requirements, usage limits and pricing? We would retain source attribution and link members to the agreed application destination.

We have not scraped your site or integrated its data. We would like to agree a supported approach before doing so.

Kind regards,
Taiwo
Mettelo
https://mettelo.com

## Evaluation results — 3 November 2026

The existing Mettelo Adzuna trial account was used for a read-only evaluation. No plan changes, payment changes or publication occurred. Credentials were used only in the evaluation process and were not saved in repository or environment files.

- Eight broad role queries retrieved 400 rows: 371 valid unique records, 27 duplicate results and two records that failed the strict HTTPS Adzuna-link validation. One matched the conservative Civil Service employer-label registry.
- A subsequent twelve-employer targeted sample retrieved 56 valid unique records. Of these, 53 matched registry labels (MoJ and DfT). The DfE query returned three records whose employer labels did not match the conservative registry; these were not promoted to verified Civil Service status.
- The Home Office employer query returned HTTP 400. This was recorded as an unevaluated query, not zero jobs.
- GRS, DWP, HMRC, ONS, GDS, MOD, Cabinet Office and CPS employer queries returned zero for this query configuration. This does not establish that Adzuna has no coverage for their aliases or older pages.
- Two matched-employer titles had clear technology-related title words: Digital Manager (MoJ) and Deputy Head, Traffic and Technology Division (DfT). This is a title-based shortlist, not verified eligibility, closing status or relevance.
- Only one results page per query was sampled. The employer registry is incomplete, canonical names may differ and description snippets are limited. The sample is insufficient to support an all-department claim.

Decision: do not enable Adzuna as the primary Civil Service source or publish trial results. Retain official integrations; pursue a supported cross-government feed and the prepared Civil Jobs partnership request. Consider Adzuna separately for broader UK industry coverage after licensing, attribution and relevance evaluation.

Private evaluation reports are in ignored private-data/adzuna-coverage-evaluation.json and private-data/adzuna-department-evaluation.json. Five evaluator tests pass.
