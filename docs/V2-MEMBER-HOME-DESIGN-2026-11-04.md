# Member home implementation — 4 November 2026

Current owner-approved build. Local preview and V2 staging only; no production push or deployment. The approved hierarchy is: compact welcome, prominent next action, compact progress tiles, activity links, smaller Profile/Opportunities panels and support. Profile, enquiries and account settings remain in the name/photo menu.

## Counting rules

| Card | What is counted |
| --- | --- |
| Active projects | Distinct project briefs in the member's confirmed, admitted, enabled active Labs. |
| Milestones completed | Milestones owned by the member, marked done through recorded coordinator/admin acceptance with contribution evidence and a review note. The monthly caption uses acceptance time in Europe/London. |
| Projects delivered | Distinct project briefs in accessible completed Labs with explicit delivery confirmation and contribution evidence. All milestones must be accepted and tasks done before confirmation. |
| Skills practised | Distinct case-normalised skills the member links to their own contribution evidence. This is recorded practice, not certified proficiency or verified Mettelo Proof. |

Counts cover currently accessible Labs. Existing records are not retrospectively assigned acceptance or delivery evidence. Zero is an honest empty state with encouraging guidance; unavailable sources show a dash and retry guidance instead of a false zero.

## Member home and existing Lab

- The existing next-action card now leads the home. Four restrained KPI tiles sit immediately beneath it; Profile and Opportunities form smaller supporting panels below activity. On phones the KPI row becomes two columns. No extra member page, main navigation item, news feed or saved-opportunity destination.
- Offers and outstanding placement responsibilities retain priority. Otherwise the home uses an actual owned task or milestone from an admitted active Lab, with a deep link into the existing Tasks or Plan view. Blocked and awaiting-review tasks have appropriate wording.
- Applications is a compact submitted count below the main action area; Lab placements remains a small supporting link. Application and progress failures are not shown as zero.
- Existing Plan now has a coordinator/admin acceptance disclosure requiring recorded contribution evidence and a 20–1500 character note. Contribution view lets authors record up to eight practised skills per evidence record; case-insensitive duplicates are collapsed. Completed projects can receive delivery confirmation from their coordinator or admin. Ordinary completed delivery work remains read-only.
- Development-only example queries remain verified-sign-in guarded, clearly labelled, and ignored in optimized production mode. The progress example is synthetic; its work actions are disabled. Normal accounts use real data.

## Notification bell

Header order: Home icon → notification bell → profile thumbnail. The dropdown has All/Unread filters, unread count, individual read/unread controls, mark-all-read, direct destination links, loading/empty/failure states, close button, outside dismissal and Escape handling. It has no extra sidebar destination.

- Durable events: application submission and review-status changes; project offer, admission/access and placement changes; project status/coordinator changes and nominations; task/milestone assignment, review requests, requested changes and acceptance; chat mentions and pinned announcements; meeting scheduling/updates/cancellation; non-internal support replies; account email/password changes.
- Important events only: ordinary chat and message edits do not repeatedly notify everyone. Unique event keys deduplicate retries. Internal support replies do not notify members.
- Offers nearing expiry generate a single reminder per offer deadline within 48 hours when the signed-in member's notification list refreshes. This build does not schedule email/push reminders while a member is away.
- Existing applications are backfilled idempotently with their original submission dates; live offers are surfaced. Other historical team activity is not replayed.
- Refresh on opening the bell, window focus/visibility, and every 60 seconds while visible. Reading persists in staging, across page loads and devices. Mark-all-read uses the displayed snapshot cutoff so later events remain unread. The dropdown displays the latest 50 accessible notifications; its badge counts all accessible unread records.
- Private events are returned only to their recipient; team-content events are hidden after workspace access is lost. No message body, internal support note, credential or service key is placed in notifications.

## Implementation

The new public website_member_home RPC is SECURITY INVOKER and verified-only. Its private implementation validates auth.uid(), current membership/admission, ownership and coordinator/admin authority. Private tables have RLS enabled with raw grants revoked. Public helpers cannot directly insert notifications. No new service-role client or external messaging provider is used.

Staging migration history and repository filenames match:
- 20261104131141_member_home_recognition_notifications.sql
- 20261104131802_member_home_integrity.sql

The home reads a minimal aggregate and one next-work item rather than fetching every full workspace. Notification and evidence foreign keys are indexed. The existing request-origin guard protects write APIs; responses carrying notifications are private/no-store.

## Verification

- All 95 member tests pass, including next-work ownership, offer priority, active-project deduplication, milestones, review/blocked wording and source failure.
- All 94 integrated anonymous HTTP checks pass, including notification API sign-in, write origin and cache guards. Existing public checks and four catalogue tests pass.
- Optimized Next 15.5.28/Turbopack build and TypeScript validation pass using Node 22.23.4.
- Rollback-only staging SQL tests pass: verified member/coordinator/outsider/unverified/anonymous roles; milestone acceptance and idempotency; delivery acceptance and active-team rejection; skill ownership/deduplication; assignment/review/mention/meeting/support/security events; internal-note exclusion; notification deduplication; persistent read/unread and read-all. Test users/items remaining after rollback: zero. No emails sent.
- Browser inspection: real empty account, active progress example and unavailable example; real notification empty/unread-filter states; Escape dismissal; existing Lab milestone evidence/acceptance control. Layouts checked at 1440, 390 and 320px without horizontal overflow. Phone dropdown stays within the viewport.
- Existing Supabase advisory warnings remain around prior public/profile definer functions, profile RLS initplans and disabled leaked-password protection. These predate this build and remain release review work. New private tables intentionally deny raw access and have INFO no-policy notices; no new unindexed foreign keys remain.
- Current proof images: mettelo-member-home-progress-desktop.jpg, mettelo-member-home-progress-mobile.jpg, mettelo-notifications-desktop.jpg, mettelo-notifications-mobile.jpg and mettelo-milestone-acceptance.jpg in this chat's outputs.

## Release boundaries

This is an implemented staging build, not approval to launch. Full human multi-account browser journeys, hosted callback/email checks, assistive technology and real-device review, monitoring/backup/rollback and the broader pilot checks in V2-SIMPLIFICATION-AND-GAP-PLAN-2026-11-04.md remain release acceptance work. SQL tests validate persisted read/unread behaviour; the inspected real browser account currently has no notifications, so browser inspection covers its empty/filter states rather than fabricating an unread inbox.

The local public/member previews are left running for owner review.

## Approved hierarchy refinement

Presentation-only follow-up: moved the next action above progress in actual DOM order, reduced greeting/metric/supporting panel sizes, and paired Profile with Opportunities below activity. All existing content, routes, counters, notification behaviour and state-selection rules are retained. No database or permission changes.

Optimized build and TypeScript checks pass. Browser checks cover the real home at 1440px/390px and active-project and offer examples at 390px/320px, with no horizontal overflow. The active example shows its assigned prototype task and Continue building; an offer remains the priority action. Proof images: mettelo-member-home-priority-desktop.jpg and mettelo-member-home-priority-mobile.jpg. Earlier automated backend/HTTP evidence above belongs to the feature build and was not rerun for this presentation-only change.
