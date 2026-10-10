# QOS operator, device-lab, and IMT-2030 readiness plan

## Reality and scope

This plan does not provision carrier service, spectrum, base stations, SIM/eSIM profiles, private network cores, 6G radios, or credentials. Those require authorized operators, vendors, laboratories, and physical equipment. Never scan, access, or attempt to attach to networks without explicit authorization.

As of October 2026, 6G is in standards development. ITU-R IMT-2030 requirements and evaluation work is still moving through the process, and 3GPP Release 21 is the track for first normative 6G specifications. QOS can prepare a modular application and test harness, but cannot honestly claim a live standardized 6G connection today without a specific compatible authorized test network and evidence.

## Infrastructure layers

1. **Public application edge:** HTTPS, strict origin policy, rate limits, health/readiness probes, security headers, observability with redacted logs, backups, and incident runbooks. Separate public web assets from private APIs and secrets.
2. **Identity/messaging service:** audited E2EE protocol, device enrollment/revocation, ciphertext-only storage, key verification, abuse controls, retention/deletion policy, and independent penetration testing. Never place provider or carrier secrets in the browser or Git repository.
3. **CI/CD and supply chain:** pinned dependencies, least-privilege GitHub Actions permissions, secret scanning, dependency scanning, SBOM, reproducible builds where practical, signed releases, artifact hashes, and rollback procedure.
4. **Device lab:** physical Android phones and iPhones across supported OS versions; test SIM/eSIM plans from consenting operators; controlled Wi-Fi; network impairment tool; timestamped sanitized captures; automated test app and results storage. Record exact model, OS, operator, region, plan type, date, test case, outcome, and evidence hash.
5. **Operator integration:** only through formal operator/vendor agreement, approved SIM/eSIM provisioning, documented API credentials, security review, permitted test scope, and written acceptance criteria. IMS/VoLTE/VoNR or core network access is not granted by an app repository.
6. **6G research path:** join an authorized university/vendor/operator testbed or accredited evaluation group; identify the radio/interface specification and hardware revision; obtain lawful access to the test environment; execute conformance and interoperability test suites; retain independently verifiable evidence.
7. **8G research:** keep a versioned, technology-neutral future-radio interface. Do not invent or advertise an 8G standard, radio mode, service, or interoperability result without an established specification and testable implementation.

## Evidence required for a live claim

A live connection claim must identify the exact network/operator and lab, compatible radio device and firmware, network registration/session result, timestamp, test case, logs or signed report, and independent verifier. A GitHub workflow success or browser online indicator is not evidence of radio attachment.

## Access and provisioning checklist

- [ ] Organization/operator/vendor approves scope and named test environment.
- [ ] Hardware inventory and firmware versions recorded.
- [ ] Lawful spectrum/test-network authorization confirmed by the operator/lab.
- [ ] Test SIM/eSIM profiles provisioned by the authorized provider.
- [ ] API/service credentials issued directly to an authorized secret manager.
- [ ] Threat model, data protection review, and incident response agreed.
- [ ] Test cases mapped to applicable 3GPP/ITU documents and release versions.
- [ ] Independent report approved before public conformance claims.

## Current QOS status

This repository contains application-side connectivity observations and native adapter source, but no connected carrier core, provisioned radio lab, operator credentials, 6G radio hardware, or independent conformance report. All such claims remain unverified until evidence is committed without exposing secrets or personal identifiers.
