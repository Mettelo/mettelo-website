# Approved public navigation and account menus — 4 November 2026

Owner approved the proposed public menu and account controls for desktop, tablet and mobile. Implemented locally; no production push/deployment, email, migration or member-record change.

## Result

Public top menu: Projects / Job Board / Industry News / About Mettelo / Explore. Each item uses a consistent labelled outline icon. Explore contains Our Ecosystem, Learning & Resources, Community and Contact & Support. Existing URLs are preserved. Job Board wording describes the external listings; employer attribution/original advert links and the participation disclaimer remain.

Signed out: secondary Sign in and primary Create account controls. Signed in: public Home icon and photo/name control. On smaller screens, the photo replaces the name. Public pages retain public navigation, including the Job Board runtime, without rendering the member sidebar/bottom navigation around public content.

Account menu: identity header; Your workspace (Member home, Mettelo Lab, My applications); Your account (My profile, Resources, My enquiries, Account settings); conditional Administration; Sign out. The same component serves member and public runtime pages; the static adapter uses the same shared menu/icon definitions. Administrator presentation comes from the existing server-checked access RPCs for the current verified account, never from editable profile metadata. Existing route authorization remains unchanged. The private no-store navigation endpoint returns current-member presentation only, without emails, tokens or reusable authorization claims.

Desktop uses a compact dropdown. Tablets use the drawer for public navigation and a bounded account dropdown. Mobile uses a side drawer for public browsing and a full-width account panel below the header, with Close controls, icons, large targets and internal scrolling. Only one menu remains open. Native dialog behavior provides modal focus containment; Escape/dismissal returns focus. Layout changes close open panels. Progressive fallback keeps public links available if JavaScript does not initialize.

Shared source: shared/navigation.json (labels, destinations, icon paths), shared/navigation.css and shared/navigation-client.js. The existing build/predev synchronization updates all static headers and runtime snapshots/styles. Old duplicate navigation/footer styling was removed from shared/public.css; footer styling remains in its canonical source.

Public-preview Sign out uses a fixed local adapter at /auth/signout. It accepts only the exact public-preview Origin, forwards only to the fixed runtime with session cookies, preserves refresh/clear cookies and private/no-store headers, and leaves the runtime's existing Origin check intact. No active browser sign-out was performed; the HTTP check used no session cookies.

## Verification

- Static build and existing public asset/route/anchor/policy checks passed. Shared-footer parity still passes across 60 public HTML pages and runtime snapshot/styles.
- TypeScript and optimized application build passed.
- 95 member tests passed; 101 integrated HTTP checks passed. Added checks cover shared public header labels on five public/static/runtime destinations, no administrator control for anonymous visitors, accessible mobile trigger naming, and sign-out origin/anonymous-adapter behavior.
- Browser: signed-in desktop menu and full account groups; public static drawer/Explore; Job Board and News shared headers; member account controls with public Home → bell → photo order. Administration visible in the authorized review session.
- Browser widths 320, 768, 1024 and 1280: no horizontal page overflow on public home. Phone account panel, tablet dropdown, modal close, Escape/focus return and account/navigation mutual dismissal verified. Workspace mobile account panel also fits without horizontal overflow.
- Signed-out structure verified by anonymous HTTP rendering. The active review session was not signed out and no account/terms form was submitted.

Hosted multi-account acceptance and actual authenticated sign-out/sign-in roundtrip remain staging-pilot checks. Existing production, migration and operational email gates are unchanged.
