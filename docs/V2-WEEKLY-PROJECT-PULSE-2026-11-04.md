# Weekly project pulse — preparation only

Implemented on the staging project jxijdjmjuzslmjxolhjl. Production was not changed. No email was sent, no provider was called and no schedule was created.

## Agreed behaviour

One pulse per active team/member/week, replacing the proposed inactivity reminder. Only confirmed, admitted members of active team projects with Lab access qualify. Paused, completed and forming teams, solo placements, departed/revoked members, unverified and banned/deleted accounts are excluded.

Reporting periods are completed Monday-to-Monday weeks in Europe/London, including daylight-saving changes. The current week's key prevents duplicate preparation. The summary counts distinct currently completed tasks with a recorded completion event during the reporting week and milestones accepted during that week. It shows the earliest-created open milestone as the next recorded milestone, plus up to three currently blocked task titles. It does not invent progress, completion dates or blocker resolutions. Current milestone/blocker information can be newer than the reporting week.

The private preparation ledger stores team ID, member ID and week; it stores no email address or message body. Its composite primary key prevents concurrent/repeated preparation. A restricted server-only RPC can preview eligibility or prepare records. Ordinary members and anonymous users cannot execute it or access the ledger. RLS is enabled without member policies intentionally.

## Commands (from apps/member)

- `npm run lab:weekly-pulse`: disabled, no database or provider work.
- `npm run lab:weekly-pulse -- --sample`: fictional HTML/text preview, no database or sending.
- `npm run lab:weekly-pulse -- --preview`: read-only staging snapshot and private local previews.
- `npm run lab:weekly-pulse -- --prepare`: staging-only preparation with durable weekly deduplication, no sending.

The last two require existing server-only METTELO_LAB_SUPABASE_URL and METTELO_LAB_SERVICE_ROLE_KEY in .env.lab-mail.local. The script refuses any project URL except the staging project and never prints recipient addresses or credentials. Preview files are ignored by Git. Setting METTELO_WEEKLY_PULSE_EMAIL_ENABLED=true is explicitly rejected: this release includes no email-provider path. No cron was installed.

Before later enabling delivery, separately approve the weekly delivery day/time and implement a delivery worker with recipient eligibility rechecking, leases, sent/failed/unknown reconciliation, suppression and provider idempotency. Do not reuse the preparation ledger as proof of delivery. The existing meeting worker remains separate and unchanged.

## Verification

Six unit/CLI tests passed: disabled no-op, real summary fields, empty-week wording, escaped content and restricted links, unique recipient/team/week keys, rejection of send mode and enabled delivery flags. Staging rollback test: 3 eligible recipients, 3 first preparations, 0 repeat preparations. Post-rollback ledger count: 0. Eligibility and anonymous/member/service permissions were checked. Advisor review found no pulse warning; the private table's no-policy INFO is intentional. Existing unrelated advisor warnings remain unchanged.

The local migration filename was aligned with the hosted migration version 20261104185424. A fictional HTML preview was saved in the chat outputs. Browser visual review could not run because file URLs were blocked by the browser policy; no alternate browser route was attempted.
