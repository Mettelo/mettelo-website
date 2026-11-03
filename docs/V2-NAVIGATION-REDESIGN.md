# Website navigation redesign — 2 November 2026

The platform was inspected as a read-only reference: HeaderNavigation.tsx, MemberAppShell.tsx and lib/member-navigation.ts. Website changes follow its compact account bar, grouped desktop sidebar and persistent mobile navigation, using only shipped website destinations. Platform code and database were not changed.

Public discovery retains Projects, Opportunities, Ecosystem, Explore and account entry. After verified session detection, the static header switches to member destinations, with the home icon and account controls outside the mobile navigation panel. Public and account panels are mutually exclusive. Account presentation remains read-only and does not grant permissions.

The member workspace has one top bar (brand, workspace label, home, project discovery, account), a 256px desktop sidebar grouped into workspace/discovery/account, and a mobile dock for Home, Projects, Opportunities and More. The old second-row mobile dropdown was removed. More contains project interests, saved opportunities, profile, account and support. Only one disclosure opens at once; outside click, link selection and Escape close it. Mobile footer spacing protects content from the dock.

Verified: public build and four catalogue tests; member TypeScript and all 19 tests; signed-in desktop at 1440px and member mobile/tablet at 320/390/768px without horizontal document overflow; mobile account opening closes More; outside click and Escape dismissal; static homepage account opening closes navigation; static homepage tablet and desktop placement. Screenshots are in the workspace outputs directory. No profile or interest was submitted and no sign-out was performed during browser checks. No full WCAG or physical-device certification is claimed.

Production remains unchanged. The prior member production-build EPERM limitation is still unresolved; this change passed TypeScript and development browser checks but is not a production release approval. Rollback is the preceding local commit 41cd840. No auth, API, database or deployment contracts were changed.
