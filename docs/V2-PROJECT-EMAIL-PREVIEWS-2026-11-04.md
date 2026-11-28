# Essential project emails — preview mode

Implemented on staging jxijdjmjuzslmjxolhjl only. No emails sent, sender/scheduler enabled, existing records backfilled or production changes made.

## Event capture

Committed database transitions create private preview events for application receipt, offer readiness, clarification, declined/withdrawn decisions and Lab readiness. Receipt keys use the application ID; offer/review transitions use their source and transaction identity; Lab readiness is unique per team/member. Repeated no-op saves do not create another event. Queue insertion participates in the source transaction, so failed/rolled-back operations leave no preview.

The capture trigger stores IDs, kind, review status and event identity; it never copies private reviewer notes. The reader uses an explicit safe projection rather than to_jsonb of private source records. Unverified, banned and deleted accounts are excluded. Stale decisions, accepted/expired/replaced offers, paused Labs and revoked/departed memberships are filtered when previews are read. A Lab-ready event requires both actual team activation and admitted membership; offer acceptance alone is insufficient. Existing records are not backfilled, and unrelated edits to existing active teams/members do not retroactively enqueue Lab-ready mail.

Capture is enabled for future staging events through private_website_lab.project_email_preview_settings. This is preview capture, not an email sending switch. Disable capture before the later silent import, restore afterwards, and never convert historical preview rows into a live delivery backlog.

Both preview tables have RLS and no member policies, intentionally. Anonymous and member roles have no function/table access; a service-only RPC returns up to 100 actionable previews by default (hard cap 200). No public/admin UI, member navigation link or browser-callable endpoint was added. Existing bell notifications and the weekly pulse remain separate and unchanged.

## Preview commands (apps/member)

- `npm run lab:project-email-previews`: disabled no-op, no database/provider calls.
- `npm run lab:project-email-previews -- --sample`: writes five fictional HTML/text previews.
- `npm run lab:project-email-previews -- --preview`: reads actionable events using the existing server-only staging credentials in .env.lab-mail.local. Writes ignored private local preview files without email addresses.

The script refuses production URLs and rejects METTELO_PROJECT_EMAIL_ENABLED=true. It contains no email-provider path and no send mode. No cron exists. Provider integration, delivery leases, uncertain-send reconciliation, eligibility rechecks and approved staging recipients are later delivery work, not part of preview mode. Preview event IDs provide stable future idempotency identity but are not a sent-mail ledger.

Clarification and outcome messages use generic member-facing copy and a support link. They never include private notes. Offers link to review/accept in the member Lab list; Lab-ready messages link directly to the assigned workspace. A separate public decision-message editor has not been added.

## Validation

12 renderer/CLI/weekly-regression tests passed. Five staging database test groups passed inside a rollback transaction: receipt/duplicate submission; private-note exclusion and stale decision suppression; distinct offer/activation stages and duplicate protection; paused Lab suppression; service-only permissions. A missing owned milestone initially blocked the activation fixture, confirming the existing readiness guard; the fixture was completed and the checks passed without weakening the guard. No fixture records or preview events remain after rollback. Security advisor returned only expected private-table no-policy INFO entries for this feature, with no project-email warning. Migration version synced to hosted 20261104190740.

A standalone fictional gallery was saved to the chat outputs. Browser inspection of local file artifacts was blocked earlier in this session; no visual browser review is claimed for these email samples.

Final integrated preview regression: 101 checks passed.
