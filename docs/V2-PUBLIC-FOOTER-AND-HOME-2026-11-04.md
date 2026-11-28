# Shared public footer and Home icon correction — 4 November 2026

Owner direction: the top house icon opens the public website homepage. All public website pages share the same footer.

Implemented:
- Member workspace header, static signed-in public header and News header house icons now open the public homepage, labelled Public homepage. Existing sidebar Home and account Member home destinations remain member navigation.
- shared/footer.html and shared/footer.css are the canonical public footer. A sync step updates all retained static public page shells and the runtime snapshot/styles. News, Opportunities, Contact, public policy redirects and account-entry pages use that same footer content/style. Member workspaces and restricted administration keep their compact operational footers.
- Footer groups, social links, branding and legal copy are identical. Only existing account-aware destinations/labels adapt to sign-in state. No new public pages or member-home modules were introduced.
- Static packaging includes the shared footer stylesheet. A parity check prevents drift across all 60 public HTML pages and runtime snapshots/styles. Mobile spacing accounts for the existing signed-in bottom navigation.

Verification: static build and all existing public checks passed; shared-footer parity passed for 60 pages. Optimized application build/type validation passed. Integrated HTTP checks passed 94/94. Browser verified the member-header house icon by clicking through to :3002/, checked News/Opportunities/Contact/policy/catalogue footer coverage and mobile width without horizontal overflow. Screenshot proof saved in the chat outputs.

Scope: local preview only, no production push/deployment, no database migration and no email sent. Hosted multi-account journey acceptance remains a separate release gate.
