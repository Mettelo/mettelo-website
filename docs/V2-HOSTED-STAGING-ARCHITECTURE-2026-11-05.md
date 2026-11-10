# V2 hosted staging architecture audit · 5 November 2026

## Decision

Prepare a separate protected Node.js application at https://staging.mettelo.com on the existing Hostinger Business plan, conditional on the security follow-up and Linux build below. The account UI confirms Node 22.x and 1 of 5 web-app slots used. The Sabiway VPS remains a fallback; no files, services or settings there were changed.

Update, 16:05 UTC: the separate staging app deployed successfully from commit 98fdfa7 using the source ZIP. Hostinger now uses 2 of 5 app slots. DNS resolves and normal HTTPS certificate validation passed. Five read-only route checks returned the intended 503/noindex/no-store response because staging access credentials are not configured. Shared testing is not yet ready. The live site remains connected to main with automatic deployment enabled. Do not merge the V2 branch into main, redeploy the current live app, or upload the source archive into its public_html.

## Architecture and deployment boundary

The existing production package is static HTML/CSS/JS. The V2 runtime is Next.js 15.5.28/React 19 with Supabase Auth, PostgreSQL RPC/RLS and private avatar storage. Local public preview and member runtime currently use separate ports; that preview bridge is not a hosted server.

Hosted staging serves generated static pages through Next rewrites under one origin, with existing dynamic News, Job Board, API, Auth, member and admin routes left in the runtime. 153 generated rewrites map explicitly permitted static files. The generated _site directory and route manifest are ignored in Git. The static V1 dist package is not rewritten by hosted preparation.

NEXT_PUBLIC_SITE_ORIGIN controls public navigation. Member callbacks require the exact staging hostname plus staging environment identity; unrelated origins and credential-bearing URLs are refused. The database remains locked to jxijdjmjuzslmjxolhjl. Private app routes retain Supabase session checks and database authorization. Site-level Basic access is separate from member identity; passing it grants no member/admin rights.

The staging access gate protects pages, APIs and public assets. A missing gate configuration returns 503; unauthenticated requests return 401. Password hashes stay in host environment variables. No credentials are included in the source package. The staged runtime must run behind HTTPS; no CDN may bypass the runtime gate by serving the generated assets publicly.

## Implemented preparation

- scripts/prepare-hosted-staging.mjs builds a separate public asset tree, activates existing account destinations and keeps internal navigation on staging. Dynamic News/robots/sitemap are excluded from static overrides.
- scripts/staging-preflight.mjs checks project/origins, rejects privileged public keys and sensitive NEXT_PUBLIC variable names, refuses enabled operational email/Google/production SEO settings, and requires runtime site-access configuration.
- npm run staging:build checks configuration, installs locked member dependencies, prepares public assets, builds the app, then copies public and Next static files into standalone output. Packaging refuses .env files in traced output.
- npm run staging:start checks runtime settings and starts the standalone server on the hosting PORT and 0.0.0.0. Never use next dev or the local preview proxy for hosted staging.
- deploy/staging.env.example has placeholders only. Store real values in the new app's hosting environment, not a repository file or upload archive. Public keys and origins are build-time inputs; changing them requires rebuilding.
- .github/workflows/staging-build.yml is manual only, uses Linux/Node 22, reads the staging publishable key from the repository variable METTELO_STAGING_PUBLISHABLE_KEY, and produces a runtime artifact. It has no deployment permission or step. It has not run remotely in this audit.
- scripts/smoke-hosted-staging.mjs makes read-only requests to the exact staging domain. Test credentials are supplied through its environment; no accounts or emails are created. Keep this separate from the normal offline/static check-all runner.

## Hosting settings to review on the new app

Use a separate app and staging branch, repository-root build context, Node 22, installation of root and apps/member dependencies from their lockfiles, build command npm run staging:build and start command npm run staging:start. The app must expose the assigned PORT, not the local preview ports. If Hostinger's selected framework mode fixes its own output/start settings, review those fields before submitting; do not guess or change the live app to accommodate the monorepo. Standalone output is apps/member/.next/standalone, containing server.js, public and .next/static.

## Evidence and remaining gates

147 unit checks, 107 existing integrated HTTP checks, 20 isolated hosted-configuration HTTP checks, TypeScript and static build passed. The hosted-configuration check used a separate local process with the staging origins and an ephemeral site-access password. It tested public pages, access protection, redirects, invalid form validation and origin rejection. It did not establish hosted HTTPS, email delivery or real-browser signup completion. Production dependency audit reported 0 known vulnerabilities; this is not a complete security guarantee.

The Windows production build remains blocked by the earlier EPERM directory-creation issue. No Linux distro or Docker is installed locally. The full production build subsequently passed on Hostinger Linux. Final logs confirm standalone assets prepared with no private environment files, publication and restart. Runtime logs show Next.js ready in 581ms and zero startup errors. Existing Autoprefixer start/end compatibility and Webpack cache warnings remain; these did not fail the build.

Supabase read-only audit: 9 existing accounts; 232 published jobs; 0 public tables with RLS disabled; private website-profile-photos bucket limited to 1 MB WebP; no pg_cron or pg_net extension installed. Application publication and email actions were not invoked. Avatar upload normalizes supported input images and has pixel/size bounds. Existing grants, migrations and role assignments were not changed.

Security advisors still flag 34 private deny-by-default RLS tables, one anonymously executable and five authenticated SECURITY DEFINER function findings, and disabled leaked-password protection. The existing function definitions use empty search_path and self/public-aggregate semantics; this audit did not widen their permissions or certify a full penetration test. Review the advisories before production: https://supabase.com/docs/guides/database/database-linter and https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection.

Hostinger displays 22 findings over 30 days. All 22 detailed paths refer to hometechway.com WordPress files, none to mettelo.com; latest listed findings are 15 October. Hostinger records 6 removed and 16 cleaned, with no discoveries shown on 5 November. This does not establish a current Mettelo infection. Confirm the affected site's maintenance and shared-account isolation before shared UAT or placing privileged server credentials on that account. No remediation, deletion or restart was performed as part of this read-only review.

Before registration testing, add the exact hosted Supabase Auth Site URL https://staging.mettelo.com and redirect https://staging.mettelo.com/auth/callback. Do not use wildcard redirects; retain localhost callback only while the local review remains needed. Auth URL/SMTP configuration has not been changed or independently verified here. Google remains off. Supabase verification/recovery emails are separate from application email switches: use only owner-approved test inboxes when testing those identity flows. No emails were sent during this audit.

Operational project and weekly-pulse emails remain previews/preparation, with sending and schedules off. Meeting delivery has an explicit allowlist and enable gate, which remain off. Hostinger shows daily file backups, but database restore and backup retention have not been rehearsed. Keep real-member import behind the later approved mapping and rollback rehearsal.

## Three-account acceptance checklist

1. Member A: register/verify, complete profile, apply to a project; check receipt/status, notification bell and refresh/back behaviour.
2. Existing authorised administrator: review applications, offer places, designate coordinator and complete team readiness/admission. Verify Operations, Writer and Editor boundaries with controlled fixtures rather than giving test members full access.
3. Member B: complete the same identity/application journey and accept the correct place. Confirm both members see only the appropriate Lab.
4. Lab: chat, task assignment, milestones, review/acceptance evidence, meetings, application-to-Lab next steps, member KPIs and supported project completion.
5. Support/account: private enquiry/reply ownership, profile photo, requested recovery, signout, suspension/restoration and retained work attribution.
6. Public/member menus and footer, direct links, mobile/tablet layout, keyboard behaviour, expired/invalid links, two browser sessions and permission-negative cases.
7. Record Pass / Needs fixing / Blocked per step. Fix and repeat affected cases. Only then rehearse both approved source exports silently; no real notifications or production cutover during UAT.

Official hosting references: https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/ ; https://nextjs.org/docs/15/app/api-reference/config/next-config-js/rewrites ; https://nextjs.org/docs/15/app/api-reference/config/next-config-js/output .

## Actual Hostinger build configuration and pending owner setup

Separate app: staging.mettelo.com. Uploaded archive: mettelo-v2-staging-source.zip, commit 98fdfa7. Deployment ID: 01a1ac72-973f-73fe-bea4-287d60c64a9a. Other framework, Node 22.x, root ./, build npm run staging:build, entry relative to repository root apps/member/.next/standalone/server.js. Other mode logs output directory as none and publishes the source tree; standalone packaging is still validated by the build. Eleven public/non-secret environment values are configured. No service-role or mail-provider keys were uploaded.

The host invokes standalone server.js directly rather than staging:start. The compiled middleware still refuses access with 503 until METTELO_STAGING_USERNAME and METTELO_STAGING_PASSWORD_SHA256 are set. The owner must enter and save the new credential configuration; do not request their password in chat. Then repeat hosted access/routing checks and set the exact Auth callback before test-account registration. This deployment uses an archive, not a new remote Git branch. No Git push or production merge occurred.
