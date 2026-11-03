# V2 scope correction — 1 November 2026

This supersedes the earlier narrow account-and-catalogue definition. V2 is incomplete. The present four-card member screen is a foundation, not the accepted member homepage. Platform source remains read-only; implementation belongs in mettelo-website. No production release is authorised.

## Required transfer sequence

1. Inventory every public platform route and its content, data, forms and navigation dependencies. Record its website destination and acceptance status. Do not quietly omit pages or classify them as later versions.
2. Transfer the platform member-home structure and member navigation. Show real profile progress, useful next actions, project discovery, opportunities, resources and account access. Transfer operational panels only with working data contracts; never fabricate zero counts or link to missing routes. Explicitly identify any project/application/Proof dependencies that need a separate scope decision.
3. Transfer opportunities: public listing, detail, search, relevant filters, pagination, eligibility/location/sponsorship context, safe official application links, expiry handling and honest loading/empty/error states. Include access from member navigation. Trace saving and saved-opportunity dependencies before implementation. Website owns its database; do not silently couple it to platform production.
4. Update the website homepage using the platform homepage as the source for structure and journey. Preserve working community and resource routes. Review account/project/opportunity calls to action, mobile navigation and all destination pages together. Do not copy the platform's hard-coded 5,689 community claim or live metrics without evidence appropriate to the website.
5. Transfer the remaining public pages from the inventory, preserving useful source components and adapting to the website deployment. Published content, detail pages and every advertised form must work. A blank placeholder is not a completed transfer.
6. Run route/content, responsive, accessibility, security, build and end-to-end checks; hosted staging and a small member pilot precede release approval.

## Acceptance gate

V2 is done only when the owner-approved public-page inventory, real member homepage, opportunity journeys, refreshed website homepage, accounts, profiles and 50-project catalogue all pass their acceptance checks. Each page needs a working destination, correct navigation, honest published data, appropriate empty/error states, keyboard/mobile checks and a verified production build. Database/import, reachable email callbacks, pilot acceptance and explicit deployment approval remain release requirements.

## Source inspection findings

- app/member/page.tsx reads profile, project applications/members/runs/tasks, contribution counts, saved opportunities/projects, spotlights, account identity and domain/tool preferences. Transferring it whole requires these contracts; presentation alone cannot make those workflows work.
- lib/member-navigation.ts includes work, discovery, account and community groups. Current website member home has no equivalent shell.
- app/opportunities/page.tsx reads published, public, highly relevant and unexpired opportunity records. OpportunityBoard supports search, filters and pagination and depends on SaveOpportunityButton. CMS copy is another dependency.
- app/page-content.tsx depends on CMS content, live public metrics, HomeHeroShowcase and HomeLiveContent. Its hard-coded community reach must not be reused as a website membership count.

## Existing work retained

Account and email journeys, private profiles, import preparation, 50 project briefs and filtering, basic member landing screen, and initial membership/FAQ wording are reusable foundations. They do not establish completion of the expanded V2 scope.

## Public route inventory

Generated from the inspected local platform snapshot. Every route below requires a destination/disposition and content/data acceptance review. Presence in source does not prove it is working or approved for publication. Authentication, admin, developer and member-only routes are outside this public inventory; member-home dependencies are listed above. Utility and dynamic routes are included so they are not lost.

| Platform route | Website transfer status |
|---|---|
| / | Pending explicit destination and acceptance review |
| /about | Pending explicit destination and acceptance review |
| /activity | Pending explicit destination and acceptance review |
| /blog | Pending explicit destination and acceptance review |
| /blog/[slug] | Pending explicit destination and acceptance review |
| /careers | Pending explicit destination and acceptance review |
| /careers/[slug] | Pending explicit destination and acceptance review |
| /careers/applications | Pending explicit destination and acceptance review |
| /collaborate/[id] | Pending explicit destination and acceptance review |
| /community | Pending explicit destination and acceptance review |
| /community-guidelines | Pending explicit destination and acceptance review |
| /contact | Pending explicit destination and acceptance review |
| /contribute | Pending explicit destination and acceptance review |
| /credentials/[credentialId] | Pending explicit destination and acceptance review |
| /events | Pending explicit destination and acceptance review |
| /events/[slug] | Pending explicit destination and acceptance review |
| /faq | Pending explicit destination and acceptance review |
| /feedback | Pending explicit destination and acceptance review |
| /join | Pending explicit destination and acceptance review |
| /media | Pending explicit destination and acceptance review |
| /membership | Pending explicit destination and acceptance review |
| /mentors | Pending explicit destination and acceptance review |
| /newsletter | Pending explicit destination and acceptance review |
| /newsletter/preferences | Pending explicit destination and acceptance review |
| /opportunities | Pending explicit destination and acceptance review |
| /opportunities/[id] | Pending explicit destination and acceptance review |
| /organisation | Pending explicit destination and acceptance review |
| /organisations | Pending explicit destination and acceptance review |
| /partnership | Pending explicit destination and acceptance review |
| /people | Pending explicit destination and acceptance review |
| /people/[id] | Pending explicit destination and acceptance review |
| /privacy | Pending explicit destination and acceptance review |
| /project-architect | Pending explicit destination and acceptance review |
| /projects | Pending explicit destination and acceptance review |
| /projects/[id] | Pending explicit destination and acceptance review |
| /projects/master/[id] | Pending explicit destination and acceptance review |
| /projects/paths | Pending explicit destination and acceptance review |
| /projects/paths/[slug] | Pending explicit destination and acceptance review |
| /proof/[id] | Pending explicit destination and acceptance review |
| /search | Pending explicit destination and acceptance review |
| /showcase | Pending explicit destination and acceptance review |
| /signin | Pending explicit destination and acceptance review |
| /spotlight | Pending explicit destination and acceptance review |
| /spotlight/[id] | Pending explicit destination and acceptance review |
| /submitted | Pending explicit destination and acceptance review |
| /terms | Pending explicit destination and acceptance review |
