# QOS iOS native connectivity adapter

This is Swift source for a separate native iOS host. It is not a built, signed, installed, or App Store-distributed iOS app.

## Integration

- Add `QOSConnectivityAdapter.swift` to an iOS app target.
- Use Apple's Network framework for path status and interface type.
- CoreTelephony radio-technology information is limited, can be unavailable, and does not provide modem control. Treat it as optional telemetry; never infer 5G NSA versus SA if the OS does not say so.
- Expose the snapshot to a WKWebView only for the trusted QOS origin, with a narrow message handler. Do not inject privileged bridges into arbitrary pages.
- No private carrier APIs, subscriber identifiers, or modem-control APIs are used.

## Physical-device test matrix

Test Wi-Fi, LTE, 5G where available, dual-SIM/eSIM arrangements, airplane mode, permission/availability restrictions, transitions, roaming where authorized, background/foreground, VPN, captive portals, and loss/recovery. Capture sanitized output and record device model, iOS version, carrier, and test date. Simulator tests do not prove radio interoperability.

## Build note

A complete Xcode project, signing identity, provisioning profile, physical iPhone, and carrier test access are not available in this repository workflow. Do not label iOS native support or live carrier interoperability as passed until built and tested on real devices.
