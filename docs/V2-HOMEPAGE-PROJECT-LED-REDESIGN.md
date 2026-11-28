# Homepage redesign after UX review — 2 November 2026

## Owner correction: broader career support

The current hero supersedes the project-example hero described in the original implementation notes below. It now presents skill development, practical experience, application support, interview preparation and professional connections together. The headline is “Build your skills. Put them to work. Grow your career.” The original interactive support finder appears once, in the hero, with Applications / Interviews / Community / Experience choices; the repeated finder in the lower resource section was removed. Three real project briefs remain together in the next section, without duplicating a featured project in the hero. Hero actions are Create your account and Explore member support. Signup remains the account route; no waitlist was restored. Public build and static-output checks passed following this correction.

## Original implementation record

The prior homepage combined V1 career support with a newer project-led hero. It repeated project/community/account explanations and used a large abstract panel rather than demonstrating a real brief. This change replaces the homepage composition, not the working account or project workflows.

## Changes and rationale

- Broader headline, “Put your skills into practice,” addresses both developing and practising professionals. One concise explanation replaces repeated ambition/platform-development copy in the hero.
- Two hero actions: Explore projects and Create an account. Returning-member signin remains in navigation; it no longer competes as a third hero button.
- The hero features the actual MTL-DA-001 public brief, its problem, roles and source skills. A schematic customer-data/insight/decision flow is decorative, not a dashboard or a claim of completed work. No invented member totals, client outcomes, vacancy counts or testimonials.
- Three source-backed project cards immediately follow: MTL-DA-001, MTL-DE-006 and MTL-AI-010. Titles, problems and skills come from the existing website catalogue. They link to their exact website briefs; the library count is derived from all catalogue records.
- Participation is explained in three honest stages: explore, express interest, agree the work if selected. A brief is not a guaranteed role, team or client engagement.
- A labelled member-feature preview explains the actual private profile, interest receipts and saved-opportunity functionality without invented personal activity.
- Six broad career-support panels, repeated ecosystem cards and a separate resource directory are replaced with one resource section: career resources, recorded learning and professional community. Existing YouTube, Discord, workshop volunteering and GitHub links remain. Private resources remain behind the existing member/community route.
- The existing guided resource finder remains available in a native disclosure, with its no-JavaScript fallback. Its choices no longer interrupt the main project-discovery journey.
- Organisation enquiries have a concise dedicated band. Five focused FAQ answers resolve audience, account, selection and availability questions. Future Proof/ecosystem information stays secondary and explicitly developing.
- The prelaunch member-access fallback and one final account invitation remain. Only the local preview maps marked account/opportunity actions to the local runtime. Production member hosting has not been activated.

## Implementation

scripts/build-homepage.mjs now creates the homepage main content from the canonical project catalogue and content/home-resource-finder.html. The normal public build invokes it before validation/packaging. Homepage-specific CSS was replaced with a responsive composition instead of adding another layer of overrides. Other public pages and the member runtime retain their established styles. The obsolete career.css is no longer loaded by the homepage; the file is retained for historical use.

Former resource/participation fragment destinations are retained where relevant: support, resources, applications, interviews, networking, career-resources, experience, opportunities, about, ecosystem, member-access, membership, account-next and faq-title. Internal project links stay in the same tab. External links retain safe-tab attributes.

## Validation and limits

Public build and its existing route/content/asset checks pass. Hero expectation was updated from three buttons to the intended two while retaining actual route/asset/privacy assertions. Catalogue checks remain 3/3. Packaging and static-output checks must remain part of release acceptance.

Browser inspected the desktop hero, source brief and page structure. The actual homepage phone viewport measured 390px, with client and document scroll widths both 375px; no horizontal page overflow. The phone menu opened through its labelled control. This is a browser viewport check, not a physical-device or full accessibility certification. No account, profile, application, database, email or production setting was changed.

No new backend or dependency. No production deployment. Real opportunities, hosted account callbacks, remaining platform public-page scope and full release acceptance retain their existing blockers. No claim of improved conversion, Core Web Vitals or task success without a measured user study.
