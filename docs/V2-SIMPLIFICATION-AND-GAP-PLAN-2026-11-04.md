# Mettelo scope reset and simplified acceptance plan — 4 November 2026

Current approved design: [V2-MEMBER-HOME-DESIGN-2026-11-04.md](V2-MEMBER-HOME-DESIGN-2026-11-04.md). It uses a prominent adaptive next action followed by four compact progress tiles, activity links and smaller Profile/Opportunities panels. The expanded integrated-review, essential-email, member-administration, hosted-pilot and silent-migration plan is [V2-END-TO-END-RELEASE-PLAN-2026-11-04.md](V2-END-TO-END-RELEASE-PLAN-2026-11-04.md). This is a planning update, not permission to email, import or deploy.

## Owner direction — takes precedence over earlier inventories

The owner explicitly corrected the approach after reviewing the continuation report:

- Mettelo is a free tool. Keep it simple, useful and well designed.
- Keep the member home calm and focused on the member's practical work.
- Industry News belongs in the public website/menu; it does not need a member-home card or member navigation entry.
- Career material belongs with other useful resources in one consolidated directory. Do not add separate pages or individual navigation items for each resource.
- Remove the separate Saved opportunities section and member-home count/link. Opportunities is sufficient.
- Saving inside Opportunities, with saved items at the top, was floated as an uncertain possibility. It is an optional design decision, not an instruction to build another saved view or workflow.
- Review and document actual gaps before adding features or pages. No production push/deployment is authorised.

## What was wrong with the previous assessment

The 46-route platform inventory was treated as a mandatory website backlog. Its 27 missing equivalents were then presented as blockers. That is superseded by the owner's current direction. The inventory may remain a historical reference; it must not require 27 new pages, automatic feature parity or owner sign-off for every old route.

A missing old platform route is not by itself a gap in this simpler website. A broken, misleading, inaccessible, insecure or untested essential journey is a real gap.

## Minimal product structure

| Surface | Purpose |
| --- | --- |
| Member home | Brief welcome, Lab/application status and one useful next action. No News feed, career-resource cards or saved-role counters. |
| Mettelo Lab | Existing project workspace and its tasks, plan, team, chat, meetings, contributions and support. Improve these existing views. |
| Applications | Existing submitted-interest and placement journey. |
| Opportunities | Discover/filter roles and open the official application. No separate saved page or navigation. |
| Account menu | Profile/account, one Resources link, support, sign out; administration only for authorised admins. |
| Existing resource directory | Reuse Start Here's essential-links section for the library, recordings, community and project links. Do not create another resource hub. |
| Public website | Existing informational pages, project briefs, Industry News and contact. |
| Administration | Existing restricted controls for projects, News, opportunities and support; a controlled Members page is now a proposed gap in the integrated release plan. |

## Immediate simplification

1. Remove News, Career resources and Saved opportunities entries from desktop/mobile member navigation.
2. Remove the saved-opportunity query/counter and the extra discovery/resource panel from member home. Keep two compact status items and one work panel; remove the duplicate large header action.
3. Remove the saved-role link from the account menu. Add one Resources entry pointing to the existing directory.
4. Retire the recently created Career resources screen; its old URL becomes a compatibility redirect to the existing directory. Retire the standalone saved-role screen with a redirect to Opportunities.
5. Remove save controls from the visible opportunity journey for this minimal version. Preserve stored saves and backend contracts; do not delete user data. Consider an inline saved ordering only if the owner later chooses it.
6. Remove duplicate public application/interview resource actions added in the previous continuation. Keep a single FAQ resource pointer and the consolidated account entry.
7. Mark earlier route-coverage reports as historical and remove the blanket old-inventory release gate.

## Current gaps reviewed against this scope

| Priority | Actual gap | Lean implementation / acceptance |
| --- | --- | --- |
| Now | Member-space clutter and duplicate links | Complete the cleanup above; inspect desktop and phone layouts and every remaining destination. |
| Before hosted testing | Public, account and runtime routing/email callbacks | Run one HTTPS staging environment with the existing pages, approved origins and correct cookies; no extra public pages are needed. |
| Before release | Full applicant-to-Lab journey | Use disposable approved accounts to test account/profile → interest → admin review/offer → member acceptance → Lab. Test existing screens, receipts, retry and duplicate protection. Legal acceptance remains a user action. |
| Before release | Profile/photo, session and permission failures | Verify saves, image validation/private access, conflict/error recovery, member/coordinator/admin boundaries and completed read-only workspaces. Fix the existing forms and permissions. |
| Before release | Opportunity quality/freshness | Verify relevance, links, deadlines, no-date handling, scheduled refresh/expiry and outage behaviour. Keep this work inside the existing opportunity pipeline. |
| Before release | News publishing/private drafts/social previews | Verify the existing editor/public article flow on hosted staging. No member-home News feed is required. |
| Before release | Resource library reachability | Check the existing OneDrive library with an allowed member; repair the URL or access instructions if needed. No new resource page or document duplication. |
| Before release | Mobile/keyboard/error accessibility | Test the simplified home/navigation and essential forms. Fix concrete issues rather than adding more explanatory UI. |
| Before release | Security/identity/operations | Review existing password-protection/RPC findings, real-member identity continuity, monitoring and backup/restore/rollback. These are operational checks, not page requests. |
| Content cleanup | Synthetic staging fixtures and inconsistent copy | Remove/replace demos in an approved cleanup and check existing copy matches what actually works. Do not count staged demo content as real publication. |

## No longer automatic blockers

Activity feeds, separate careers pages, mentors/directories, events systems, newsletters, public people profiles, showcase/spotlight, global search, project-path pages and other old platform routes are not requirements of this minimal release unless explicitly requested. Existing useful links/content can be consolidated into the current website and resource directory. Final team handover and verified Proof remain outside the current work as previously agreed.

## Verification and release boundary

Apply only the clear simplification now. Do not implement the uncertain saved-at-top idea or expand the public page inventory. Run the relevant existing checks and an optimized local build, then inspect the simplified home and Opportunities on desktop/phone. Record verified results separately from pending hosted/pilot checks.

No live deployment, schema change, user-data deletion, email or social post is authorised here.
