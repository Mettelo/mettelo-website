# Hostinger waitlist handover

PHP/HTML hosting and hello@mettelo.com were confirmed by the owner. No deployment, mailbox login, DNS or domain changes have been made.

## What is implemented

The homepage form sends JSON to /waitlist/index.php. PHP validates name, email and affirmative launch-update consent, rejects the honeypot, enforces an explicit origin allowlist and sends a plain-text notification through PHP mail() to hello@mettelo.com. It does not send from the visitor's address, expose credentials, create accounts or write names/emails to a website database or local file. Submissions are received in the mailbox; this is not a subscriber-management or bulk-email system. PHP accepting a message into its queue does not establish inbox delivery.

Abuse controls allow three attempts per network per fifteen minutes and ninety total daily attempts. Exclusive locking prevents concurrent counter races. Counter state contains a secret, keyed hashes of network addresses and counts/timestamps. Entries are pruned after a day on the next submission; idle files remain until another request or administrator cleanup. The counter folder is outside public_html and uses restrictive permissions. Backups and host logs may have separate retention requiring review. Limits can affect people sharing a network. No automatic deduplication is provided; inbox administrators must manage duplicate requests and withdrawals.

## Before enabling

1. Approve operator identity, waitlist purpose, collection notice, retention/deletion, withdrawal process and complete privacy information. The draft collection notice is not a finished Privacy Policy. Replace its draft wording with the approved version.
2. Confirm PHP 8.1+ and PHP mail() availability in the chosen Hostinger hosting account. Configure the confirmed hello@mettelo.com sender/mailbox according to Hostinger's instructions. Do not put mailbox passwords in the website.
3. Upload public website pages/assets plus waitlist PHP files into public_html. Never upload work/, .git/, outputs/, scripts/, shared/header.html, shared/footer.html, tests, docs or internal review files. shared/public.css IS a public asset and must be included. No new build system is required.
4. Verify the config.php origins match the actual HTTPS domain. For a temporary Hostinger preview, add only that exact trusted HTTPS origin. Set storage to a private writable absolute directory outside the document root if the default parent location does not suit the account. Never place rate state in a publicly served folder.
5. After approved notice and configuration, set enabled=true in waitlist/config.php. Test a controlled submission using an address you own; verify receipt in hello@mettelo.com, spam folders and any bounce. Check server rejection paths and disable again if delivery fails. No real mail was sent during local automated tests.
6. Test /start/ and every directory route on the actual Hostinger preview. /start/ is unlisted and noindex, not password-protected. Do not promote it in the public sitemap/navigation.

## Preview and failure behaviour

enabled is false by default. The local static preview responds with available:false; it does not execute PHP or accept data. The form stays disabled with an honest status. A successful live response is shown only after PHP mail() accepts the request. Network failures never produce a success message. No submitted data is stored in localStorage or sent to external form providers. The existing onboarding checklist's localStorage behaviour is unchanged.

## Hosting references

- https://www.hostinger.com/support/1583214-how-to-add-a-website-in-hostinger/
- https://support.hostinger.com/en/articles/6976044-parameters-and-limits-of-hosting-plans

Hostinger documents plan-dependent technologies and sending limits. Verify account-specific limits before enabling; the local limit is not a provider quota reservation. A production smoke test remains required.
