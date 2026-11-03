# Platform email template transfer

Source: Mettelo/mettelo-platform, revision 4c80cec7d0a6cf6614ec9d0ed0af1e6beaac347f, `supabase/templates/auth/` and `scripts/sync-supabase-auth-templates.mjs`.

All 13 Auth HTML templates are preserved in the website repository. The original layout, copy, security notices and template variables remain. Public header/footer destinations use https://mettelo.com/; logo sources use the website's existing /assets/logo-navy.svg and /assets/logo-sand.svg (both returned HTTP 200 with image/svg+xml). These public brand links do not carry authentication tokens. Email-client SVG support varies; image alternative text remains Mettelo.

Applied to V2 staging: signup verification and password recovery, with the original platform subjects. Their action buttons retain `{{ .ConfirmationURL }}` so Supabase preserves the app's callback flow. Other templates are copied for future features; security-notification switches are left unchanged. Operational project/application emails and notification-outbox logic are outside this account-email transfer.

Target is only jxijdjmjuzslmjxolhjl. Platform production, public website deployment, SMTP credentials and redirect settings are unchanged. `scripts/sync-staging-auth-templates.mjs` validates locally by default; explicit --apply requires the exact staging ref and a management token. It only updates signup/recovery subject/body fields and verifies readback. No secrets belong in repository files.

Acceptance: saved subjects and source persist on reload; Supabase template variables remain intact; local validation passes; a single controlled recovery email renders the branded design and keeps the expected callback destination. Signup delivery using a fresh account, broad email-client compatibility and hosted/mobile callback testing remain separate checks.

Verified on 1 November 2026: recovery subject/body persisted after dashboard reload; a controlled email reached the approved test Gmail inbox with the platform's card, logo, button and security notice. Its button still targets the staging Supabase recovery endpoint and the configured /auth/callback recovery flow. Signup subject/body were saved separately; fresh signup email delivery remains pending. Public packaging checks and local template validation passed. No new notification switches were enabled.
