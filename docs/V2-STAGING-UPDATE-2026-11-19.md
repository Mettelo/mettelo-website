# Staging update · 19 November 2026

This update carries the current reviewed public, member and administrator experience into protected staging. It is not a production release or approval to merge into main.

## Included changes

- Refined member home, Connect feed/discovery, portfolio and selected-summary sharing, Lab navigation, chat, meetings and contribution presentation.
- Dedicated administrator project library with create/edit dialogs, content and SEO controls, paginated applications and on-demand team operations.
- Clearer application approval, coordinator agreement and automatic internal Lab readiness, preserving project governance and the shared three-Lab participation policy.
- Separate verified GitHub identity, preserving Mettelo usernames. GitHub sign-in and existing-account linking use authoritative identity records. The organisation app invites ordinary members and checks membership, with no repository permissions.
- Private server credentials remain outside Git, source archives and browser bundles. GitHub invitations use bounded leases, explicit expired-invitation resend and no silent re-admission after organisation access removal.

## Verification

- All 320 member application tests passed on 19 November.
- Public website checks passed, including catalogue, navigation/footer parity, design foundations and form behavior.
- TypeScript checks passed during the GitHub setup verification. The release build is checked separately before deployment.
- The GitHub app installation and isolated staging server key were verified. The existing owner's connected identity and actual organisation membership were confirmed in the local UI; the Mettelo username stayed unchanged.
- A fresh non-member invitation email and acceptance journey remains a testing-team acceptance check. Existing organisation membership does not prove invitation delivery.

## Boundaries

Only staging.mettelo.com and isolated database jxijdjmjuzslmjxolhjl are in scope. Keep operational email delivery and schedules disabled. Keep the new mandatory GitHub eligibility policy disabled until hosted credentials and the fresh-member connection/invitation journey are verified. No payments, production database changes, production deployment, main merge or repository provisioning is included.
