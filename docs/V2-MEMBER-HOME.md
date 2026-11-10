# V2 member home — local development

The verified, signed-in member home now offers private profile editing, the 50-project public catalogue, the existing community guide and support. Project interest still uses the existing form from each public project brief. No application tracking or placement promises are introduced.

Public links use the local static preview on port 3002 during Next development and https://mettelo.com in a production build. The catalogue must be published with the website before the member app is released. A separately hosted staging preview will need its own reviewed public-origin configuration before testing there.

Validation: TypeScript and all nine member tests passed. The existing signed-in staging account rendered the new home and its expected local destinations in the browser. No profile changes or form submissions were made. Dedicated mobile checks and a successful production member build remain outstanding; earlier Windows build permission failures are not resolved by this change.

## Current release constraints

- Website production database: separate project agreed, creation blocked by the free-project allowance. Keep platform and staging active. Import preparation only; no real-member import into staging.
- No production deployment, push to the auto-deploy branch, community email or platform modification performed.
- Remaining release work includes public membership/FAQ wording review, hosted staging, account-email tests on a reachable host, pilot acceptance and production release approval.

## Member-home structure transfer

The first structural transfer now reuses the platform member-home CSS module and its welcome/profile, Up next, discovery and supporting-panel patterns. Website member navigation includes only working routes. Up next uses the existing profile saved state, not a fabricated completion percentage. The current website does not load platform project assignments, application history, tasks or Proof; those operational panels are not represented as empty records.

Validation: TypeScript and nine member tests passed; signed-in staging browser rendered the transferred home; at viewport 360 the content and scroll widths were both 345, with stacked panels. No user data changed. Opportunities navigation must be added with the opportunity transfer. This is an incremental member-home transfer, not final V2 acceptance.
