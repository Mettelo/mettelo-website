# Mettelo occupational taxonomy and pipeline — 5 November 2026

## Scope and source

User-supplied comprehensive Data, AI, Analytics and Technology title library, adapted to the existing Mettelo pipeline. 1221 occupational records and 1306 title forms/contextual abbreviations, grouped into 21 professional categories. The original library's broad scope is a proposed vocabulary, not an exhaustive or empirically validated market taxonomy.

Source of truth: content/opportunity-taxonomy.json. Generate the server snapshot and lightweight admin labels using node scripts/build-job-taxonomy.mjs. App prebuild/predev and static build run this generator. No new public/member page or menu item. Public Job Board filters/layout are unchanged in this task.

## Classification contract

- One shared classifier for discovery and the disabled legacy quality path. Matching normalises UK/US modelling/visualisation spellings, punctuation, seniority prefixes, whole-word acronyms, reordered and combined occupational phrases.
- Direct professional occupations qualify from a clear title, including short source summaries. Information Officer, generic research/policy, cloud/software/infrastructure and similar adjacent titles require supporting skills and responsibility evidence. Routine data entry and explicit internal-only vacancies cannot qualify.
- BA/DA/DS/ML/AI bare abbreviations are contextual aliases, not unconditional matches. Nonstandard domain titles are held for review; they do not qualify from a domain word alone.
- Occupational categories can be multiple. Healthcare/public-sector industry and career level are separate fields. A title's presence in the public-sector alias list does not make a private employer governmental. Officer/Associate/Research Executive do not imply a universal level.
- Scores retain the existing >=85/high eligibility threshold. scoreType explicitly identifies rule-based relevance; confidence is categorical, not a probability; semanticModelUsed=false. There is no semantic/embedding service, paid classifier or claimed measured accuracy.
- New candidate payloads preserve the original advertised title and carry role_family, role_category, classification_version and classification_details. The latter contains category IDs, canonical occupation, seniority, industries, matched skill/responsibility phrases, reasons, score/status/eligibility and version.
- Review candidates stay separate from publishable candidates in private preview data. No manual override/publish button for review cases is introduced. Improve evidence/taxonomy and prepare again. Maximum 500 eligible and 500 review cases plus a conservative payload budget; overflow fails explicitly without silently discarding candidates.

## Discovery and saved state

The 34-term discovery vocabulary is derived from categories. Keyword-search providers default to at most 12 distinct terms per country/location search: five anchors plus UTC-day-rotating non-anchor terms. Provider page limits, Work Hub advert cap, official-host rules and source error reporting stay intact. Adzuna/Jooble credential gates remain. Full alias strings are not expanded into thousands of requests. Existing per-source/external-ID deduplication is unchanged; fuzzy cross-provider duplicate resolution is not implemented by this taxonomy change.

The durable Civil Service scanner uses the expanded full keyword plan one bounded page at a time. Old checkpoints are not reset or interpreted with new indexes: requiresRestart is displayed and advancement requires an explicit restart. The operator has not restarted the existing checkpoint.

Saved previews require taxonomyVersion=mettelo-occupations-v8. Server/API/CLI guards and the private admin publication function reject legacy previews. The direct service publication function retains its existing replay and permission contract; v8 candidates require complete eligible/high classification metadata. Unknown legacy run receipts must be inspected before replacing an unconfirmed run.

## Staging database

- 20261105110305_website_opportunity_taxonomy adds public.opportunities.classification_details JSONB, stores role category/evidence on insert and refresh, exposes review preview metadata through the existing authorised admin gateway, and rejects obsolete admin publication previews.
- 20261105110958_website_taxonomy_refresh_assignments removes duplicate role-family/version assignments already supplied by an earlier metadata migration. This was caught before real publication by the rollback test; corrected function passes all checks.
- No new public-write grants, privileged endpoints or tables. Existing permission/role checks, private preview access, immutable run fingerprint, advisory lock, archive/manual protection, expiry validation and safe source URLs remain.
- Security-advisor warning classes/counts are unchanged from the previous review: existing private-table policy notices, known self-service/public aggregate definer warnings and disabled leaked-password protection. No new advisor warning from this metadata change.

## Verification and observations

136 unit tests pass, including all 21 category representatives, unknown/conditional roles, language/acronym boundaries, negation/internal eligibility, industry separation, seniority, bounded rotation, private preview rendering and version guards. TypeScript passes; 107 integrated checks pass, including foreign-origin protection for the changed pipeline API. Static build passes; 60 public-page navigation/footer checks and the 99,564-byte homepage asset budget remain unchanged. Browser admin page compiled and rendered, desktop/mobile checked without starting job feeds or publishing.

Six SQL groups pass inside rollback: structured evidence/title retention, exact replay/changed payload protection, refresh plus manual/archive protection, review/incomplete rejection, private preview metadata/obsolete version rejection, and unchanged public-read/private-write boundaries.

Read-only assessment of 192 existing published records using stored short summaries: 83 strong, 82 review, 27 low. These are rule outputs, not measured accuracy or a verified removal list. No listing state or classification metadata was changed in place. Full descriptions and source quality need review before historical cleanup; truncated descriptions can produce review results.

No job-feed fetch, automatic schedule, real publication/refresh, source-link checks, expiry action, email or production deployment was triggered. Only schema/function migrations were applied in staging. The production build remains unverified due to the earlier Windows EPERM output-directory issue; no repeat production build was attempted for this task. Existing eligibility/sponsorship defaults are unchanged.

## Next controlled rehearsal

Review the read-only examples and held roles against full adverts, then explicitly restart the old Civil Service checkpoint and prepare a fresh staging batch when ready. Review source coverage and classification decisions before confirming publication. Calibrate against independently labelled real adverts before lowering the threshold or treating scores as confidence. This task does not add embeddings, eight taxonomy tables, fuzzy cross-source merging, public category filters or silent reclassification of existing jobs.
