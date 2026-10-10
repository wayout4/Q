# QOS Android native connectivity adapter

This is source guidance for a native Android host, not a claim that the current GitHub Pages app is installed as a native app.

## Integration

- Add `QosConnectivityPlugin.kt` to the Android host module.
- Declare `android.permission.ACCESS_NETWORK_STATE`; request `READ_PHONE_STATE` only if needed and handle denial as Unknown.
- Expose `window.QOSNativeConnectivity.getSnapshot()` only to the trusted QOS origin. Never expose a privileged bridge to arbitrary WebView navigation.
- Do not collect IMSI, IMEI, phone number, SIM identifiers, or credentials.

The adapter distinguishes transport from radio access technology. Android API/device/carrier behavior varies; missing information must remain Unknown. 5G NSA versus SA is not reliably distinguishable on all devices.

## Physical-device test matrix

Record device model, Android build, carrier, SIM/eSIM setup, date, permission state, and sanitized results for Wi-Fi only, LTE, 5G NSA/SA where available, SIM absent, permission denied, airplane mode, Wi-Fi/cellular transitions, roaming where authorized, loss/recovery, VPN, captive portal, and data disabled. Do not mark a row passed without captured device evidence.

## Build status

This repository does not currently contain a complete Gradle Android application, signing configuration, or connected test device. Integrate the adapter into a native host and compile/test there before claiming Android release readiness.
