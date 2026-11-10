# Pipeline quality corrections · 5 November 2026

Rules version: mettelo-occupations-v9. Staging only.

- Duplicate checks use normalized employer identity (including the observed LinkedIn suffix), exact normalized title/location/country and 5-word description-shingle Jaccard similarity >= 0.90; descriptions must have at least 250 characters. Both matching adverts are held, never silently merged or deleted. Different locations remain separate. This is bounded within the discovered batch, not a historical board cleanup or an exhaustive duplicate detector.
- Full occupation phrases and reordered occupational tokens are considered before bare contextual abbreviations. Added the compound Data & AI Governance Consultant alias. Physical warehouse roles no longer become generic data analysts; technical Data Warehouse Specialist remains supported.
- Added exact Arbeitnow .co.uk/.fr/.ch/.nl hostnames to the existing availability-check registry. HTTPS, credentials/port restrictions, approved redirects and two-confirmed-missing rules are retained. Blocked/outage responses remain transient.
- NHS hosting alone no longer establishes public-sector employment. Employer evidence is required, and technical duty signals alone cannot reintroduce category 20. Uncertain employer sectors stay unassigned.
- v8 prepared previews are rejected in UI, server and database. The service publication RPC rejects stale candidate versions. Existing grants, private authorization, replay locks and archive/manual protection are unchanged.

## Validation

143 unit tests, 107 integrated HTTP checks, 7 database test groups rolled back, TypeScript and static build passed. Live final preview: 63 eligible, 67 held, including 4 adverts across 2 duplicate pairs. The two Finom location variants remain separate. All 26 regional links tested returned active. Governance classification and private-healthcare sector examples were verified in the stored preview. The real warehouse advert was reclassified as excluded using its full source description.

Published listings remain 232; 0 changed during this work; 0 rollback fixtures remain. No publication, removal, emails, schedules or production deployment. Applied migration: 20261105125312_website_pipeline_quality_v9.sql.

## Remaining limits

HMRC automated-request checks currently block its source, and Adzuna/Jooble credentials are not configured. The old extended Civil Service checkpoint is preserved but incompatible with current search terms. Discovery is bounded and not complete market coverage. English vocabulary remains imperfect for foreign-language adverts; exact supported occupational titles can qualify independently of description language. Link availability is not employer-side application testing. The previous Windows EPERM production-build blocker remains unresolved. Existing published duplicates/metadata were intentionally not rewritten.
