# Mettelo Website: experience architecture and design specification

2 November 2026. Applies to the website V2 branch. Platform is a reference for scope, content and working features; it is not the implementation target. The existing public static site and separate Next.js member runtime remain intact. No new UI framework, database replacement or platform deployment is required by this design.

## Purpose and users

The first experience should help a visitor understand Mettelo, find relevant practical work, create an account and take a useful next action. Returning members should find their profile, project interests and saved opportunities without repeating onboarding. Existing admitted community members should establish website access without being presented as new community applicants. Organisations need a direct enquiry route with clear expectations.

These are design hypotheses based on owner direction and product inspection, not findings from interviews or a measured usability study. No conversion, accessibility-conformance or performance improvement is claimed without evidence.

## Severity-ranked issue register

| Severity | Problem and user impact | Cause | Design response / implementation status |
|---|---|---|---|
| High | Signup and platform waitlist compete; users do not know whether both are required. | Earlier V1 registration persisted after account transfer. | Remove public V2 waitlist and browser request; use one account invitation. Implemented in preview, historical records retained. |
| High | Signing in after choosing a project loses the selected form. | Middleware discarded the internal destination. | Preserve validated internal next destination. Implemented; verify logged-out redirect and signin return. |
| High | Member pages have different or absent navigation, requiring a return to home. | Navigation duplicated inside individual pages. | One shared signed-in navigation with current location, native mobile disclosure and account menu. Implemented across member runtime, including opportunities. |
| High | Public signup is advertised while production destinations remain unavailable. | Two-host release is not connected. | Keep truthful prelaunch availability fallback; switch destinations and copy only during an accepted coordinated release. Hosting remains a blocker. |
| Medium | Public/member colour, type and control treatments drift. | Independent CSS foundations and hard-coded source styling. | One canonical token file, generated member copy, shared component rules and deliberate navy/paper/gold hierarchy. Foundation implemented; legacy component cleanup continues as layouts are accepted. |
| Medium | Flat profile form reads as a database field list. | All fields rendered in one undifferentiated grid. | Three semantic groups: About you, Work and goals, Professional links; clear private-data notice and save status. Implemented without changing profile contract. |
| Medium | Save action is far from later profile fields, and save timing is unclear. | Long form and bottom-only action. | Sticky save area with explicit manual-save explanation; no promise of unsaved draft persistence. Implemented, mobile/zoom acceptance required. |
| Medium | New catalogue and older external library compete. | Historic resource links were preserved during transfer. | Website catalogue is the primary discovery route; original master repositories remain context links within briefs. Updated public navigation/content. |
| Medium | Signed-in screens feel disconnected from brand and lack keyboard skip navigation. | Text-only app header and separate shell. | Local brand asset, shared footer/policies, visible focus and skip-to-main control. Implemented. |
| Medium | Small text and repeated cards reduce member-home readability. | Source dashboard density without full operational data. | Larger reading scale, one next-action band, restrained panels, token-aligned surfaces; no fabricated activity numbers. Foundation implemented. |
| Medium | Opportunities appear useful but still contain sample data. | Data pipeline not operational. | Keep synthetic labels honest; real feed is a separate release gate, not something visual polish can solve. |
| Medium | Data-guide/governance coverage is incomplete on some briefs. | Source documentation missing/unverified. | Explicit missing-guidance states and source links; do not infer licences or permission. Current design retained. |
| Review | Users may leave long interest form drafts accidentally. | Draft is component state only. | State manual submission clearly. Assess account-bound server drafts later; do not restore shared-browser localStorage containing another member's draft. No draft saving claimed. |
| Review | Full route/device/accessibility acceptance is missing. | Prior piecemeal checks and unreliable viewport overrides. | Defined acceptance matrix below. No blanket WCAG pass or full mobile pass claimed. |

## Information architecture

### Public navigation

Primary: Projects → Opportunities → Our Story → Resources → Support. Account actions: Sign up, Sign in. Projects is first because practical contribution is the principal journey. Resources points to the existing resource directory; Support has a dedicated destination. Ecosystem belongs within the homepage/story and footer rather than adding another equal navigation item. Use the existing mobile menu, with 44–48px practical targets, clear expanded state and keyboard support. No mega menu is justified by this scope.

Footer: About Mettelo, Participate and Trust & guidance. Website project library is primary; preserve master source links within individual briefs. No platform waitlist navigation in V2. Public /start remains an unlisted community guide, accessible to members; it is not promoted as a public directory of private resources.

### Member navigation

Persistent primary tasks: Home, Project interests, Opportunities, Saved opportunities, My profile. On desktop, a compact horizontal row is sufficient for these five tasks. On narrow screens, an expandable “My Mettelo / current page” menu replaces the desktop row. Account menu retains profile, support and signout. Global account header and policy footer remain consistent.

Projects are discoverable from member home and public catalogue; individual brief → protected interest form retains context through signin. No inactive Lab/Proof/Talent items, fake counts or links to absent operational pages are introduced.

### Remaining scope

All missing platform public routes remain recorded in V2-WEBSITE-READINESS-2026-11-02.md. This design does not quietly postpone or declare those routes complete. Blog/events/people/showcase/organisation and other missing destinations need content, data and workflow decisions before their layouts can be implemented truthfully. Administrative review is a separate permissioned experience, not an exposed member navigation item.

## Core journeys

1. **First-time visitor:** homepage promise → project catalogue → brief and data-use context → Submit interest → signin/signup as needed → verified account/onboarding → original form → review/terms → receipt. Maintain a safe internal return path; show no guaranteed placement.
2. **Existing community member:** signup → verified email → establish username → private profile → optional review of matched historical registration → explicit save → member home. Do not make a new community-selection decision implicitly. Historical duplicate matches require review.
3. **Returning member:** signin → member home → next action, project interests or saved opportunities. Full profile completion must not block browsing where only verified identity is required.
4. **Opportunity discovery:** search/filter → role context/detail → safe official application link, or save → personal saved list. Saving is not an external employer application. Show unavailable/closed states honestly.
5. **Recovery:** request email → reachable callback → new-password form → success → member area/signin. Localhost links on a phone cannot satisfy acceptance.
6. **Profile:** account menu → grouped fields/photo controls → explicit save/upload status → thumbnail/current details. Photo saving is separate from text changes and must not discard them.
7. **Organisation:** homepage organisation route → support/enquiry context → contact Mettelo. No pretend procurement, partnership application or automated matching system.

## Shared design system

- **Brand:** navy #141824, warm paper #fcfaf5, white surfaces, muted text #60616a, gold #c6892a as emphasis and dark gold #82571d for readable text on light surfaces. Status messages use semantic danger/success colours and words, never colour alone.
- **Type:** local system font stack shared by public and member runtime; no remote font dependency. Body 16–17px, readable line-height around 1.65–1.7; headings use a restrained responsive scale. Keep general reading width near 65–75 characters. Avoid all-caps paragraph copy.
- **Spacing:** 8, 16, 24, 32, 48, 64, 80px foundation. Main shells approximately 1120–1200px; use two-column content/aside layouts when the task benefits, collapse at content-driven breakpoints. Use 12-column proportions conceptually where useful, not a mandatory grid on every form.
- **Controls:** 8px radius, usually 48px minimum height, one primary action per task area. Secondary outlined action; tertiary link. Disabled, busy, error and success states remain distinguishable. Focus ring must remain visible against both dark and light backgrounds.
- **Surfaces:** 16px radius for task panels, restrained borders, shadow reserved for overlays. Prefer sections and rules over wrapping every paragraph in a card. No ornamental gradients or decorative charts.
- **Forms:** persistent labels, optional markers, examples only where useful, semantic fieldsets, plain-language recovery, review before consequential submission. Short forms remain single-step. Profile is grouped rather than needlessly split into a wizard; project interest retains its five meaningful stages.
- **Motion:** short focus/hover transitions only where helpful; respect reduced-motion settings. Loading and failure must never appear as an empty dataset.
- **Assets:** local logo; meaningful alt text for informative content, empty alt for duplicated/decorative avatar imagery. Do not add stock images solely to fill space.
- **Implementation:** tokens.css is canonical and sync-design-tokens.mjs generates the identical member-local CSS, avoiding imports outside the isolated app build. Product patterns live in shared/public.css and member product-design.css; new component styles should use these values rather than create independent themes.

## Page and responsive layout specifications

| Page family | Purpose / primary action | Desktop composition | Narrow-screen behaviour |
|---|---|---|---|
| Homepage | Understand Mettelo and explore projects | Clear promise + example brief; evidence explanation; practical routes; concise ecosystem/resources; organisation route; FAQ; one account invitation | Linear reading order; no horizontal comparison grid; stacked actions; collapse navigation |
| Project catalogue | Find a relevant brief | Intro, labelled search/facets, result count, consistent brief cards | One-column results; readable filter controls; preserve no-JS full list |
| Project detail | Judge fit and submit interest | Breadcrumb, concise hero, challenge/source/capability/roles, contextual interest aside | Content first; aside becomes an inline next-action section; no overlay hiding content |
| Data-use guide | Understand permitted source use | Readable rule sections and source priority | Single reading column; descriptive source links |
| Opportunities | Find a suitable external opportunity | Search/quick filters, advanced disclosure, results with eligibility context | Collapsed advanced controls; full-width search; no tiny filter chips; clear reset/no-results states |
| Opportunity detail | Decide whether to visit official application | Title/context, substantive summary, eligibility/source/deadline and save/apply | Relevant context before outbound action; thumb-friendly controls |
| Story / guidance / policy | Understand trust and responsibilities | Readable editorial column with section navigation where useful | Sections in document order; tables scroll within their container, not the whole page |
| Contact/support | Choose an appropriate enquiry route | Quick links and purpose-specific instructions; email fallback | Large route targets; no unnecessary form or forced signin |
| Signin/signup/reset | Establish or recover access | Calm form, task-specific explanation, minimal distraction | Single column, correct keyboards/autocomplete, password visibility and clear status |
| Member home | Choose next useful action | Welcome/private profile summary; one next-step band; project/community/support routes | Vertical task order; persistent compact workspace navigation |
| Profile | Maintain private professional identity | Photo editor, identity notice, three grouped sections and explicit save area | One column, no hidden required fields, save controls remain reachable without covering focused fields |
| Interest flow | Explain fit and confirm participation terms | Project context, five labelled stages, fields, review and terms | Current stage visible with step position; Back/Continue/Submit full-width; no claim of automatic draft saving |
| Interests / saved roles | Return to own submissions and shortlists | Useful empty state or readable receipts/cards with context | One column, visible primary next action; status expressed in text |
| Errors and confirmations | Explain result and next action | Short heading, outcome, retry/return route | Same navigation and readable content; never generic “something happened” without recovery |

## Acceptance matrix

Check representative public, account, discovery, profile and interest routes at 360/390px phone, 768px tablet, 1280/1440px desktop, plus 200% text resize and 400% zoom/reflow where applicable. Record actual measured viewport widths; a requested override alone is not evidence. Test real phone email callbacks through hosted HTTPS staging.

Keyboard: skip navigation, menu disclosure, visible focus, logical order, filters, form errors, step transitions and terms dialog focus/escape. Automated contrast/semantic checks supplement manual keyboard and assistive-technology review; no WCAG 2.2 AA compliance claim until the complete applicable criteria are accepted. Status/error messages must be readable without colour and announced appropriately. Pointer targets must meet applicable 24px WCAG criteria, with 44–48px practical touch targets wherever possible.

Workflow: signin retains intended project; project duplicate retry returns one receipt; profile saves preserve private fields; photo upload/remove and account boundaries hold; invalid/closed/unavailable states are recoverable; opportunity save is not confused with apply. Confirm no accidental public exposure of private resources, source credentials or member rows. Never accept participation terms on the owner's behalf during a UI walkthrough.

Performance: retain local assets/no remote fonts and public static packaging boundary. Existing local asset budget is a build guard, not a Core Web Vitals measurement. Measure LCP/CLS in a reproducible hosted run; INP needs real interactions/field evidence. No numerical improvement claim from screenshots.

Proposed pilot targets, not measured results: at least 4 of 5 participants find a project and reach the intended interest form without assistance; returning members locate profile and saved opportunities without going back to home; every participant distinguishes signup from project selection. Record task completion, observed errors, time and abandonment before/after with equivalent tasks. A small pilot guides changes but does not establish statistical conversion gains.

## Delivery and review status

This change implements the shared foundation, global navigation, retirement of the public waitlist, grouped profile/save patterns, safe return navigation and consistent shell. It adapts existing functioning pages; it does not recreate accounts or replace business logic. Existing project redesign and native interest workflow are retained. New missing content/data-backed routes, full reviewer operations, hosted environment setup and all acceptance gates remain tracked separately.

Before/after: two public registration concepts become one; page-specific member menus become one shared task navigation; flat profile fields become three semantic groups; conflicting source-library routes become one primary catalogue; differing token foundations become one canonical source. These are verified structural changes, not proof of improved conversion or full accessibility. See the implementation verification record for actual check results and screenshots.
