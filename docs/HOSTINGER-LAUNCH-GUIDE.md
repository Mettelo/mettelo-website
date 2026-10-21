# Hostinger launch: step by step

This website uses ordinary HTML/CSS/JavaScript with a PHP waitlist handler. Use the Hostinger PHP/HTML hosting option already selected. Membership remains on Tally. No database installation or website-builder conversion is needed.

## 1. Prepare the account and review package

Sign in to Hostinger yourself. Keep passwords and recovery codes private. Have the latest approved upload ZIP, access to hello@mettelo.com, and a backup of the existing website and DNS records. Complete the legal/operations review and approve the launch package before using it on the public domain.

## 2. Create a preview website first

In hPanel, open Websites, choose Add website and select Custom PHP/HTML. Use a temporary domain where offered. If your account already has the correct empty PHP/HTML website, reuse it. Do not replace an existing live website or remove another service to create a preview. Menu wording can vary by plan.

## 3. Open the correct website's File Manager

Open the dashboard for the preview website, then Files → File Manager. Open its public_html directory. Confirm this is the preview website, not the live domain or another project. Download a backup of any existing files before replacing anything. Move an existing default index page into a private backup location rather than deleting it blindly.

## 4. Upload and extract the ZIP

Upload the approved Hostinger ZIP and extract it. index.html must sit directly inside public_html, alongside assets/, start/, our-story/, community-guidelines/, terms/, privacy/, contact/, shared/ and waitlist/. It must not be buried in another containing directory. Preserve folder names and filename case. Do not upload the repository's .git, scripts, tests, docs or internal review notes. Remove the uploaded ZIP from the served directory after confirming extraction; keep your local backup.

## 5. Check PHP and HTTPS

Select a currently supported PHP release compatible with PHP 8.1 or later; this project's local handler checks used PHP 8.5. Verify HTTPS works on the preview before entering personal data. The site needs no PHP database extensions. Keep normal Hostinger security protections enabled.

## 6. Review every preview route

Open /, /our-story/, /community-guidelines/, /terms/, /privacy/ and /contact/. Check logos, portrait, navigation, footer and mobile menu. Open /start/ directly and test its checklist; it is intentionally absent from public navigation. Verify existing membership/project forms, OneDrive library, workshop form and social links. Test on a phone as well as desktop. Check for broken images and missing CSS after extraction.

## 7. Configure and verify waitlist delivery

Keep waitlist/config.php enabled=false initially. Confirm hello@mettelo.com can receive mail and the sender identity is authorised by Hostinger. Review Hostinger's mail settings/limits; no password belongs in the public website files. Update config.php origins with the exact HTTPS preview origin for testing. Ensure its private abuse-counter directory is writable and outside public_html; adjust the storage path if the account layout differs. Do not use world-writable permissions.

Once collection/privacy wording is approved, enable the handler temporarily and submit a single controlled request with an address you own. Confirm receipt in hello@mettelo.com and check spam/bounce folders. PHP's queued response alone is not proof of delivery. Check the received name, email, timestamp and affirmative consent record. Test invalid email/unchecked consent, and ensure failures do not show success. Disable the handler if delivery fails. Follow docs/HOSTINGER-WAITLIST.md for more detail.

## 8. Approve the domain switch

Only after the preview passes review, plan the live-domain change. Export existing DNS and identify the records used by email and all other services. Prefer changing only the website records needed for the chosen Hostinger setup. Preserve MX, SPF, DKIM, DMARC and unrelated subdomains. If using nameserver changes, recreate required records first and review the full migration. Take the exact record values from your own Hostinger dashboard; do not copy guessed IPs or nameservers from a tutorial. This guide does not authorise an automatic domain change.

## 9. Verify the live site

Confirm HTTPS, chosen canonical hostname, every route, external integrations and email delivery after DNS resolves. Prepared metadata/sitemap uses https://mettelo.com; verify this is the approved primary hostname before uploading. Set waitlist allowed origins to the actual approved HTTPS hostname(s); remove unused preview origins. Verify search indexing settings: public pages may be indexed, /start/ stays noindex and is excluded from the sitemap. Confirm policy dates match publication. If anything essential fails, use the saved files/DNS record values to restore the previous state.

## 10. Run the operational routines

Monitor hello@mettelo.com, process withdrawal/rights requests, review applications and manage retention across Tally, mail and exported copies. Follow the retention and moderation runbook. Do not assume a public policy automatically changes provider settings or deletes existing records. Complete any required provider agreements, regulator registrations/representative assessment and transfer safeguards separately.

## After launch: membership integration planning only

The next-phase proposal is an on-site membership form followed by approval and appropriate resource access. Do not replace Tally during this launch. Decide minimum fields, consent/notices, secure storage, access roles, approval/rejection workflow, notifications, retention and migration before implementation. Emailing a membership application is not authentication and cannot securely grant restricted resources. Keep public and member-only resources distinct. Reassess the existing separate Mettelo Platform architecture before creating another member system.

Official guides checked 21 October 2026:
- https://www.hostinger.com/support/1583214-how-to-add-a-website-in-hostinger/
- https://www.hostinger.com/support/how-to-upload-a-website-from-backups/
- https://www.hostinger.com/support/1869164-how-to-upload-backups-with-ftp-in-hostinger/
