# Homepage correction

The owner preferred the earlier dark homepage and compact ecosystem/resource layouts. Restored index.html from the legal-launch-review baseline, retained the corrected Discord invite and added three hero CTAs: Apply for membership, Explore member support and Join the waitlist. The existing waitlist form, release gate, current legal footer and all integrations are preserved.

The editorial stylesheet had changed the ecosystem container to four columns while existing items still spanned three/four columns. Width checks did not catch the resulting extra rows. The homepage now uses its original stylesheet/layout and a small shared/home.css for the three buttons; the supporting pages keep their design improvements. Shared generation explicitly preserves the home-specific dark header/logo and styling exception.

At 1280px, verified navy hero, three CTA buttons on one row, the ecosystem in its original three rows, and the resource directory in its original two-column layout. Browser measurements: ecosystem section 1105px including heading/padding; resources section 781px. These are layout observations at that viewport, not universal limits. Mobile uses stacked CTA buttons and original responsive section layouts. Regression checks cover the stylesheet separation and three CTA destinations.

This correction revises the existing design PR; it does not create a new public page, deploy the website or enable waitlist collection. Use the corrected homepage upload package rather than previous design packages.
