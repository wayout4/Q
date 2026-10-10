# Q# secure messaging architecture and release gates

## Security target

Q# is an application identity, not a phone number, SIM credential, or carrier identity. Messaging must work over ordinary authenticated data transport (HTTPS/WebSocket or an audited messaging protocol) and must not require a specific radio generation.

Do not claim that Q# messaging is secure or end-to-end encrypted until implementation and independent review meet every release gate below. The existing Worker/D1 implementation documented in README stores message bodies as readable text and is not suitable for sensitive messages.

## Required design

1. **Cryptographic protocol:** use an established, independently reviewed end-to-end messaging protocol/library rather than inventing cryptography. Use audited platform cryptography and established key agreement/signature primitives. Never write custom cipher, key exchange, or random-number generation.
2. **Key lifecycle:** generate private keys on the user's device; private keys and plaintext never reach the service. Verify contact identity with safety numbers/QR or equivalent authenticated key verification. Detect key changes and warn before sending.
3. **Transport:** TLS with certificate validation; no insecure fallback. Authenticate APIs, rotate/revoke device credentials, rate-limit registration and sends, and avoid secrets in URLs/logs.
4. **Delivery:** opaque ciphertext only at the server; message IDs and idempotency keys; bounded retries with jitter; duplicate suppression; delivery receipts that disclose minimal metadata; explicit offline queue expiry and deletion.
5. **Recovery:** document multi-device enrollment and account/device recovery without silently weakening E2EE. A server reset must not impersonate a user's cryptographic identity.
6. **Abuse and privacy:** block/report controls, spam throttling, minimal metadata retention, deletion policy, security contact, threat model, dependency scanning, SBOM, and incident response.
7. **Client safety:** protect local keys using platform secure storage (Android Keystore / iOS Keychain); apply strict Content Security Policy; minimize WebView bridge scope; prevent cross-origin navigation; never put bearer tokens in URLs.

## Required tests before release

- Independent cryptographic/security review and threat-model sign-off.
- Two or more independent devices exchange messages while server logs/database contain ciphertext only.
- Verify no plaintext/private key in network traces, API logs, analytics, backups, crash reports, or server storage.
- Key-change, revoked device, lost device, recovery, replay, duplicate send, and account-takeover tests.
- TLS failure, offline, reconnection, HTTP 429/5xx, expired credentials, and malicious payload tests.
- Fuzz parsers and validate dependency/license/security scanning.
- Publish a clear security specification and known limitations.

## Current status

Architecture and release criteria only. No claim is made that these gates are implemented or passed. Do not migrate real users or sensitive data to the current plaintext messaging service. A production rollout requires a selected audited protocol, implementation, external review, controlled migration, and authorized infrastructure configuration.
