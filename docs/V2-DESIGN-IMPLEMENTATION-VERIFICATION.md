# Design implementation evidence — 2 November 2026

Specification: V2-DESIGN-ARCHITECTURE-AND-PAGE-SPEC.md. This is the first connected implementation of that specification, not completion of the expanded platform public-route transfer or a production release.

## Implemented

- Shared public navigation on the seven established pages and all generated project pages: Projects, Opportunities, Our Story, Resources, Support, Sign up and Sign in.
- Replaced the public platform waitlist with a single account invitation and merged the duplicate lower membership invitation into it, preserving the existing membership fragment. Updated FAQ, policy wording and resource links. Old waitlist files/handlers remain in source for historical continuity, but the V2 package excludes their directory and no homepage availability request runs.
- Reduced initially exposed ecosystem panels from eight to two active participation routes. Future ecosystem descriptions remain in an accessible native disclosure, explicitly marked in development.
- Established canonical navy/paper/gold tokens, standard spacing, rounded controls, border/focus/status values and consistent public/member typography. Member development/build hooks synchronise the canonical CSS into the isolated runtime. No remote font or UI-library dependency was introduced.
- Added a branded member header, one shared current-location navigation across signed-in pages, compact mobile disclosure, keyboard skip-to-main and consistent policy/support footer. Removed duplicate per-page navigation.
- Member home now separates discovering a new project from returning to submitted interests, saved opportunities and community resources, instead of repeating the same project CTA in adjacent panels. No operational counts were invented.
- Profile form grouped into About you, Work and goals, and Professional links; retained existing validation/prefill/versioning and all private fields. Save area explains when changes persist. Photo controls remain separate from text edits.
- Fixed logged-out project-interest redirects to preserve the validated requested member destination through signin. No authentication permission or database schema change was made.

## Verified

- Public static build and existing public/content/route checks passed, including three catalogue/parity tests. Retained historical waitlist unit checks run against unshipped source, not the new public experience.
- Packaging tests: 2 passed. Static output audit: 88 public files; no member source, environment files, private inputs or PHP included. Retired waitlist directory excluded.
- Member tests: 17 passed. TypeScript passed. Node 22 production build passed using a fresh isolated verification output inside .next-check/design-review. The first attempt hit a Windows EPERM in an existing build output; the successful fresh output avoided deleting that cache. Temporary build-path and generated TypeScript changes were restored; production configuration remains unchanged. Two existing CSS compatibility warnings remain non-fatal.
- All 59 public preview pages returned HTTP 200, had one H1 and did not contain a waitlist form after redesign.
- A signed-out request to /member/projects/MTL-DA-001/interest returned 307 to /signin with next=/member/projects/MTL-DA-001/interest. No owner account was signed out or changed to perform this request.
- Browser inspected the public account invitation and final homepage content/disclosure, member home and grouped profile. No profile field, photo, legal acceptance or project submission was saved by the agent.
- Actual measured profile and member-home phone viewport: 390px, content and scroll widths both 375px (no horizontal page overflow). Mobile menu opened, showed member tasks and navigated to Home, where it closed and displayed the new current location. These are viewport checks, not a physical-device acceptance.
- Actual measured desktop member home: 1280px, content and scroll widths both 1265px. Keyboard Tab reached the visible skip link and Enter moved focus to the main content.
- Public homepage remained at 1280px during the attempted override, so no new homepage phone pass is claimed. Viewport override was reset; remaining route/device matrix is still open.
- Calculated token-pair contrast: navy on white 17.71:1, muted text on paper 5.89:1, dark-gold text on paper 6.05:1. This verifies only those explicit pairs, not every state, image, overlay or full WCAG conformance.
- React review: hooks stay at component top level; active navigation derives from the current path; profile field groups are stable module data; controlled field updates use functional state updates; native details/summary provide disclosure behaviour; server authentication and private fetches remain server-side. Existing optimistic profile concurrency and ownership boundaries are unchanged.

## Remaining work

The design specification covers the whole current experience and records the missing platform routes. Dedicated designs/content/workflows for those missing routes, full accessibility and physical-device testing, interest submission/receipt, photo upload/remove, real opportunities pipeline, admitted-member production import and hosted email callbacks are not established by this change. The separate production website database and public member runtime still need provisioning and acceptance. No marketing subscriber conversion is inferred from signup. No push, merge or deployment occurred.

Screenshots are in the workspace outputs directory: v2-design-account-invitation.png, v2-design-member-phone.png and v2-design-member-desktop.png. Earlier screenshots remain historical evidence of prior layouts.
