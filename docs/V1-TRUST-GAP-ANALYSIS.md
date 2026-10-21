# V1 trust gap analysis and source audit

Reviewed 21 October 2026. Website base: our-story commit 654020ebd3d28156b1549a72e20be0f5a77c9de1. Platform reference: main 4c80cec7d0a6cf6614ec9d0ed0af1e6beaac347f. Source inspection is not verification of deployed configuration, CMS publication, provider contracts or legal approval.

| Area | Platform | Public V1 decision |
| --- | --- | --- |
| Terms | CMS-backed /terms with code fallback | Adapt structure to actual services; draft /terms only |
| Privacy | CMS-backed copy includes accounts, applications and analytics | Defer page; confirm actual operator and processing arrangements |
| Contact | Server form writes form_submissions; configured contact email | Do not copy backend; verified public support/privacy route needed |
| About | /about | Reuse /our-story; no duplicate |
| Membership | Account-based application journeys | Preserve external membership Tally form |
| Projects | Database-backed catalogue and application workflows | Link existing Project Library and separate participation Tally form |
| Learning | Platform content and resources | Keep OneDrive library and YouTube; no rebuild |
| FAQ | Includes account and advanced platform capabilities | Keep homepage and Start Here FAQs; defer duplicate standalone route |
| Guidelines | Platform route and community rules | Keep existing V1 page; moderation arrangements still need approval |
| Cookies | Analytics component conditionally loads Google Analytics | Do not copy; no optional analytics found in V1 source |

## Evidence inspected

Platform: lib/website-pages-cms.ts; lib/website-pages.ts; app/{terms,privacy,community-guidelines,faq,contact,about,membership,projects}/page.tsx; contact/ContactPageContent.tsx; components/SubmissionForm.tsx; app/api/forms/route.ts; components/Analytics.tsx; components/PlatformSocialLinks.tsx; app/layout.tsx; AGENTS.md; docs/ARCHITECTURE.md, DESIGN-SYSTEM.md, ADMIN-WEBSITE-PAGES-CMS.md, ADMIN-WEBSITE-SEO.md and project-interest-participation-terms.md.

CMS fallback dates are not proof of approval or effective publication. Live CMS settings, platform deployment and authenticated data were not inspected. Platform social fallbacks differ from user-approved V1 links; retain the user-approved links.

## Observed and potential information flows

- V1: static pages, local scripts, styles and images; external anchor links. No account, contact form, remote fonts, embedded video, advertising or analytics found in reviewed source. Hosting logs, headers and deployment-level scripts still need confirmation.
- Start Here: localStorage key `mettelo:onboarding:v1` preserves checklist IDs on this browser. No identity or server synchronisation. No expiry is implemented; reset or clearing site storage removes progress. Local storage is covered by storage/access rules; confirm the applicable exception and transparency requirements before launch. No decorative consent banner added.
- Membership Tally form: live form viewed without submitting. Requests name, email, WhatsApp number, location, profiles, role, experience, employment status, skills, interests, availability, goals and contribution preferences. Describes WhatsApp/Discord access. Confirm required fields, access controls, notices and controller/provider arrangements. Visible LinkedIn text and its destination appeared inconsistent; verify the external form in its administration interface.
- Project Tally form: preserved link; actual fields, settings, retention and recipient access require verification.
- OneDrive library/workshop volunteering: existing shared folder and workbook preserved; permissions, application fields and access/retention not confirmed. Automated access may be restricted.
- GitHub: public profile/repository contributions and provider account data; repository licences apply. Publication and contributor rights require project-specific agreement.
- Discord/WhatsApp: messages, profiles, phone numbers where applicable and moderation information may be processed in community spaces. Confirm invitation management, admins, reporting and participant notices.
- YouTube/social sites: provider processing begins according to their service behaviour when visitors follow links. No embeds added.

## Release decisions requiring owner and legal review

Confirm operator/controller identity and location; eligibility/minimum age; governing law and dispute arrangements; verified general/support/moderation/privacy contact; applicable lawful bases, processor/controller roles and transfer safeguards; retention/deletion practices; consent or exception assessment for browser storage; hosting logs; project rights and publication permissions; approved moderation process; effective date and communication of changes. No entity, email, address, fixed retention term or jurisdiction invented.

Minimum next work after Terms approval: Privacy (with accurate cookie/storage information) and verified Contact/support arrangements. A separate Cookie Notice is only needed if it improves clarity; assess actual behaviour first. Keep existing Guidelines and FAQs rather than duplicating them. Canonical URLs and indexing require confirmed public deployment mapping; draft Terms uses noindex,follow and no invented canonical. Other pages' deployment/indexing configuration is outside this change.

Guidance consulted (not legal approval):
- https://ico.org.uk/for-organisations/direct-marketing-and-privacy-and-electronic-communications/guidance-on-the-use-of-storage-and-access-technologies/how-do-we-comply-with-the-pecr-rules/
- https://www.gov.uk/guidance/writing-a-fair-contract-for-customers

## Delivery boundary

Only Terms is implemented in this phase. Privacy and Contact footer links point to explicit pending-status sections in Terms; they are not completed policies or contact facilities. No deployment, domain, backend or external-form configuration changes.
