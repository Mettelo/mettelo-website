# Mettelo Phase 1 — Integrated journey review

4 November 2026. Reviewed local public preview :3002 and member/admin runtime :3001 against commit c00a2f0, using the staging-connected administrator review account. This is a review, not release approval. No application, offer response, terms acceptance, email, member change, migration or deployment was submitted. QA application text existed only in an unsent form and was discarded.

## Result

The public-to-application entry and admin-to-Lab handoff open successfully. All ten Lab views loaded without visible alert errors. Fresh integrated HTTP checks: **94 passed, 0 failed**. Browser/source review nevertheless found integration gaps that those route checks do not cover. Phase 1 review is complete; end-to-end write acceptance and cross-role privacy remain to be proven in the hosted three-account pilot.

## Journey evidence

| Journey | Evidence | Limit |
| --- | --- | --- |
| Public home → project brief → Apply | Live navigation reached the correct project application. Required role validation worked; all five form steps were inspected. | No application submitted. |
| Existing account → signup return destination | Signed-in signup link returned to the intended project application. | Fresh verification, recovery and expired links need hosted HTTPS testing. |
| Member home / Applications / Lab | Current account shows appropriate zero-application/zero-placement states. Synthetic placement cards show active, offered, forming and completed states; offer controls are disabled in that preview. | Synthetic cards do not prove actual offer acceptance or completion. |
| Admin review → team → Lab | Existing synthetic team and three admitted members visible; coordinator assigned. Placement management shows reasons, open-work warning and external-access warning. | No selection, admission, replacement, pause or release action executed. |
| Lab work | Home, Plan, Tasks, Chat, Data, Contributions, Meetings, Get support, Resources and Team loaded. Administrator Chat preview correctly prevents posting when unassigned. | One administrator session is not a member/coordinator isolation test. No task or milestone completion submitted. |
| Support | Existing member-owned enquiry visible; Contact fallback available when no eligible placement exists. | No support message sent; separate-role private-note isolation remains for pilot. |
| Industry News | Synthetic article list and reader work through the public proxy. LinkedIn, X, Facebook, WhatsApp, Copy link and further sharing controls present. | No social post made. Demo content is not launch editorial content. |
| Anonymous guards / metadata | Protected member/admin requests redirect to sign-in; staging noindex headers present. Eight sampled route results saved separately. | Local redirects/headers do not prove actual HTTPS hosting or production SEO. |

## Findings and proposed corrections — approval required before implementation

### F01 — First priority: reconcile signed-in public navigation

Observed on public home, including desktop: authentication replaces the public menu with an older Member navigation. It includes Saved opportunities in both navigation and avatar menu, omits Mettelo Lab, and removes Industry News, Ecosystem and Explore from the main public browsing menu. The brand link also changes from public home to member home. Root script.js maintains the older list; the newer member navigation itself has the agreed structure.

Proposed correction: keep coherent public browsing destinations on public pages, reconcile signed-in account access with the current member experience, and remove visible Saved opportunities entries. Preserve existing compatibility redirects. Do not add member-home cards or pages.

### F02 — First priority: show application outcomes in existing views

Source review: ProjectApplicationCard always labels applications Received. The application-list query does not select review status; the existing application detail describes the original receipt. Admin supports clarification, shortlisted, declined and withdrawn outcomes. A status notification can therefore lead to a destination that still describes only receipt. The current account has no real applications, so this decision-state finding is source-reviewed, not browser-tested.

Proposed correction: show member-safe status and the appropriate next action in the existing application list/detail. Never expose private admin notes. Verify actual outcomes with pilot accounts before email links use these destinations.

### F03 — Align News public account controls and footer

Observed while signed in: News still displays Sign in/Create account and uses a separate, reduced public menu/footer. It lacks the homepage's signed-in adaptation and social footer row. This is a consistency gap, not an observed authentication bypass.

Proposed correction: share the intended public header/account state and footer pattern across public runtime pages. Keep the member footer compact.

### F04 — Correct the Member support footer destination

The public footer's /#support anchor exists but lands on the community/networking section. Automated valid-anchor checks pass while the destination does not match the label.

Proposed correction: use existing Contact for visitors and Enquiries for signed-in members where appropriate. No new support page is needed.

### F05 — Essential operations remain planned

Coordinator nomination/agreement controls and placement administration already exist. A global Members administration page does not. In-app notifications are not proof of application/offer email delivery. A controlled staging meeting-mail worker exists, but application/offer emails and the once-only continuation reminder have not been established as implemented. Runtime sender/provider readiness was not verified by this review.

Implement only after the separate proposal is approved: essential receipt/action/readiness/support emails, bounded one-time reminder, and one controlled Members administration page. Seven days remains a proposed reminder threshold. Do not enable community email during testing or replay notifications during migration.

### F06 — Prepare hosted staging and production content/SEO separately

Local public serving proxies News to the application runtime; a static-only deployment cannot reproduce that behavior. Verify the real HTTPS hosting route/proxy contract. Prelaunch copy still describes account/workspace preparation. News items are explicitly synthetic staging content. Staging noindex is correct; production public indexing must be explicitly configured while keeping member/admin private. Opportunities lacked a canonical in the sampled response.

Footer social links exist for LinkedIn, Instagram, X and Facebook; YouTube is linked through learning. Ownership and external destination availability were not verified. External OneDrive access also remains unverified. Review these and launch copy before cutover.

### F07 — Reconcile pilot fixtures before the write pilot

The active synthetic Lab has an assigned coordinator, yet readiness displays Coordinator agreed and Working commitments confirmed as Needed. Treat this as fixture coherence work, not proof that current start guards can be bypassed. Rebuild/reconcile the pilot through the actual supported workflow after approval.

## Recommended sequence

1. Approve a bounded repair of F01–F04 within existing pages and menus. Preserve the approved member-home layout.
2. Approve the lean Phase 2 email/reminder and Members-admin specifications, then implement and verify them.
3. Run hosted HTTPS staging with three member accounts and a separate administrator: signup/verification → application → review/offer → acceptance → coordinator agreement → admission → collaboration/evidence → support → completion. Verify invalid/expired states, privacy between teams, notification persistence, inbox receipt, reminder deduplication and suspension of existing sessions.
4. Rehearse both-form/current-project reconciliation and silent import. Preserve identity, placements, coordinator roles and attribution. No email or bell replay.
5. Only after owner sign-off: production cutover checks, then secure activation invitations. Prefer a one-use set-password link over emailing reusable passwords.

Phase 1 does not establish full write-path acceptance, real inbox delivery, cross-role security, completed-project acceptance, migration safety or production readiness. Those are explicit remaining gates.

## Approved repair follow-up

F01–F04 were implemented after the owner approved the fixes, alongside their requested Sign in/Create account navigation refinement. See V2-INTEGRATION-REPAIRS-2026-11-04.md for changes, staging migration and verification boundaries. The original findings above remain the audit record. Phase 2 operations and hosted acceptance remain open.
