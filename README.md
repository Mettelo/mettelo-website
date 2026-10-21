# Mettelo public website

Static HTML, CSS and progressive JavaScript, with a small PHP waitlist handler. No database, package dependencies, accounts or payments. Existing external services remain the destination for membership/project applications, resources and collaboration. The live waitlist connects to the separate forms.mettelo.com PHP endpoint and sends notifications through Hostinger Mail to hello@mettelo.com. Local PHP collection stays disabled. See services/waitlist/README.md for the independently deployed service; credentials are stored only on Hostinger outside public_html.

## Run locally

With PHP 8.1+ installed, run `php -S 127.0.0.1:4174 -t .` and open `http://127.0.0.1:4174/`. Do not use a static server that exposes PHP source. Local preview must not send real mail; keep the handler disabled. See docs/HOSTINGER-LAUNCH-GUIDE.md for upload and real-host checks.

## Reusable foundations

- `tokens.css`: official colours, shared surfaces, spacing, radii and typography.
- `styles.css`: shared wrapper, navigation, buttons, sections, resource links, ecosystem layout and footer.
- `career.css`: homepage support, career panel, starting steps and FAQs.
- `script.js`: progressively enhanced disclosure navigation and copyright year. Navigation remains visible without JavaScript on mobile.
- `assets/`: supplied vector logo variants with the embedded small tagline removed; favicon derived from the official mark. The official tagline is rendered as accessible HTML: “Where contribution becomes opportunity.”

Reuse the semantic header/footer markup, button and layout classes for future pages. Keep static content in HTML so it loads without JavaScript. Do not add a framework merely to share a header.

## Validation

Run `node --check script.js` and `node scripts/check.mjs`. Manual review should cover 390px phone, 768px tablet and desktop layouts, keyboard navigation, menu open/close/Escape, section destinations, native FAQ disclosure and reduced-motion behaviour. External services require their own availability checks; a preserved URL does not guarantee third-party availability.

## Review workflow

Use a branch and pull request. Homepage changes await explicit user approval before merge or development of the next page. Do not modify the live domain, DNS, existing hosting or external services as part of preview work.

## Start Here
The onboarding route uses start/index.html so ordinary static hosts can resolve /start to /start/. start/start.css and start/checklist.js add only page-specific styles and local checklist behaviour. Run node scripts/check-start.mjs for navigation and persistence checks. The local-storage key is mettelo:onboarding:v1; only completed step IDs are stored. A failed storage operation degrades to an in-memory checklist. No network requests are made by checklist code.

The Start Here PR is stacked on homepage-final-review until that foundation is merged. Do not merge the homepage implicitly as part of onboarding review.

## Community Guidelines
/community-guidelines resolves to community-guidelines/index.html on directory-based static hosting. Page-specific styles are in community-guidelines/guidelines.css. Run node scripts/check-guidelines.mjs to check all three pages and cross-page navigation. Membership agreements are displayed only; acceptance stays in Tally. POLICY-REVIEW.md identifies unapproved policy/operations items. The visible draft, privacy and reporting notices must remain until those decisions are resolved. This PR is stacked on start-onboarding.

## Our Story
/our-story resolves to our-story/index.html on directory-based static hosting. story.css is page-specific. Founder text and message are user supplied; the portrait is pending (see FOUNDER-CONTENT.md). AboutPage structured data contains only supplied founder details and no founding date or image. Run node scripts/check-story.mjs for all four pages and source checks. The Our Story branch is stacked on community-guidelines.
