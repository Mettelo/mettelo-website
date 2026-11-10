# Prepared batch operations

The local development command apps/member/scripts/opportunity-pipeline.mjs supports prepare, inspect RUN_ID, run RUN_ID and expiry. It uses the installed TypeScript development compiler. This is not a production scheduler or public endpoint.

Prepared batches are stored under ignored private-data/opportunity-runs. Creation refuses overwrite, UUIDs prevent path traversal, and SHA-256 detects later content modification. This integrity check is not a signature against a malicious local editor. The file holds public candidate details, not credentials. Each dispatch records a separate receipt; database run history remains authoritative. A partial receipt after a crash must not be treated as completion.

On Windows the initial receipt rename failed with EPERM. Receipts now use separate exclusive files rather than replacing a current receipt. Tests verified persistence, overwrite refusal, integrity failure and a readable uncertainty receipt. TypeScript and seventeen tests passed. No database mutation was performed in this slice.

Private configuration file apps/member/.env.pipeline.local is ignored and has an empty server-key slot. Owner must enter the existing Mettelo V2 Staging server/secret key there, never the platform key. Do not paste it into chat. The runtime only accepts the exact staging project URL. It has no production target or schedule.

For an authenticated run from apps/member use Node's --env-file=.env.pipeline.local option with scripts/opportunity-pipeline.mjs. Prepare and inspect first, then dispatch the saved run ID only when the agreed staging data scope allows it. Expiry is a separate retry when publication has committed. No real-feed publication has been performed or inferred from this configuration.

Outstanding: configure credential, test authenticated provider-to-database-to-public-feed path under controlled staging scope, finish persisted source-verification/quality adapter, verify production build/hosting and scheduler. Existing platform data and live website remain unchanged.
