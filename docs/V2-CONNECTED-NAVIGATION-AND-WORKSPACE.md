# Connected navigation and member workspace — 2 November 2026

## Implemented locally

The platform source supplied the separation between public discovery, authenticated account actions and workspace destinations. The platform repository remains unchanged.

- Public header: white brand header with Projects, Opportunities, Ecosystem and an Explore disclosure for learning, community, story and support. Shared public pages and generated project pages use the same structure and correct navy logo.
- Guest header: Sign in/Create account remain ordinary working links. When the member service is unavailable or has no confirmed session, presentation falls back to the guest controls.
- Signed-in public header: validated session supplies first name and a short-lived signed avatar URL; header actions become the account menu. Signup invitations elsewhere become Go to My Mettelo. Presentation refreshes when returning to a tab or restoring a page from browser history.
- Public account actions lead to the actual member runtime. Account & sign out opens an account page containing the existing origin-checked POST sign-out form; GET never logs the member out. This avoids weakening the existing origin check between local ports.
- Member shell: persistent desktop sidebar, member identity/top bar, Find a project, page breadcrumbs and a dismissible mobile destination panel. Existing profile, interests, saved roles and opportunity routes are reused. No fictional notifications, search or Admin controls.
- Member home: real owner-scoped interest and saved-role counts, profile state and existing next actions. Query failure says Unavailable rather than displaying a false zero.
- Hero illustration: recognisable repository, dashboard and analysis output examples, explicitly illustrative. Previous source-derived project roles and data-use links remain.

## Session and hosting boundary

The new /api/navigation endpoint uses the existing server Supabase client and getUser verification. It sends no email, user ID, role, JWT, refresh token or service key in its JSON. It uses private/no-store and Vary: Cookie, without cross-origin read permissions. Only the current user's name/avatar are selected under existing RLS. No database migrations, credential changes or new access grants.

The local public server proxies only GET /api/navigation to the fixed member runtime address on 127.0.0.1:3001. It forwards session cookies and refreshed Set-Cookie headers without logging them. It does not proxy arbitrary destinations or relax authentication origins. Client identity is not stored in local/session storage.

Production requires a same-origin route to the hosted member runtime for /api/navigation and the shipped account routes. That Hostinger connection, production callback origin and website database remain release work. The static package alone does not provide session-aware hosting: its guest fallback remains usable if the endpoint is absent. No live site, hosting configuration, production database or email campaign changed.

## Verification

- Public build, source catalogue checks, packaging 2/2 and static-output boundary passed; 90 approved public files. Initial asset check includes both logo variants and measures 91,631 bytes, below 100KB.
- Member production build passed. Final TypeScript check and all 17 existing member tests passed. Build-generated tsconfig and next-env changes were restored.
- Anonymous requests to both local navigation endpoint addresses returned only authenticated:false, with private/no-store. Anonymous sign-in HTML rendered guest account actions without the member sidebar. Anonymous /member redirected to sign in.
- Browser staging session produced the public avatar menu and Go to My Mettelo invitations. Account navigation reached /member/account; its sign-out form uses POST. No sign-out was submitted and no profile data was changed.
- Mobile workspace selection closed the panel and updated the destination; Escape closed it with focus restoration. Public account Escape also restored focus. Existing outside-dismissal behaviour retained.
- Actual DOM viewport readings at 320, 375, 390, 768, 1024 and 1440px showed no horizontal overflow in both public and member views. All six member readings were repeated after detecting that an initial viewport override applied to another tab; only the corrected measurements are counted.
- Avatar loaded successfully and kept its intended 32px crop in the compact mobile header.

Limits: full sign-out/re-login, long-duration cookie refresh, production same-origin routing, service-outage browser simulation, physical-device testing, complete screen-reader audit and field Core Web Vitals have not been verified. No full WCAG certification or production readiness claim.

Reference checked: https://supabase.com/docs/reference/javascript/auth-getuser . The changelog Markdown endpoint could not be rendered by the documentation fetcher; no Supabase upgrade or new SDK API was introduced.

## Full member-header mode

Signed-in public pages now replace the entire discovery menu with member destinations and a Home icon, change the brand destination to the member homepage, and use a distinct tinted workspace bar with My Mettelo identity. The mobile Home shortcut remains visible when the menu is collapsed. The member runtime also includes an explicit Home icon and matching tinted header. Guest navigation snapshots are restored when session presentation becomes unavailable, with delegated dismissal handlers covering restored menus.

Verified member-only labels on the projects page; Home shortcut reached the actual member homepage. Actual widths 320, 390, 768 and 1440px had no horizontal overflow. Public build, packaging 2/2 and member typecheck passed. Production connection remains pending; nothing deployed.
