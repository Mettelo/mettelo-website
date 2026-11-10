# Native project interest and source-data guidance

Implemented in the website branch only, 2 November 2026. Platform source remains read-only at 4c80cec7d0a6cf6614ec9d0ed0af1e6beaac347f.

## Transfer and behaviour
- Adapted the platform five-step MemberProjectInterestFlowV3 and its participation terms (2026-09-03-v1). No browser-local draft storage.
- All 50 briefs link to a project-specific protected member form. The same catalogue snapshot is bundled inside the independently hosted member app; the catalogue generator refreshes it and a parity test prevents drift.
- Verified account and username required. API validates canonical project/role, field sizes, HTTPS portfolio link, current terms and configured request origin. Duplicate submission returns the existing receipt.
- Members can view only their own receipts. These are interest requests, without automatic selection, team placement, capacity, start-date or approval claims. Contact support to amend/withdraw; no self-service withdrawal or admin review console has been transferred yet.
- Registry and owner-only interest tables were migrated to website STAGING only. The registry contains 50 public brief definitions. No real application was submitted during this work.

## Project pages
Redesigned all 50 detail pages with a clear challenge, source/reuse section, capability and role sections, and interest sidebar. Added a data-use rules page. Read public data/README.md and project/GOVERNANCE.md from the master repositories: 45 data guides and 40 governance guides verified. Missing guides are explicitly unavailable. Recorded document URLs and source SHAs in content/project-source-guidance.json. No dataset files or restricted links copied; no dataset licence inferred from public availability. Current master requirements take precedence over the catalogue snapshot.

## Verification
- Public build and its route/content/asset checks passed; catalogue tests 3/3.
- Member typecheck passed; existing member tests 17/17 passed.
- Browser traversed all five steps and opened full terms; stopped without accepting or submitting terms on the real staging account.
- Staging transaction with two synthetic users proved owner insert/read, cross-user insert rejection, cross-user read isolation and invalid-role rejection. Transaction rolled back.
- Browser revealed an external JSON resolution problem; fixed by generating an identical member-local snapshot and verified the form renders.

## Release still pending
No push or deployment. Public production links retain the member-access availability fallback; local preview alone routes to port 3001. Separate website production database and member hosting, production Auth/SMTP configuration and end-to-end submission/receipt acceptance remain required. Member production build was not re-certified in this change (earlier Windows build permission blocker remains). This does not mark V2 complete.
