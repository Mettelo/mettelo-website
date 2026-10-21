# Mettelo product-design review

Current homepage revision: the owner rejected the light homepage and stretched section layout. The homepage now retains the earlier dark/compact design plus a third hero CTA to the waitlist. The remaining pages keep their supporting-page refinements. See HOMEPAGE-CORRECTION.md; homepage-finder/search descriptions below record the superseded design pass and do not describe the current homepage.

## Evidence and direction

This pass responds to owner feedback that the public site felt basic and repetitive. It is a design/engineering review, not a claim that formal interviews, usability research or conversion experiments have been run.

The previous pages repeated dark oversized heroes, numbered boxed grids and similar CTAs. The new editorial system uses the official navy/cream/gold palette, light public navigation, strong sans/serif hierarchy, fine rules and selective dark sections. The official navy logo is used on the light header; the sand logo remains in the dark footer. No stock testimonials, invented statistics, generated customer photographs or simulated live platform dashboards were added.

## Page-specific work

- Homepage: rewritten lead, interactive support finder using native keyboard-accessible radios, actual resource destinations, list-led benefits, connected ecosystem layout and searchable resource directory. Current and planned capabilities remain distinct.
- Start Here: lighter orientation, compact numbered exploration rows, progress panel that remains in view on desktop, next-unfinished-step shortcut, searchable essential links and current-section indication. Existing seven-step persistence and reset behaviour preserved. Page remains unlisted/noindex.
- Our Story: supplied founder portrait in the opening composition, readable editorial narrative and more personal quotation treatment. Approved biography/message and existing portrait fallback assets preserved.
- Community Guidelines: sequential standards rather than a wall of cards; mobile contents disclosure and section highlighting; participation/reporting content unchanged.
- Terms and Privacy: compact document header, larger body type, readable line lengths, less vertical repetition and mobile contents disclosure. Legal wording is unchanged.
- Contact: purpose-based shortcuts, email-copy control with honest failure feedback, readable support instructions and mobile document navigation. No new contact-form data collection.

Correct Discord invite throughout current source/tests: https://discord.gg/yy9qJZ7W . Old generated packages should not be used for deployment; use the new refinement package.

## Interaction, accessibility and privacy

The finder uses native radio keyboard interaction and a polite result region. Without JavaScript, its real fallback links remain available. Search filters only already-rendered resource links, announces match counts, offers an empty state and Clear, and never transmits or stores the query. Onboarding resume reads only the existing checkboxes. Mobile contents exposes expanded state, focuses the chosen section and remains open/available without enhancement. Active document sections use aria-current=location. Copy failures preserve the ordinary mailto route.

High-contrast focus treatments and reduced-motion handling are included. Browser review identified inherited pale mobile-menu/date colours after changing surfaces; those were corrected. No new trackers, analytics, remote fonts, accounts, authentication, database or third-party scripts. The waitlist release gate and existing backend remain unchanged. No claim of WCAG certification or security audit certification.

## Verification and release

Run the existing eight Node checks plus scripts/check-design.mjs. Existing PHP handler tests remain applicable. Browser checks cover radio keyboard switching and destinations, resource search/empty/reset states, mobile contents selection, layout bounds and missing images. Test the prepared package again on Hostinger, especially PHP delivery, routes, HTTPS, provider notices and existing legal/operational launch tasks. No live deployment or domain change is authorised by this design pass.

Completed browser review: all seven pages at 320, 390, 820 and 1280px without horizontal page overflow; no broken images observed. Native radio selection and ArrowRight changed the finder result to the expected real destinations, including the new Discord invite. Homepage no-match search and Clear returned 0/6 then 6/6 resources; onboarding workshop search returned 2/8. Mobile contents opened, selected the privacy-request section and collapsed. Targeted computed text-colour/background checks at desktop found no remaining issues in the sampled text elements; this is not a complete accessibility audit or certification.

Useful next usability review with actual community members: locate interview help, find a workshop, distinguish membership from project participation, resume onboarding and locate a reporting route. Observe task success and confusion before proposing more UI. Analytics can be considered separately with appropriate privacy assessment; no measurement infrastructure was silently added.

## Source maintenance

shared/design.css is the final visual layer after existing component styles. shared/interactions.js progressively enhances static content. scripts/sync-shared.mjs attaches both to all seven pages and preserves the Contact shortcuts when legal pages are regenerated. Source generators and packaging retain the PHP/HTML Hostinger workflow. New public assets are explicitly included in scripts/package-hostinger.mjs.
