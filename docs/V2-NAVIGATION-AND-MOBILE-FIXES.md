# Navigation and mobile fixes — 2 November 2026

Platform source reviewed read-only: components/HeaderNavigation.tsx separates public discovery and authenticated account controls, uses profile identity, closes account/explore controls on outside pointer and Escape, and closes links on selection. Platform source was not changed.

Website fixes:
- Shared public footer explicitly lays out navigation groups and separate 44px links; narrow screens below 380px use a single column.
- A small client disclosure wrapper adds outside pointer, outside focus, Escape with focus restoration, link/form dismissal and mutually exclusive account/workspace menus. Server session validation, signed avatar URL and sign-out POST remain unchanged.
- Mobile workspace navigation uses a contained panel, current destination, descriptions and clear next-action cues. Account menu has a separate identity heading and action groups.
- Homepage projects have a balanced featured panel, readable mobile metadata and source-derived suggested contribution roles.

Verification: public build and catalogue checks passed; member typecheck and all 17 existing tests passed; isolated member production build passed. Next-generated build-only tsconfig/next-env changes were restored. Packaging 2/2 and static-output checks passed. Browser checks confirmed account outside dismissal, Escape focus restoration, Edit profile selection, workspace outside dismissal and mutual exclusion. Public menu selection and outside closing passed. Footer links measured 44px tall at 390px. Public page had no horizontal overflow at 320, 390, 768 and 1280px. No profile edits or sign-out performed during QA.

Limits: the platform guest/member branches and website server guest branch were inspected in code. A real sign-out/re-login cycle was not performed against the owner's existing session. The Hostinger public homepage still has static guest navigation; it does not yet share authenticated header state with the separate member runtime. No claim of cross-origin session integration or production deployment. No database, credentials or auth permissions changed.
