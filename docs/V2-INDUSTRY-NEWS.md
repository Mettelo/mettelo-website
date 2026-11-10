# Industry News and editorial publishing — staging checkpoint

4 November 2026. No Git push, production deployment, production database change, email or social post.

## Reader and editor journeys

- Public menu and footer now link to `/industry-news/`. Shared headers were regenerated across the existing seven pages and the project catalogue. The dynamic reader experience is `/industry-news` and `/industry-news/[slug]` in the member runtime, with its own public navigation rather than member account chrome.
- Industry News combines News and Blog, with Data, AI & Machine Learning, Technology, Careers and Mettelo topics. It supports search, type/topic filters, bounded pages of 12, a lead story, article cards, readable article pages, related stories and useful empty/error/404 states.
- `/admin/news` is the editorial desk for the existing verified website/project administrators. It lists the latest 500 records, searches title/topic and filters draft/published status. `/admin/news/new` creates an article; `/admin/news/[id]` edits it.
- Editors supply title, summary, article body, type, topic, byline, stable URL slug, optional HTTPS cover image with mandatory alt text, and optional source attribution. Covers use an editor-supplied image URL; file uploads and an image library are not implemented.
- Body formatting supports paragraphs, section headings, lists, quotations and HTTPS Markdown links. The preview uses the same renderer as the reader page. Raw HTML is escaped, never rendered as executable article markup.
- Draft edits and published content are separate snapshots. Save draft never updates the published snapshot. Publish explicitly validates and copies the saved draft. Unpublish removes public visibility while retaining the draft. URLs are locked after first publication. Revision checks reject stale edits; client-generated article IDs prevent a retry from creating a second article under another ID.
- Publishing buttons require a saved draft and an explicit in-page confirmation. The editor protects unsaved changes on navigation and preserves text after errors. It provides writing helpers and a private preview, not a publicly readable draft link.

## Sharing and metadata

Each published article has LinkedIn, X, Facebook and WhatsApp share links, copy-link feedback and native sharing where the browser supports it. These are user-operated links: no connected social accounts or automatic posting.

Sharing uses the final canonical `https://mettelo.com/industry-news/[slug]` URL. That URL is not available on the live site until the separately approved release. The generated branded social image at `/industry-news/[slug]/opengraph-image` is 1200×630 PNG. Article metadata includes Open Graph, Twitter card, canonical URL and escaped NewsArticle/BlogPosting JSON-LD. Draft/unpublished articles have no publicly readable article or social image. Staging remains noindex.

## Storage and permissions

Applied only to Mettelo V2 Staging (`jxijdjmjuzslmjxolhjl`), recorded migration `20261104102746_website_industry_news.sql`.

`private_website_news.articles` stores editorial snapshots, revisions and timestamps. `private_website_news.audit` records actions and actors. Both have RLS enabled with all direct anon/authenticated table access revoked. Public reads are projected through `website_news_public`; the reader code always uses an anonymous client, including when the browser belongs to an administrator. Drafts, author account IDs, audit data and internal revisions are not returned publicly.

`website_news_admin` delegates to a private function that checks `auth.uid()`, verified email and the existing `private_website_lab.admins` table for every protected action. The API also enforces the approved origin, input size, field bounds and action/revision validation. No service key is sent to a client and no new person was granted admin access.

Security advisors show two expected new INFO findings for RLS-without-policies on these private tables: direct access is deliberately denied and guarded functions own access. Existing WARN counts remain one anonymous-function warning, four authenticated-function warnings and one leaked-password-protection warning; none identifies the new news schema. Existing release-review findings remain. [Private RLS advisory](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

## Verification performed

- TypeScript and all 80 member tests passed, including six new article validation, sharing/filter and safe-rendering tests.
- Public build/check suite, four catalogue tests, two packaging boundary tests and static-output inspection passed. The public package contains no member source, schema, private inputs or environment files.
- `tests/news-editorial.staging.sql` passed against actual staging with rolled-back fixtures. It covers private drafts, publication validation, public field projection, saved/live separation, stale revisions, immutable published slugs, duplicate slugs, unsafe URLs, unpublishing, 12+1 pagination and denial of non-admin/anonymous editor or direct-table access.
- Authenticated browser workflow passed: create draft, private preview, save, publish, edit/save while the public title stays unchanged, unpublish, public 404, restore and republish. Copy-link feedback, topic filtering, no-results search, admin status filtering and the mobile menu were exercised. No external social post was submitted.
- HTTP checks: a saved private draft returned 404; anonymous admin writes and unrelated origins returned 403. Published article metadata and one 1200×630 PNG social image were checked. The same public routes, missing-article 404 and image route passed against the local optimized server.
- Public layouts were inspected at 320, 390, 768 and 1440px. The admin editor and private preview were inspected on desktop and phone; horizontal overflow was checked. Desktop/mobile public and admin screenshots plus the generated social image are in the continuation chat's outputs directory.
- An optimized Next.js 15.5.28 build passed with Node 22.23.4 and `METTELO_BUILD_CHECK=1 next build --turbopack`. A local `next start` smoke server used this build on port 3005, with staging data. This was not deployment. The earlier standard Webpack directory-creation EPERM issue was reproduced during development; the alternate compiler provided a working browser preview and optimized build. The default `npm run build` still selects Webpack and was not changed: its final environment/CI verification remains a release task.

## Preview and release boundary

The integrated local preview now uses the canonical 3001 runtime for News, public API bridges and account/project links; the explicitly enabled isolated preview uses 3004. Start both surfaces with root `npm run preview` after the static build. News reader requests forward no cookies. Generated production account links retain their release boundary. See `V2-INTEGRATED-TESTING-2026-11-04.md` for the later integration checks and current gaps. Preview and smoke servers were stopped after verification.

Static-only hosting cannot serve admin-published articles. The static package includes an honest availability page for `/industry-news/`; it is a fallback, not a second publication store. Before release, route `/industry-news` and its descendants, framework assets and the logo to the Node runtime on the agreed public origin. Complete the broader existing member-runtime/database/auth release work, verify the final build pipeline, set reviewed indexing/canonical settings, include published articles in the production sitemap and test public crawler access/social previews from outside this computer. No Hostinger or production routing was changed here.

Three synthetic preview articles remain in staging: the two records in `tests/seed-news-preview.staging.sql`, and the browser-created article `4979306f-8a2a-4692-a5dd-ea42eb5dddce` (`from-data-to-a-decision-start-with-the-question`). Their summaries/bodies explicitly identify them as staging demonstrations. They are not current-event reports. Replace/unpublish them before real editorial release; the migration does not seed production content.
