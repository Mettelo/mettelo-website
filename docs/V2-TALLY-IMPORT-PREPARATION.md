# Real-member prefill preparation

1 November 2026. Owner chose a separate website database in the Mettelo organisation. Supabase get_cost quoted $0/month, but create_project rejected it because the owner already has two active Free projects. No new project was created. Owner then explicitly chose to keep both existing projects active and prepare the import only. Do not pause, replace, upgrade or connect either backend as an implicit next step.

## Prepared artefacts and boundaries

`scripts/tally-profile-import.mjs` reads the original CSV without modifying it. Default output contains aggregate counts and the dataset hash only. It can write a private JSON plan only under the ignored private-data directory, refuses overwriting an existing plan and rejects --apply. It has no database-write or email-send path. No source values, names or addresses belong in this document, Git, public build output, CI logs or screenshots.

The private plan contains normalized email, reviewed draft fields, a duplicate-review flag and source submission IDs. It is a staging-independent preparation artefact, not an account list to invite. Emails are normalized by trim/lowercase only; provider-specific dots and plus suffixes are preserved. Repeated source submission IDs fail the run. Repeated emails produce one held record with an empty draft; no latest-wins merge occurs.

Prefill maps City/Country to location, bio to bio, validated LinkedIn professional profile links, and consistent GitHub profile URL/username to github_url. It preserves field length checks and only accepts HTTPS professional links. Ambiguous Basic Information/Last Name fields are not concatenated. Role/experience/skills/interests taxonomy, employment fields, goals, WhatsApp and historical agreements are not imported into this basic activation draft. No old agreement becomes a new consent choice. Future mapping changes require another dry run and reviewed handling rather than silent truncation.

## Actual dry-run result

- Source hash: 3eabbdd62386566a495d62a4e8be2378b3ce4431daf25717e242aaa0de3fece8.
- 120 submissions, 116 normalized email groups.
- 112 groups can receive an editable private draft; this does not mean all fields are complete or every source value was accepted.
- Four duplicate email groups require review; their source submission IDs remain in the private plan.
- 75 field values were omitted by length/link checks. This is a field count, not a member count. No automatic truncation.
- Name mapping withheld for all 120 source rows pending clarification of the ambiguous field. The member's existing signup name remains authoritative.
- Zero accounts created, messages sent or database writes.

Nine member/import tests pass, covering CSV quoting/multiline handling, invalid input, duplicate submissions/emails, privacy exclusions, profile validation and conflicting professional links.

## Apply gate for a future destination

Resolve the website production database destination without disrupting existing operations. Establish website schema and private-source permissions, reviewed backup/restore and credential handling. Preview the exact target ID before any import. Import source rows idempotently by dataset/submission ID; never overwrite a claimed row or existing saved profile on rerun. Preserve unresolved source records for manual reconciliation. Match/claim only from verified Auth email, require member review/save, and prove stale/concurrent claims remain safe. Do not create Auth accounts or send onboarding emails as an import side effect. Bulk launch emails remain disabled until a separate release gate.

Current website runtime still targets isolated staging. Real registrations have not been connected to it or moved into staging. The earlier protected source store in the platform project remains untouched.
