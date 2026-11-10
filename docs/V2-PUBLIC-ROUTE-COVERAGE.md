# V2 public route coverage — 4 November 2026

**Scope reset — 4 November 2026:** The owner has superseded automatic platform feature parity. This is a historical reference, not a requirement to build or accept every old route. Current decisions and real release gaps are in [V2-SIMPLIFICATION-AND-GAP-PLAN-2026-11-04.md](V2-SIMPLIFICATION-AND-GAP-PLAN-2026-11-04.md).


Every route from the required platform inventory is accounted for. **No complete-transfer or release sign-off.** Implemented means a website implementation exists. Mapped means an alternate destination exists and equivalence/legacy routing still needs acceptance. Missing means no equivalent implementation. All owner acceptance remains pending; missing items are not silently deferred.

Current inventory: 46 routes; {"implemented":9,"mapped":10,"missing":27}. New website-only pages include Industry News, member Career resources and Lab; these do not remove unrelated source requirements.

| Platform route | Status | Website destination | Remaining acceptance |
| --- | --- | --- | --- |
| / | implemented | / | Refreshed website homepage; owner content acceptance remains open. |
| /about | mapped | /our-story/ | Website story exists; source content equivalence and legacy URL redirect are unaccepted. |
| /activity | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /blog | mapped | /industry-news?format=blog | New editorial blog filter exists; legacy /blog redirect and content migration are unaccepted. |
| /blog/[slug] | mapped | /industry-news/[slug] | New article route exists; legacy slug mapping/content migration is unverified. |
| /careers | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /careers/[slug] | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /careers/applications | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /collaborate/[id] | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /community | mapped | /start/ | Unlisted onboarding and external community channels; no equivalent community application. |
| /community-guidelines | implemented | /community-guidelines/ | Website guidance exists; policy/content acceptance remains open. |
| /contact | implemented | /contact/ | Public contact form and restricted admin inbox; current rollback acceptance recorded. |
| /contribute | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /credentials/[credentialId] | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /events | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /events/[slug] | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /faq | mapped | /#faq-title | Homepage FAQ section; dedicated legacy route is absent. |
| /feedback | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /join | mapped | /signup | Website signup entry; legacy route and hosted email acceptance remain open. |
| /media | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /membership | mapped | /signup | Account creation does not replace every source membership-page behaviour. |
| /mentors | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /newsletter | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /newsletter/preferences | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /opportunities | implemented | /opportunities | Runtime listing/filter/search/pagination/save; freshness and hosted acceptance remain open. |
| /opportunities/[id] | implemented | /opportunities/[id] | Retained detail route; listing cards now use safe direct external application links. |
| /organisation | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /organisations | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /partnership | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /people | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /people/[id] | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /privacy | implemented | /privacy/ | V2 public policy exists; production policy release is separate. |
| /project-architect | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /projects | implemented | /projects/ | 50 project briefs with search/facets; sourced metadata and packaging checks pass. |
| /projects/[id] | mapped | /projects/[projectRef]/ | Static reference-based details exist; source UUID/bookmark mapping remains unverified. |
| /projects/master/[id] | mapped | /projects/[projectRef]/ | Briefs link to master GitHub repositories; no equivalent legacy master route. |
| /projects/paths | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /projects/paths/[slug] | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /proof/[id] | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /search | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /showcase | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /signin | implemented | /signin | Website sign-in and safe return destination; hosted auth acceptance remains open. |
| /spotlight | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /spotlight/[id] | missing | — | No equivalent website page/data/form journey has been transferred. Required inventory item; no deferral inferred. |
| /submitted | mapped | /member/projects/[id]/interest | Specific project-interest receipt exists; generic source form confirmations are not transferred. |
| /terms | implemented | /terms/ | V2 public terms exist; production policy release is separate. |

Machine-readable source: content/v2-route-coverage.json. Run node scripts/check-route-coverage.mjs to check coverage/evidence and node scripts/check-route-coverage.mjs --require-complete for the deliberately stricter release gate. Presence of unaccepted or missing work causes the latter to fail.

Career-resource access now has a verified-account page at /member/resources, reached from the public preview through sign-in. The existing Start Here guide remains unlisted/noindex. External OneDrive permissions/content availability require owner verification; the website neither grants access nor copies library documents.
