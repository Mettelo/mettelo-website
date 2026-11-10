# Homepage refinement — 4 November 2026

Local preview implementation only. No production deployment, email or account-data changes.

- Kept the existing Projects → Learning → Community → Career order.
- Shortened project summaries, made Read brief the leading card action, used Job Board consistently, simplified FAQs and removed the repeated GitHub link from Learning.
- Reduced section, presenter and ecosystem spacing; corrected sticky-header anchor clearance.
- Replaced workshop text artwork with real recording thumbnails, publication dates and Watch recording controls. Short privacy wording links to the policy.
- Added /api/workshop-recordings to the member runtime and its local public-preview proxy. This reads the five user-supplied workshop/event playlist feeds, restricts entries to Mettelo channel UCrxDi-Zsbmm4ECrDZP7y1yQ, deduplicates across playlists and chooses the two newest valid published entries, caches successful results for 15 minutes and retains cached results on failure. Cold failures preserve the two curated homepage recordings. A one-minute retry backoff avoids repeated outage requests.
- The browser checks the feed when the page opens. Playback is created only after Watch recording is selected. Thumbnails are requested through the same-origin endpoint; arbitrary thumbnail IDs are rejected.
- Default playlists: PLWLTzaIhYph8 (GitHub), PLVyJ84XZhrBQ (Power BI), PLKkjuiMd8lVw (Community Events), PLPHLFThLRBdc (Data Engineering & Cloud), PLMrB4zLYtFRg (Career Development). All five feeds returned HTTP 200. Optional server setting METTELO_YOUTUBE_WORKSHOP_PLAYLISTS accepts comma-separated IDs; the earlier singular setting is also supported. Channel uploads outside these playlists are excluded. If any playlist cannot refresh, retain the previous combined selection.
- At hosted staging/release, route /api/workshop-recordings (including thumbnail queries) to the member runtime, just as other public/runtime integrations need routing. A static-only Hostinger upload alone retains the curated recordings rather than live updates. Do not release until this bridge is verified.

Validation: static build and public checks passed; member TypeScript check passed; four feed tests cover date ordering, malformed/foreign/future entries, deduplication, entity decoding, caching and outage fallback; 101 integrated preview checks passed. Live metadata and thumbnail HTTP requests returned 200, invalid thumbnail returned 404. Browser verified live titles, dates and thumbnails, iframe creation on click, anchor clearance, and no horizontal overflow at 320 and 390 pixels.

Reference: https://developers.google.com/youtube/data/reference/rest/v3/playlistItems/list (official playlist documentation; this implementation uses the public Atom feed, with no API key).
