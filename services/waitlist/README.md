# Hosted waitlist endpoint

Deploy these PHP files to the document root of forms.mettelo.com. Requires PHP 8.1+ and cURL. Keep config.php disabled until verified. The production copy was enabled after authenticated mail delivery was confirmed.

The API token is installed privately outside public_html in .mettelo-mail-token with owner-only permissions. No token is in this repository. Token scope is only no-reply@mettelo.com; notifications go to hello@mettelo.com.

Origin checks permit only https://mettelo.com and https://www.mettelo.com. No cookies or credentials are sent cross-origin. Honeypot, input validation and per-network/global rate limits remain active. Abuse counters and numeric transport status are stored outside the public folder; no names, email addresses or tokens are written to those files.

This independent endpoint is not overwritten by the main site's web-app deployments. Update it separately when PHP service files change.
