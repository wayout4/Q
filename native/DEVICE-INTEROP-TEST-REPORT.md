# QOS native and carrier interoperability evidence ledger

**Status: NOT YET PROVEN on physical devices.** This file intentionally starts with no passed device rows. Source code or a successful GitHub Pages deployment is not evidence of native radio access, carrier certification, or 6G connectivity.

## Evidence required for each test

For each run record: test ID, UTC timestamp, device model, OS/build, app commit, carrier/operator, country/region, SIM/eSIM state (never record SIM identifiers), permission state, available radio technology as reported by the OS, active transport, reachability probe result, transition timestamps, sanitized logs, tester, and pass/fail. Remove phone numbers, subscriber identifiers, tokens, and message contents.

## Android

- [ ] Compile native host and adapter on supported Android SDK.
- [ ] Wi-Fi-only connectivity and service reachability probe.
- [ ] LTE on physical device and supported operator.
- [ ] 5G NSA on a device/operator combination confirmed to use NSA.
- [ ] 5G SA on a device/operator combination confirmed to use SA.
- [ ] Permission denied and permission revoked at runtime.
- [ ] No SIM, disabled mobile data, airplane mode.
- [ ] Wi-Fi-to-cellular and cellular-to-Wi-Fi transition with request recovery.
- [ ] Connection loss/recovery, captive portal, VPN, roaming where authorized.
- [ ] Two supported Android versions and at least two device models.

## iOS

- [ ] Compile and sign the native iOS host on a supported Xcode toolchain.
- [ ] Wi-Fi and cellular path changes on a physical iPhone.
- [ ] LTE and 5G where actually available on the test operator/device.
- [ ] Dual-SIM/eSIM, roaming where authorized, airplane mode, VPN, captive portal.
- [ ] Background/foreground and loss/recovery behavior.
- [ ] Confirm the app reports unavailable radio details as Unknown rather than guessing.

## Messaging over data

- [ ] Two independent test accounts/devices complete authenticated registration.
- [ ] End-to-end encryption uses an audited protocol/library; server never receives plaintext or private keys.
- [ ] Key-change warning, device revocation, recovery, replay protection, rate limits, and message expiry tested.
- [ ] Duplicate sends, timeout/retry, offline queue, auth expiry, TLS failure, HTTP 429/5xx tested.
- [ ] Verify delivery over Wi-Fi, LTE, and 5G without depending on RAT-specific behavior.
- [ ] Do not use the current plaintext D1 message implementation for sensitive content.

## 6G / IMT-2030

- [ ] Name the finalized specification release and exact feature being implemented.
- [ ] Compatible radio hardware and authorized test network available.
- [ ] Operator/vendor or accredited lab provides independent conformance/interoperability evidence.
- [ ] Capture verifiable network registration and session logs from the 6G test network.

Until all applicable evidence is attached, QOS status must remain **6G not available/verified**. No real 6G connection is asserted by this repository.
