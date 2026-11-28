# Website signup, member panel and profile photos

Owner requested replacement of Tally membership registration with website signup/sign-in, member home after login, and an editable profile photo shown in the top-right account menu.

Membership registration links across static pages, shared navigation/footer, page generators and the resource finder now target website signup. Shared navigation exposes Sign up and Sign in. /signup in the member app opens the existing account-creation journey at /signin?mode=signup. Existing verified-login/onboarding routing still leads to /member. The old Tally membership URL is absent from public HTML and browser scripts. Project interest remains the separate eq4Wjo form until native project submission replaces it; account registration does not replace that application workflow.

Production static files still point account actions to the availability section because member hosting has not launched. The local preview server maps marked signup/signin/opportunity links to the local member app on all public pages. Final production destinations must be set with the coordinated release; no public account launch is implied.

Profile photo flow adapted from platform ProfileEditor, profile/avatar API and MemberAppShell. Website stores a private object path instead of a public avatar URL. Owner-only Storage read/upload/delete policies, private bucket and short-lived signed display URLs keep photos within the member account. Uploads accept JPG/PNG/WebP up to 5 MB, limit body size and decoded pixels, strip metadata, resize and re-encode to WebP. The exact image-processing dependency is pinned. A concurrent photo change cannot be silently overwritten. Photos save separately from text-profile edits, preserving unsaved form values.

The signed-in header shows a top-right thumbnail or initial, name and native account dropdown with Home, Edit profile, Saved opportunities, Support and Sign out. The profile editor provides choose/save/remove controls. The owner's current profile photo was not changed by the agent.

Staging avatar migration applied; schema and existing owner policies were inspected first. TypeScript passed, image encoder loaded, static build checks passed after updating retired-membership-link expectations. New member menu and photo controls were inspected in the signed-in browser and screenshot saved. Actual photo upload/remove and device acceptance remain unverified because the owner postponed further testing. Existing Supabase advisor warnings remain; no new photo-specific finding appeared. Guidance: https://supabase.com/docs/guides/storage/security/access-control.

No production deployment, main push, real opportunity publication or community email performed. The staging-only pipeline credential is still unrelated to this authenticated photo flow, which uses the member's own session and no service key.
