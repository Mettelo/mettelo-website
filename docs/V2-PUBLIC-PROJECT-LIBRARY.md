# Public Project Library transfer

The website now builds /projects/ and 50 static /projects/mtl-…/ detail pages, using the complete public snapshot from `Mettelo/mettelo-platform` revision 4c80cec7d0a6cf6614ec9d0ed0af1e6beaac347f, `data/github-master-projects.json`. Field validation is transferred from its `scripts/validate-github-first-catalogue.mjs`. Canonical IDs, titles, briefs, problems, capabilities, roles, expertise, sectors, suggested team sizes and GitHub master URLs are preserved. Optional empty use-case/data-source fields are omitted, not invented. The platform's historical 40-project references are superseded by its approved 50-project contract.

Current GitHub metadata inspection on 1 November 2026 confirmed all 50 master repositories exist and have public visibility. This is a repository visibility check, not a new editorial audit of all linked datasets or the contents of each README. The website retains the reviewed snapshot through GitHub/API outages and needs no database or credentials for public browsing.

The catalogue searches IDs, titles, briefs, problems, tracks, sectors, capabilities and roles. Track/sector/role filters combine with the search; URL parameters survive reload. Clear filters restores all projects. Empty results offer recovery guidance. All 50 brief cards and detail pages work without client JavaScript; filters are progressively enabled when it is available. Search uses text and dataset comparisons, never injected HTML.

Visitors can read the master brief on GitHub and use the website's existing project-interest Tally URL, https://tally.so/r/eq4Wjo. No submission was made during testing. These pages explicitly avoid claiming live team capacity, vacancies, offers, eligibility or application status; those remain separate operational functionality. No Supabase operational projects/applications/runs were imported or changed.

Projects is added to the shared public navigation, preserving existing destinations and community-resource access. The static generator adds canonical/sitemap entries and the existing Hostinger public packager includes only the generated projects directory. Source JSON, private member data, application code and environment files remain outside public output.

Verification: 50-project data and detail-route checks; positive/negative combined search/facet tests; existing public regression suite; Hostinger static build/output audit and packaging privacy tests passed. Browser checks confirmed 50 results, one result for MTL-AI-050, zero for a conflicting Business Analysis filter, five Business Analysis results, clear-filter recovery and persistence after reload. A complete detail page showed its source content and correct GitHub/Tally destinations. Desktop screenshots were reviewed and the header logo contrast corrected. Dedicated mobile/device testing and real Tally form completion remain pending. No deployment, GitHub push, DNS, production database change or community email occurred.

Local preview: build the static site and run scripts/serve-public-preview.mjs; it binds only to 127.0.0.1:3002 and serves the packaged dist output. The Next.js member app remains separate.

Final local HTTP smoke check: all 50 project detail URLs returned HTTP 200 from the packaged static preview. Public output audit counted 90 files and found no private/source paths.
