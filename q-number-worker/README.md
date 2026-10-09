# Quantum Q# API

This Worker issues stable, unique Q# identifiers per browser installation using Cloudflare D1. It stores only a random installation ID and creation timestamp. It does **not** store names, emails, phone numbers, or client IP addresses.

## What a Q# means today

- A Q# is a Quantum service identifier, formatted as `Q# 00000001`.
- It is **not** a telephone number and does not enable calls, SMS, emergency calling, mobile data, or carrier routing.
- The current identity scope is one browser installation. Clearing site data or switching devices can create another installation ID. Verified accounts, cross-device recovery, account linking, and identity dispute handling are not implemented yet.
- IDs are allocated by the database, never fabricated in the browser. The D1 unique constraint and `INSERT OR IGNORE` make repeated requests for the same installation idempotent.
- Do not expose a lookup endpoint that returns personal data for a Q#.

## Deploy

1. Install the Cloudflare Wrangler CLI and authenticate with the account that will own the service.
2. Create a Cloudflare D1 database named `quantum-q-number`.
3. Copy `wrangler.toml.example` to `wrangler.toml`, replace the D1 database ID, and confirm `ALLOWED_ORIGIN` and `ALLOWED_HOSTNAME` exactly match the deployed web app origin/hostname.
4. Apply `schema.sql` to the database, for example: `npx wrangler d1 execute quantum-q-number --remote --file=q-number-worker/schema.sql`.
5. Create a Cloudflare Turnstile widget for the web hostname. Put its **public site key** in `quantum-config.js` as `turnstileSiteKey`. Configure the **secret** only as a Worker secret: `npx wrangler secret put TURNSTILE_SECRET`.
6. Set `apiBase` in `quantum-config.js` to the deployed Worker origin, with no trailing slash.
7. Deploy the Worker from this directory: `npx wrangler deploy --config q-number-worker/wrangler.toml`.
8. Verify `GET /healthz` from the allowed origin and test a new installation, a repeat request, a failed Turnstile token, an invalid origin, and a database outage.

## Production requirements before broad public launch

- Configure Cloudflare rate limiting / WAF rules for `POST /v1/q-number`, monitor abuse and D1 quotas, and alert on elevated errors.
- Add account authentication and recovery before claiming one number per human or supporting number ownership transfer.
- Define retention, deletion, moderation, abuse reporting, and support processes.
- If Q# is to route real calls or texts, integrate a licensed communications provider and implement consent, verification, number portability, emergency-calling policy, and regulatory review. This repository does not implement those telecom functions.
- GitHub Pages hosts only the static web app; it cannot run this API itself. A separately deployed Worker and configured D1 database are required.

## API

- `GET /healthz`: readiness status; no user data.
- `POST /v1/q-number`: JSON `{ "installId": "<random browser installation UUID>", "turnstileToken": "<one-time challenge token>" }`; returns `{ "qNumber": "Q# 00000001", "status": "assigned", "scope": "browser-installation" }`.
- Exact-origin CORS allowlist. Turnstile verification is mandatory. No personal details are returned.
