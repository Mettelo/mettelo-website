# Phase 1 integration repairs — 4 November 2026

Owner approved implementation of the four findings, then requested refinement of Sign in/Create account navigation. The approved member-home layout was preserved. Local code and the staging database only; production was not pushed or deployed, and no email delivery was enabled.

## Implemented

- F01: signed-in public pages retain Projects, Opportunities, Industry News, Ecosystem and Explore. The public logo remains a public-home link. A distinct Home control and the photo menu provide workspace access, including Mettelo Lab. Removed visible Saved opportunities links and signed-out calls to action from the signed-in public header. Public account destinations are consistent with News.
- F02: existing application list/detail now display the current member-safe review state and follow-up. Received, Clarification needed, Shortlisted, Not progressing and Withdrawn are distinct. Shortlisting explicitly does not promise an offer or place. Offers remain in Lab. Private notes/reviewer identity are never returned. Clarification uses the existing Contact path, since no member-visible clarification question/response workflow exists yet.
- F03: News renders verified account state on the server, retains public browsing/Explore, provides account tools and restores the social/trust footer links. Fixed the local preview proxy to forward the session cookie to its fixed runtime and return private/no-store/Vary Cookie responses with refresh cookies. Without that handoff, correct server rendering still appeared signed out through the public preview.
- F04: shared and generated Member support links use Contact for visitors and Enquiries for signed-in members, rather than the community section.
- Account entry refinement: Sign in is secondary; Create account is the primary action, with consistent order/labels on desktop and mobile. Removed stale saved-opportunities language from sign-in copy. Existing authentication/verification/legal flows are unchanged.

## Staging database

Migration 20261104141811_member_application_outcomes applied to jxijdjmjuzslmjxolhjl. No schema/data operation targeted production.

A public SECURITY INVOKER wrapper calls a narrowly scoped private SECURITY DEFINER reader. Both revoke anonymous/PUBLIC execution; authenticated execution is explicit. The private helper requires a verified auth.uid(), filters by that exact owner and returns only application id/status. Private review tables remain inaccessible. No caller-supplied user ID is accepted. No tables, account records, permissions to other members or notification delivery settings were changed.

## Verification

- Static build and public route/asset/anchor/policy/navigation checks passed.
- Member tests: 95 passed, 0 failed.
- Integrated anonymous HTTP checks, rerun after the preview fix: 94 passed, 0 failed.
- TypeScript check and final optimized Turbopack build passed.
- Staging rollback SQL passed: multiple-owner isolation, all five review statuses, exact id/status projection without private notes, anonymous privilege denial and missing/unknown identity guards. Every fixture status/note/trigger side effect was rolled back. Separate authenticated-role invocation also succeeded.
- Browser after owner sign-in: public menu retains browsing links; guest calls to action and Saved opportunities absent; logo points home; Lab is reachable in the account menu; signed-in support points to Enquiries. News shows the same account rather than Sign in/Create account.
- Mobile browser at 390px: public modal drawer opens/closes; photo menu includes Lab and dismisses with Escape; News menu/Explore/account controls work without horizontal page overflow.
- Application card examples show distinct status/follow-up states. The review account's real empty collection loads through the new status reader without errors.
- Supabase security advisors checked: no finding names the new reader. Existing restricted-table INFO notices, existing public profile/activity function warnings and disabled leaked-password protection remain prior staging findings; this bounded change does not claim to resolve them.

## Remaining acceptance boundaries

The signed-in review account has no actual applications. Real decision-state detail rendering and application-to-offer-to-completion transitions still require the hosted multi-account pilot. The SQL test proves database status projection; synthetic cards prove presentation only. No real application, legal acceptance, offer response, review decision, support message or social post was submitted by browser automation. No community email or migration was run.

Essential operational emails, one project reminder and central Members administration remain separately planned. Hosted routing, launch SEO/content/social ownership checks and silent migration rehearsal remain release gates. This fix does not add member-home modules or claim full release readiness.
