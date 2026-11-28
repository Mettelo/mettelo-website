# Homepage content and menu refinement — 4 November 2026

Owner approved the focused content review and asked for the desktop menu elements to be improved. Local staging preview only; no production deployment, database mutation, community migration or email.

## Changes

The hero now says “Put your skills to work. Build with people in your field.” Its supporting copy makes professional connections, practical projects, shared learning and free membership explicit. Search/social descriptions follow the same message. The account-aware primary CTA still takes signed-in members to My Mettelo.

Homepage project cards retain genuine brief descriptions, suggested contributions, skills, detail links and application routes. Operational counters and “Activity not yet recorded” are removed from the homepage. The page no longer requests the activity feed, preventing staging team fixtures from appearing as community accomplishment claims. Project catalogue/detail activity behavior stays in place; its DOM update tolerates cards without an activity slot. “50 public project briefs” and six professional tracks remain catalogue-derived descriptions, not counts of active projects.

The four-step explanation now covers exploring, applying, agreeing a role if selected and entering the Lab when the team is ready. The FAQ explains onboarding and readiness. One career-resources button leads through the existing /member/resources access flow to the consolidated /start/#essentials directory. The FAQ links to this homepage section rather than duplicating resource routes. Raw private-library links remain outside the public homepage, and the unlisted-guide invariant is preserved.

Community, Labs and Talent lead the ecosystem in three larger tiles. Proof, Research, AI and Summit remain as four smaller, clearly labelled future plans with shorter descriptions. Preview/public-launch wording remains truthful; no availability gate was enabled.

The shared public menu keeps its five approved items and all existing URLs. Labels are larger, icons use consistent sizing and alignment, the account tools have a desktop separator, and the home/photo controls have a quieter circular treatment. Explore/account indicators now use one shared SVG chevron rather than a text glyph, with native/pseudo markers suppressed and the chevron reversing when open. Static headers, React headers and account menus share the same icon source and canonical CSS. Existing drawers, account groups, keyboard focus, close buttons and touch targets are retained.

## Validation

- Complete static generation, public route/asset/anchor checks, public policy invariants, catalogue tests, shared-header/footer parity across 60 HTML pages and public package preparation passed. Local homepage asset budget: 99,564 bytes, below the existing 100,000-byte limit.
- TypeScript passed; all 101 integrated public/member checks passed.
- Browser: homepage copy, three brief cards without activity counters, free membership message, desktop Explore and account panels, single chevrons, mutual dismissal and Escape; phone drawer and expanded Explore links; 320/390/768/1151-pixel width checks without document overflow.
- Signed-out initial navigation and signed-in account presentation inspected; no live sign-out performed.
- Resource route followed in the signed-in review session and reached the existing consolidated essentials directory. No external resource request or form was submitted.
- Shared runtime public header checked on the Job Board. An old server-side text caret caused a development hydration mismatch after the SVG change; the local member preview was restarted to rebuild matching server/client markup. Final verification is recorded below.

Screenshots are saved in the conversation outputs directory. These changes do not establish production launch readiness or replace the later multi-account pilot.

Final runtime verification: the restarted server emits the SVG caret in its HTML; a fresh signed-in Job Board load and dropdown interaction produced no hydration errors. Existing unrelated CSS autoprefixer compatibility warnings remain in development logs. No public/member data changed.
