# Waitlist delivery verification — 21 October 2026

Production endpoint: https://forms.mettelo.com/index.php, PHP 8.3, valid HTTPS.
The main site remains a static Hostinger web app. The PHP service is independently
hosted in the forms subdomain document root; do not overwrite it with web-app releases.

Basic PHP mail() returned false and was replaced with the authenticated Hostinger Mail
API. Notifications send from no-reply@mettelo.com to hello@mettelo.com. A labelled
non-subscriber deployment test returned 202 and was received in the destination inbox
(UID 149). Consent confirmation and timestamp are included in each notification.

The active API token is scoped only to no-reply@mettelo.com. Its full value was copied
directly into a private owner-readable file outside public_html and never committed.
Two earlier setup tokens were kept at the owner's explicit request.

The service retains validation, exact allowed-origin checks, CORS preflight handling,
honeypot, per-network/global rate limits and private hashed abuse counters. Transport
status logs contain only numeric status/error codes and timestamp. No form details
are stored in server files; submissions are managed in the destination mailbox.

All nine website checks and PHP validation/abuse tests pass. Verify the public form
after the automatic website redeployment; code success alone is not inbox delivery.
