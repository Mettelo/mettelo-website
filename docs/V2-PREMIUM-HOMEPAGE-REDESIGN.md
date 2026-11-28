# Mettelo homepage redesign — 2 November 2026

Local implementation of the owner's premium homepage brief. Website repository only; the platform remains a source. No deployment, database change, account-flow change or email campaign.

## Audit and decisions

| Previous problem | Design response |
| --- | --- |
| Several sections repeated the same learning/experience promise | One connected capability journey replaces the purpose grid, separate participation section and full product-card grid. |
| Every block competed for attention | Hero establishes the learning-to-capability gap; a single highlighted project anchors the showcase; secondary projects use editorial rows. |
| The hero's questionnaire looked like another form | A semantic capability diagram explains workshops → practical work → contribution evidence. It is an explanation, not a fabricated dashboard or member result. |
| Many equal cards created repetitive pacing | Dark editorial hero, compact trust strip, expandable journey, asymmetric projects, recording pair, dark community section, career split and FAQ. |
| Member workspace repeated account features at length | Profile, project interests and saved opportunities are explained within the career toolkit. |
| Navigation included too many competing destinations | Homepage-specific navigation prioritises Ecosystem, Projects, Learning, Community, Sign in and Join Mettelo. Story, support and legal routes remain in contextual links/footer. Other pages retain their shared navigation. |
| Success stories and results were not evidenced | No invented testimonials, completion figures, placement rates or client endorsements. Only catalogue-derived counts are shown: 50 briefs and six tracks. |

## Architecture and conversion

1. Sticky header and brand positioning: Infrastructure for Data & AI Professionals.
2. Hero: “What you know. What you can do. Close the gap.” Primary conversion is account creation; secondary action explores the ecosystem. Brand tagline: Built for What's Next.
3. Verified inventory strip: catalogue count, track count, recordings and community.
4. Learn, Build, Prove, Connect, Grow: native expandable steps with contextual next actions. A separate disclosure explains all seven product families and their availability.
5. Practical project showcase: original problems, skills, links and participation expectations. No duplicated project in the hero.
6. Two real recorded workshops, optional YouTube player loading and a specific presenter invitation.
7. Community participation and organisational collaboration.
8. Career toolkit and opportunity discovery, with member account as the supporting workspace.
9. Existing substantive FAQs, final account invitation and full existing footer.

Beginners can start with recordings; portfolio builders can explore briefs; experienced professionals can contribute knowledge or discuss collaboration. The journey exposes these choices without a competing form or artificial assessment.

## Visual and implementation system

Existing navy, sand, gold and official SVG logo retained. Existing Segoe UI system stack avoids font downloads. Containers use a 1200px maximum with responsive gutters. Section spacing follows 8px increments; typography and grids adapt at 1100, 800 and 560px. Mobile places the primary invitation before the explanatory diagram, simplifies the diagram's repeated supporting text and uses touch-friendly native disclosures. Project composition and community ledger change layout for smaller screens.

The static generator assembles reusable content partials. `shared/home.css` owns page layout; `shared/home-experience.css` owns the capability diagram, journey and media. Previous accumulated homepage overrides were replaced. `shared/home-experience.js` now contains only explicit opt-in media loading; the former audience questionnaire code is removed. No dependency added. Shared navigation script still handles menu state, Escape, focus restoration and breakpoint changes.

Native details/summary works without JavaScript. Ordinary recording links remain available without the media enhancement. Motion is restricted to a short diagram entrance and colour feedback, disabled under reduced-motion preferences. Fixed dimensions/aspect ratios reserve logo and media space. Public account actions retain their release-gated Hostinger destinations; the local review server maps the marked routes to the member preview.

## Verification

| Check | Result |
| --- | --- |
| Public build, route/anchor, content, privacy and asset checks | Passed |
| Source catalogue parity tests | 3 passed |
| Packaging boundary tests | 2 passed |
| Static output inspection | 90 allowed public files; no app source, PHP, environment files or private paths |
| JavaScript syntax and diff whitespace | Passed |
| 320 / 375 / 390 / 768 / 1024 / 1440px viewports | No document horizontal overflow at any requested width |
| Mobile menu | Opens; Escape closes and restores focus to menu button |
| Capability disclosures | Click and keyboard Enter work; selecting a stage exposes its relevant content |
| FAQ | Keyboard Enter reveals the beginner answer |
| Workshop player | Zero initial iframes; explicit selection creates the correct privacy-enhanced YouTube iframe; real player appears, playback not started |
| Rendered DOM audit at mobile width | 230 text nodes checked; no computed contrast failures; five gradient-background nodes excluded; zero unnamed controls or images missing alt; one H1 |
| Standalone controls at 320px | Checked buttons, summaries, primary actions, text links and navigation links: no visible targets below 24 × 24px |
| Initial local assets | 70,943 bytes, below the existing 100KB budget; previous homepage 81,867 bytes |

The custom contrast audit composites solid ancestor backgrounds and checks text against AA text thresholds; it is not a complete accessibility scanner. Gradient content, pseudo-elements, all focus states and third-party player internals are outside that result. Native semantics and reduced-motion CSS were reviewed. Screen-reader testing, browser zoom/text-spacing overrides, physical-device performance, cross-browser testing and field Core Web Vitals remain unmeasured. No full WCAG 2.2 AA certification or production performance score is claimed.

## Acceptance status

Implemented: substantially revised composition, preserved brand, clear primary conversion, authentic inventory and recordings, connected five-pillar journey, varied layouts, responsive navigation, maintained existing destinations and progressive media/disclosure behaviour. Local checks pass. Owner visual review remains necessary; no user-research result or business conversion improvement is claimed.

The complete V2 release remains separate. Production database, hosted account callbacks, operational pipeline and previously recorded launch dependencies are not resolved by this homepage redesign. No push, merge or production deployment has been made.
