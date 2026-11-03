# Homepage transfer — local review

Adapted the pinned platform app/page-content.tsx and lib/website-pages.ts homepage into the website's static architecture: project-led hero, a project showcase, claim/evidence comparison, four-step contribution journey and professional/organisation routes. The source's historical metrics, simulated verified Proof record, CMS queries and live feeds were not presented as website facts. Existing ecosystem, resource directory, community links, trust pages, FAQ and waitlist gate remain.

The career finder moved from the hero into member support. Its existing browser interactions and no-JavaScript fallback remain, with hidden-state styling adapted to the new location. Only the hero-destination assertion in the existing design check changed to reflect the new three calls to action; other build checks remain intact.

Static production HTML has sign-in/opportunity availability anchors until member hosting and real opportunity publication are ready. The local preview server alone maps the marked links to port 3001. No localhost app destinations are written into the production HTML. This fallback must be replaced with reviewed hosted destinations as part of release; the homepage is not launch-complete while those services are unavailable.

The static build and its existing checks passed (initial local asset budget 69,330 bytes before the final metadata-only adjustment). Browser rendering was inspected and a screenshot saved. Local sign-in and opportunity destinations were confirmed in the browser. The original browser URL briefly retained a connection error after restarting preview; a fresh review tab loaded successfully. No hosted/mobile acceptance or production account test is claimed. Further testing was postponed at the owner's request.

This is the first homepage transfer, not a claim that every platform public page has been transferred. The complete public-route inventory remains the source for subsequent page work. Live-content cards and full organisation/membership destination pages need their own transfers. No production deployment, branch push, database operation, pipeline activation or community email occurred.
