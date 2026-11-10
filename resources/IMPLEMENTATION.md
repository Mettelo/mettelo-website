# Mettelo Resource Library — Immigration implementation

Status: **review branch**, not publicly deployed.

## Scope

This first release adds `/resources/` to the existing Mettelo website, preserving the long-form text of all 15 Markdown files in the immigration collection. No changes to the existing public homepage, URLs or shared site components are required.

The initial reader includes:

- Five primary guides: Digital Technology, Arts & Culture, Academia & Research, Innovator Founder and Nigerian Passport Renewal.
- Their supporting checklists, tracker guides and directory pages.
- Full Markdown rendering (tables, headings, references and footnotes where supported by the renderer).
- Mermaid flowcharts added to the five main guides.
- Desktop table of contents, resource navigation and mobile navigation.
- A library landing page, resource filtering and in-guide term highlighting.
- Copyright and educational-use notices.

## URLs after deployment

- `https://mettelo.com/resources/` (landing)
- `https://mettelo.com/resources/guide/?doc=global-talent/technology`
- `https://mettelo.com/resources/guide/?doc=global-talent/arts-and-culture`
- `https://mettelo.com/resources/guide/?doc=global-talent/academia-and-research`
- `https://mettelo.com/resources/guide/?doc=innovator-founder/guide`
- `https://mettelo.com/resources/guide/?doc=nigerian-passport/passport-renewal-uk`

These links require the website changes to be deployed. They are **not** live just because the files exist in a feature branch.

## Technical architecture

Content is copied into `resources/content/` from the Mettelo Resource Hub, with folder paths maintained. `resources/guide/index.html` uses a whitelist to select the document and fetches the relevant local Markdown source. Client-side rendering uses Marked, DOMPurify and Mermaid loaded from pinned CDNs; the approved Markdown is **published on the public website**.

The website is static and compatible with the existing Hostinger deployment. It could also be served by GitHub Pages if GitHub Pages is configured for the publishing repository. A private source repository and a public publishing repository can be supported later through a controlled build-and-copy workflow.

## Important limitations

1. **This does not prevent downloads or copying.** Any publicly rendered content can be saved or recovered using browser tools. Do not privatise the original resource repository until the publishing workflow and links have been verified.
2. **No account-based access control** is implemented. This release is a public educational reader.
3. **CDN dependencies** require connectivity; for production hardening, bundle and pin local versions of the renderer and sanitizer.
4. **Legal content** remains subject to independent current-rule verification and should not be construed as regulated advice.
5. **Guide refresh is currently manual.** Edits to the original repository do not automatically update the published content copy. A CI sync step may be added once deployment permissions are confirmed.

## Before publishing

- Test with the actual hosting environment.
- Open all five main guides and all supporting checklists.
- Confirm every Mermaid diagram renders.
- Check internal links, external links, Markdown tables and keyboard navigation.
- Test at mobile widths and with a screen reader.
- Confirm approved organisation and author attribution.
- Perform a content review against the current official immigration rules.
- Review copyright policy, content consent and any third-party text.
- Decide how the content will be refreshed after the source repository becomes private.

## Future categories

The `/resources/` section can grow into a multi-category platform. Future release groups can add `career/`, `technical/`, `uk-careers/` and `project-development/` without changing the immigration URLs. This is **not** a commitment to publish those unfinished categories immediately.

Prepared for Mettelo · November 2026.
