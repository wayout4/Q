# QOS release-gate ledger

Last reviewed: 2026-10-10
Scope: public web release, Android host, iOS host, secure messaging, real quantum hardware, and 6G/beyond-6G claims.

## Status rules

- **PASS** means there is a reproducible result attached to the exact source revision and environment.
- **PARTIAL** means automated build/test evidence exists but not the real-device, security, service, or production evidence.
- **BLOCKED** means a required external resource, credential, physical device, authorized network, or independent reviewer is not available in this repository workflow.
- A green CI job is not proof of physical-device behavior, production security, QPU execution, carrier interoperability, or standards conformance. Do not convert a planned feature or architecture document into a passed release gate.

## Current evidence snapshot

The current main revision's GitHub Actions runs report:
- Web acceptance workflow: PASS (static checks, quantum simulator tests, OEQL tests, browser end-to-end acceptance tests, packaging, and Pages deployment).
- Android debug APK assembly: PASS.
- Android emulator instrumentation workflow: test command completed successfully on the CI emulator; final job cleanup may still be running when this snapshot is read. This is emulator evidence only, not physical-device certification.
- Real IBM Quantum QPU: BLOCKED until a valid IBM Quantum Platform API key/instance is configured as GitHub Actions secrets and the hardware workflow completes with a real backend/job ID and result artifact.
- iOS app: BLOCKED; the repository has Swift adapter source and guidance, but no complete Xcode app target, signed app, provisioning, or physical-iPhone evidence.
- Production E2EE messaging: BLOCKED; the existing Worker/D1 implementation stores readable message bodies. Do not use it for sensitive messages or describe it as end-to-end encrypted.
- 6G / beyond-6G radio: BLOCKED; no compatible authorized radio/test network, operator provisioning, or independent conformance report is present. The app cannot create or enable a radio generation in software.

## Release gates

### Web
- [x] CI static/contract tests and browser acceptance tests passed on the current revision.
- [x] GitHub Pages deployment workflow passed on the current revision.
- [ ] External production monitoring, service reachability, and incident/rollback drills independently verified.

### Android
- [x] Debug APK built by GitHub Actions.
- [x] Android emulator instrumentation launch/content test completed successfully in CI.
- [ ] Install and launch on physical Android hardware; record device model, OS build, app SHA-256, timestamp, and sanitized log.
- [ ] Exercise Wi-Fi, LTE, 5G NSA/SA where the device/operator actually supports it, permission denied/revoked, no SIM, airplane mode, data disabled, VPN, captive portal, roaming where authorized, and Wi-Fi/cellular transitions.
- [ ] Verify service reachability and recovery behavior on at least two supported Android versions and two device models.
- [ ] Review Android permissions, WebView origin/bridge restrictions, privacy disclosures, accessibility, crash behavior, and release signing. The current debug APK is not a production-signed release.

### iOS
- [ ] Create and maintain a complete Xcode application target integrating the adapter safely.
- [ ] Build and test on supported iOS simulator versions using a macOS/Xcode toolchain.
- [ ] Configure authorized signing/provisioning and install on physical iPhones.
- [ ] Exercise Wi-Fi/cellular transitions, LTE/5G where available, dual-SIM/eSIM, airplane mode, VPN, captive portal, background/foreground, and loss/recovery.
- [ ] Record sanitized device evidence; do not infer unsupported radio details.

### Production end-to-end encrypted messaging
- [ ] Select an established, audited E2EE protocol/library; complete threat model and independent security review.
- [ ] Implement device-generated keys and platform secure storage, authenticated identity/key verification, key-change warnings, revocation and recovery.
- [ ] Ensure servers only handle ciphertext; verify plaintext and private keys never enter server storage, logs, analytics, backups, or crash reports.
- [ ] Implement authentication, TLS-only transport, rate limits, replay/duplicate protections, retries, offline expiry/deletion, abuse controls, and incident response.
- [ ] Run two-device tests and adversarial cases (key change, revoked/lost device, replay, credential expiry, TLS failure, offline, 429/5xx, malicious payload).
- [ ] Obtain independent audit approval before production claims or handling sensitive user data.
- [ ] Until all above pass, explicitly label messaging as not E2EE and not suitable for sensitive content.

### Real quantum hardware
- [ ] Configure a fresh, valid `IBM_QUANTUM_API_KEY` GitHub Actions secret and, if required by the account, `IBM_QUANTUM_INSTANCE`. Never put credentials in source, logs, issues, or chat.
- [ ] Manually dispatch `.github/workflows/real-quantum-hardware.yml` after credential setup.
- [ ] Confirm the run used an operational non-simulator backend, completed a hardware job, and uploaded `qos-real-quantum-hardware-result` containing backend, job ID, shot count, and counts.
- [ ] Preserve run URL and artifact hash; distinguish a successful hardware demonstration from quantum advantage.
- [ ] If authentication fails, rotate/revoke exposed keys and replace them with a fresh secret before retrying.

### 6G and beyond-6G
- [ ] Define a specific finalized/relevant standards release and feature under test; do not claim an 8G standard absent a recognized specification.
- [ ] Obtain compatible radio hardware/firmware, an authorized operator/vendor/lab test network, approved spectrum/test access, and provisioned test SIM/eSIM where applicable.
- [ ] Run conformance/interoperability tests against that documented specification.
- [ ] Attach timestamped registration/session logs and an independent operator/vendor/accredited-lab report.
- [ ] Until evidence exists, product status must say “6G/beyond-6G not available or verified”; application software cannot substitute for radio hardware and network infrastructure.

## What can be done from this repository alone

The web app and Android debug/emulator CI can be built and tested here. Physical-device installation requires an actual device or a user/operator-supplied device lab. iOS compilation requires Xcode/macOS and a completed app target. Real QPU execution requires a valid provider credential and available hardware backend. Production E2EE requires a protocol implementation plus independent security review. 6G operation requires external radio hardware, authorized infrastructure, and independent test evidence. These are genuine release dependencies, not tasks that can be honestly marked complete by changing source text or rerunning CI.
