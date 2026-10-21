# Public website quality checkpoint

Historical quality checkpoint: the subsequent trust-page phase completes the public policy copy and adds Privacy/Contact routes. See TERMS-REVIEW.md and PRIVACY-AND-SUPPORT-OPERATIONS.md for current status and actual launch tasks; earlier pending-page notes below describe this earlier checkpoint.

## Information architecture

Public navigation: Our Story, Member support, Ecosystem, Resources and Join the community. Homepage anchors remain the home for support/resources/FAQs. Project Studio remains the existing external library. Community applications and project applications remain distinct.

Start Here is an unlisted community onboarding page at /start/. Removed links to it from all public pages and shared navigation/footer, added noindex,follow, kept its checklist/resources and direct URL functional. This is discoverability control, not authentication or confidentiality. Share the direct URL with WhatsApp/Discord members. The page remains connected to public pages through its own navigation.

Footer: brand plus About Mettelo, Participate and Trust & guidance columns; separate social/copyright row. Draft/pending legal labels stay visible and honest. Shared source templates are synchronised to all five static pages with `node scripts/sync-shared.mjs`; no runtime framework or build step on Hostinger.

## Content review

- Homepage: retain clear career benefits, current resources, ecosystem availability, FAQs and membership; add a separately labelled future-platform waitlist.
- Our Story: remove the repeated practice/connection/evidence card section already explained in the narrative and ecosystem; retain approved founder biography, portrait and message. Public participation links go to resources and membership.
- Start Here: preserve all requested onboarding sections, participation pathways and checklist persistence. Its detail serves members rather than expanding the public menu.
- Guidelines: simplify breadcrumb and CTA to public routes. Preserve conduct, project expectations and unresolved moderation-policy flags.
- Terms: preserve the draft legal content and approval gate. Privacy and Contact remain pending. The new waitlist does not mean these policies have been approved.

## Waitlist and hosting

Owner selected PHP/HTML Hostinger hosting and hello@mettelo.com. See HOSTINGER-WAITLIST.md. PHP handler is implemented and tested with a fake mail transport. It emails requests; it is not a database or mailing-list management service. Collection remains disabled until approved notice, configuration and actual Hostinger inbox-delivery verification. No real mail was sent locally. No production deployment, mailbox, DNS or domain changes.

The earlier source audit predates this waitlist implementation: the new first-party availability request and optional submission endpoint are additions to that baseline. Names/emails would be emailed once enabled; private rate counter storage retains keyed network hashes/counts. This new flow must be covered by the pending Privacy Policy. No analytics, advertising scripts or waitlist cookies were added; onboarding local storage remains unchanged.

## Remaining launch decisions

Approved Privacy Policy and collection notice; operator identity and legal details; retention/deletion and withdrawal operations; verified moderation/public contact arrangements; approved Terms; real Hostinger PHP mail delivery and routes; canonical URLs and indexing based on the approved live deployment. No claim of WCAG certification, legal approval or production readiness is made from local checks alone.

## Verification completed

Seven Node check suites pass, including existing onboarding storage regressions and all-page link/asset checks. PHP 8.5.11 syntax checks and handler tests pass with fake mail delivery: validation, consent, injection rejection, network/global limits, corrupt-state failure and transport failure. Local PHP HTTP checks return 200/available:false for availability, 503 for submissions while disabled, and 405 for unsupported methods. All five pages checked at 390px, 820px and 1280px with no horizontal overflow; mobile menu opens and closes with Escape. Footer and waitlist visually reviewed on desktop and mobile. Homepage initial local assets total about 57KB; no claim of a production performance score.
