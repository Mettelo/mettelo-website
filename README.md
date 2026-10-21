# Mettelo V1 website

Static HTML, CSS and progressive JavaScript. No backend, build step, package dependencies, accounts or payments. Keep the existing external services as the destination for applications, resources and collaboration.

## Run locally

Serve this directory with any static HTTP server. For example, with Python installed: `python -m http.server 4174 --bind 127.0.0.1`. Open `http://127.0.0.1:4174/`.

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
