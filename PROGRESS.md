# Mettelo V1 progress

## Homepage — ready for review, not approved

Continues from main commit `6ec40b37552e46028cf33cfb4a80c4ca250e20e3`.

Implemented: career-first homepage, six member benefits, getting-started steps, seven ecosystem areas, external resource directory, membership CTA and FAQs. Preserved membership/project forms, Project Library, GitHub, YouTube, Discord, both OneDrive destinations and official social links.

Final review changes: official tagline in accessible HTML, shared design tokens, removed obsolete design styles, readable source, improved mobile navigation focus and no-JavaScript fallback, footer navigation, SVG favicon and social metadata. No backend or live infrastructure changes.

## Approval gate

Wait for explicit homepage approval before moving to Start Here. Individual CV reviews, mock interviews and mentoring session availability still need confirmation before advertising dedicated bookable services. Employment and project placement are not guaranteed.

## Remaining pages, in order

1. Start Here / New Member Onboarding — not started.
2. Community Guidelines — not started.
3. Learning & Resources — not started.
4. Project Studio — not started.
5. Get Involved — not started.
6. FAQs — dedicated page not started (homepage has a short FAQ).

Production domain/hosting verification and deployment remain separate from this homepage preview and PR. Set canonical and social image URLs once the actual production route and hosted image are confirmed.

## Validation for this review
- Static checks and JavaScript syntax: passed.
- Browser review: desktop full page, 768px tablet and 390px phone.
- Verified menu open, Escape close, section focus transfer and native FAQ expansion; no browser console errors observed.
- Tablet navigation and hero now switch to the stacked layout at 900px.
- No horizontal overflow at reviewed tablet/phone widths. Local asset budget: approximately 47KB before compression.
- No formal Lighthouse score or full assistive-technology certification claimed. Third-party form submissions were not performed.

## Phase 2 — Start Here / New Member Onboarding
Explicitly requested by the user after homepage review. Implemented on a separate branch based on homepage-final-review; PR #1 remains unmerged and its approval is not assumed.

/start resolves to the static start/index.html route. Reuses official assets, tokens, shared navigation/footer and progressive navigation. Adds seven-step browser-local checklist, eight exploration cards, the eight-stage pathway, eight essential services, expectations, FAQs and social channels. Membership and project participation remain separate. The Community Guidelines checklist item links to an interim summary while the dedicated page is pending.

Static and state tests cover persistence/reload, unchecking, completion/reset, malformed data and blocked storage. External HEAD checks returned 200 for Tally, Project Library, YouTube, Discord, GitHub and social destinations. Both supplied OneDrive links redirected but returned 403 to automated requests; preserve them and verify access in a normal signed-in browser before release. No forms were submitted.

Status: onboarding ready for review after browser QA; do not begin Community Guidelines until the user approves the next step. No live domain or hosting changes.

Browser QA completed: desktop full-page inspection, 768px tablet and 390px phone; no horizontal overflow at the tested widths. Verified checkbox keyboard operation, persistence across reload, reset, FAQ expansion and mobile menu Escape behaviour; no console errors observed. Start Here is awaiting approval; Community Guidelines has not been developed.

## Phase 3 — Community Guidelines & Membership Guide
Explicitly requested by the user via pasted brief. New static /community-guidelines/ page builds on start-onboarding; earlier PRs remain unmerged. Implemented introduction, membership/access roles, ten standards, learning/mentoring guidance, project/GitHub expectations, evidence/career boundaries, responsible data sharing, reporting placeholder, proposed moderation disclosure, the four membership statements and existing community links.

Navigation/footer and onboarding checklist now link to the full guide. No membership acceptance controls, new storage or backend. POLICY-REVIEW.md records the decisions needed before adoption/public launch: standards approval, reporting route/responsible admins, report handling/moderation decisions, Privacy Notice and confirmation of live Tally agreement text.

QA: homepage, onboarding and cross-page checks passed; routes, anchors and assets resolve. Browser review covered desktop, 768px tablet and 390px phone, contents links, native moderation disclosure, menu/Escape, onboarding-to-guide navigation and membership statements. No horizontal overflow or console errors observed. Existing external links were retained; the previous OneDrive automated-access limitation remains. No forms submitted; no domain or hosting changes.

Status: Page 3 ready for review, policy content not approved. STOP before Page 4 (Learning & Resources) until explicit user approval.
