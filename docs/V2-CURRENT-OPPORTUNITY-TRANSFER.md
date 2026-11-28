# Current opportunity transfer preparation

Source database inspected read-only: Mettelo Platform aconptuqupsgznyrxhrh, 1 November 2026. There are 293 published/public/high-relevance listings with no future publication date. All have null closing dates. Therefore they match the platform's current discovery rules, but the database does not prove every employer is still accepting applications. Source-expired and archived statuses were explicitly excluded regardless of null deadlines.

All 293 retain source IDs and their public detail fields. HTTPS application/source links were parsed locally: no invalid protocols or embedded credentials. These checks do not verify employer availability. No member data, saved lists, unpublished content, ingestion secrets or administrative fields are included.

Prepared ignored files: private-data/public-opportunities-transfer.json and .sql. These are not website assets or committed source. The SQL uses an explicit column list, escaped values, one transaction and insert-on-conflict-do-nothing so existing records cannot be overwritten. No SQL file has been executed against a destination yet.

Project inventory still shows only platform and V2 staging. No separate website production database exists. The previous synthetic-only staging restriction remains unless the owner approves this public-listing exception. Owner was asked whether to copy these public records into staging or prepare files only. Do not infer an answer from elapsed time.
