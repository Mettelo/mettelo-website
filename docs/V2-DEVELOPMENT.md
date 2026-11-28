# V2 development foundation

1 November 2026. First branch: codex/v2-foundation, based on website cc3ec101e745ed2b5cceea5d8527547b2b1f6ed9. Platform extraction source: 4c80cec7d0a6cf6614ec9d0ed0af1e6beaac347f. Record any newer verified baseline before transferring code.

## Current deployment boundary

Authenticated Hostinger inspection confirmed mettelo.com uses GitHub main, root ./, framework Other, Node 22, npm run build and static dist output. Main auto-deploys; never merge or push development changes there without production release approval. The hostinger-release workflow is a separate packaging alternative, not the selected live source. forms.mettelo.com remains a separate PHP service.

Keep the root website static and its public-file allowlist intact. Future apps/member will be a separate Next.js application with its own lockfile and Hostinger deployment. Do not make it a root npm workspace without reviewing the effect on the existing Hostinger install/build. No member app exists yet. No public navigation or runtime behaviour changed in this foundation.

## Safe local checkout

Use Node 22 (Hostinger) or 24 (existing website CI). Use the committed lockfile. Text files use LF through .gitattributes; images retain their original bytes. Existing Windows global autocrlf can make exact shared-markup checks fail in an older checkout. Preserve unrelated work and use a clean checkout with core.autocrlf=false rather than regenerating public pages to disguise a checkout issue.

Run npm ci, npm test, npm run test:packaging, npm run build and npm run check:static-output. The packaging test uses temporary synthetic fixtures and makes no network requests. The output check rejects PHP/server source, private/configuration paths and unexpected file types. It is separate from check-all because dist does not exist until after a successful build. It is a path/type boundary check, not a full secret scanner.

The V2 foundation workflow runs these checks on PRs/manual dispatch for Node 22 and 24 with read-only permissions. It has no deployment step. External Hostinger PR previews may still be created when a PR opens; inspect external settings before pushing/opening the first V2 PR. This workflow does not establish member authentication or database acceptance.

## Data and environment separation

Production platform project: aconptuqupsgznyrxhrh. Approved separate test project: jxijdjmjuzslmjxolhjl (Mettelo V2 Staging), eu-west-3, created at quoted $0/month. References are routing metadata, not secrets. Do not use production credentials/data for staging.

The new staging project is healthy but has not received application schema, fixtures, Auth configuration or Hostinger integration. Reuse reviewed canonical platform migrations and isolated preparation logic; prove replay before calling staging production-equivalent. Existing docs asserting the canonical baseline is absent are historical; current source contains hosted baselines and supabase/config.toml.

Private Tally data belongs only in approved private onboarding storage, never this public repository, static files or test fixtures. Do not commit CSV exports, private manifests, real .env files, service keys or user tokens. .gitignore prevents common accidental staging but is not an access control or replacement for reviewing a diff. The private_data location convention is /private-data/ and is never packaged.

The authorised private onboarding import was performed earlier through Supabase. Before implementing its claim contract, retrieve the applied schema migration and version its exact DDL in the agreed canonical migration location; never export member rows into Git. No new database migration is included in this foundation.

## Next slices

1. Prepare/verify the isolated staging schema and synthetic fixtures; configure test Auth/email callbacks.
2. Extract account/session/identity helpers and complete verification/recovery journeys.
3. Repair profile merge/concurrency behaviour; build verified-email-only private Tally prefill.
4. Transfer all 50 static briefs/search/detail and preserve existing Tally interest/reviewer flow.
5. Transfer appropriate public content/member home; implement launch-gated email delivery, test and pilot.

No native project application tracker, Lab or public member directory in V2. Email remains disabled until the accepted release passes production smoke checks. Roll back this foundation through a focused Git revert; no data changes need reversing.
