# QOS multi-RAT connectivity and 6G-readiness architecture

## Purpose

Provide a standards-aware interoperability layer for QOS across devices and networks that may use 3G/UMTS, 4G/LTE, 5G NSA/SA, Wi-Fi, and future IMT-2030/6G systems. This is an integration architecture, not a proprietary radio protocol and not a claim that the current web app controls a phone's modem.

## Architecture layers

1. **QOS experience and identity** — Q# is an application identity only. It is never an IMSI, IMEI, MSISDN, SIM credential, or substitute for a carrier subscription.
2. **Connectivity observation** — browser capability discovery reports only what the host exposes. `navigator.onLine` is not internet reachability; `effectiveType` (where available) is a coarse performance hint, not a RAT identifier.
3. **Native device adapter** — a future signed Android host can expose a narrow `QOSNativeConnectivity.getSnapshot()` bridge after Android permissions and API restrictions are handled. An iOS host needs a separate Swift adapter; iOS apps cannot freely control baseband radio modes. Native integrations must not bypass OS permissions or carrier policy.
4. **Transport abstraction** — HTTPS API client with timeouts, retry/backoff, idempotency keys, reachability probes, and offline queueing only for non-sensitive operations. Choose a transport from OS/network policy; never force a RAT or promise uninterrupted sessions.
5. **Service edge** — Q# identity/messaging, authentication, rate limits, observability, abuse controls, and privacy retention. Keep radio metadata optional and minimize collection.
6. **Standards and operator boundary** — interworking with 3GPP/GSMA/ITU specifications, carrier IMS/VoLTE/VoNR and core-network functions requires operator agreements, certified equipment, SIM/eSIM provisioning, lawful spectrum access, and security testing. QOS cannot create carrier coverage or activate 6G through software alone.
7. **Future 6G/IMT-2030** — modular adapters for future standardized radio interfaces and network APIs; implement only against finalized specifications and testable partner interfaces.

## Current implementation

- `rat-capability.js` exposes `window.QOSConnectivity.getSnapshot()`.
- On web it returns browser-visible connectivity hints and explicitly reports RAT as `Unknown`.
- A native host can provide `window.QOSNativeConnectivity.getSnapshot()`; its result is normalized and restricted to known labels.
- This adapter is observational only: no scanning, SIM reads, modem configuration, cellular band changes, carrier provisioning, or emergency-call functions.
- A connectivity panel may use the adapter to display the strongest truthful status without guessing 3G/4G/5G.

## Native bridge contract

The host bridge returns a plain object:
```js
{
  online: true,
  effectiveType: "4g",          // optional browser/OS hint, not proof of LTE
  downlinkMbps: 12.5,           // optional
  rttMs: 45,                    // optional
  saveData: false,              // optional
  radioAccessTechnology: "4G/LTE", // only if OS API reports it reliably
  registered: true,             // optional
  roaming: false,               // optional; only with permission/legitimate need
  carrier: null                 // omit unless user-facing need and platform permission
}
```
The adapter accepts only these radio labels: `2G`, `3G`, `4G/LTE`, `5G NSA`, `5G SA`, `Wi-Fi`, `Satellite`, `Unknown`. Missing/unsupported values become `Unknown`.

## Compatibility strategy

- **Web/PWA:** HTTPS, fetch, service worker, browser-reported online state; works over whichever connectivity the OS supplies, but cannot promise all radio technologies.
- **Android native wrapper:** use public Android connectivity/telephony APIs and runtime permissions; gracefully handle permission denial and vendor variation. Do not require privileged carrier APIs for basic QOS.
- **iOS native wrapper:** use supported Network framework and available Core Telephony observations; do not assume access to exact RAT or radio controls.
- **3G/4G/5G coexistence:** application protocols should be RAT-agnostic. Session recovery uses idempotent HTTPS requests, bounded retry/backoff, and explicit offline state. Operator network support remains external.
- **Future 6G:** implement a new adapter only after relevant IMT-2030/3GPP specifications and partner APIs are stable; use conformance and interoperability labs, not guessed protocol behavior.

## Release gates (must be evidenced, not presumed)

- Unit tests for unknown/missing/malformed native bridge fields and browser fallback.
- Android device tests across supported OS versions, SIM/eSIM states, permission denial, Wi-Fi/cellular transitions, roaming, airplane mode, and loss/recovery.
- iOS tests for Wi-Fi/cellular transitions and permission-restricted behavior.
- API integration tests with simulated timeout, TLS failure, HTTP 429/5xx, offline recovery, duplicate request, and auth expiry.
- Carrier/operator certification and regulatory review before any carrier-network service claim.
- Security review: no collection of IMSI/IMEI/SIM secrets; no logging of credentials; documented data minimization and user consent.
- 6G interoperability claim only after compatible hardware, finalized standards, partner access, and independent conformance evidence exist.

## External standards basis

- ITU-R IMT-2030 framework and progress: https://www.itu.int/en/ITU-R/study-groups/rsg5/rwp5d/imt-2030/pages/default.aspx
- 3GPP specifications portal: https://portal.3gpp.org/home/main
- ITU IMT-2030 framework Recommendation M.2160 context: https://www.itu.int/en/mediacentre/backgrounders/Pages/5G-fifth-generation-of-mobile-technologies.aspx

As of this implementation, QOS is 6G-oriented by architecture only; it is not a 6G modem, radio network, carrier, or certified 3GPP implementation.
