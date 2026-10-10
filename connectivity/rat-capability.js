/* QOS multi-RAT capability discovery.
 * Browser-only signals never identify a cellular RAT reliably. A native Android/iOS
 * host may inject window.QOSNativeConnectivity.getSnapshot() after permission checks.
 * This module does not change radio modes, SIMs, bands, carrier settings, or emergency service.
 */
(() => {
  "use strict";

  const SUPPORTED_RATS = Object.freeze(["2G", "3G", "4G/LTE", "5G NSA", "5G SA", "5G NR (SA/NSA unknown)", "Wi-Fi", "Satellite", "Unknown"]);

  function browserSnapshot() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
    return {
      source: "browser",
      online: Boolean(navigator.onLine),
      effectiveType: connection && typeof connection.effectiveType === "string" ? connection.effectiveType : "unknown",
      downlinkMbps: connection && Number.isFinite(connection.downlink) ? connection.downlink : null,
      rttMs: connection && Number.isFinite(connection.rtt) ? connection.rtt : null,
      saveData: connection && typeof connection.saveData === "boolean" ? connection.saveData : null,
      radioAccessTechnology: "Unknown",
      registered: null,
      roaming: null,
      carrier: null,
      supportedRats: SUPPORTED_RATS.slice(),
      limitation: "Web browsers do not reliably expose 2G/3G/4G/5G radio registration. Online status is not a reachability test."
    };
  }

  function normalizeNativeSnapshot(value) {
    if (!value || typeof value !== "object") throw new TypeError("Native connectivity snapshot must be an object");
    const allowed = new Set(SUPPORTED_RATS);
    const rat = allowed.has(value.radioAccessTechnology) ? value.radioAccessTechnology : "Unknown";
    return {
      source: "native",
      online: typeof value.online === "boolean" ? value.online : Boolean(navigator.onLine),
      effectiveType: typeof value.effectiveType === "string" ? value.effectiveType : "unknown",
      downlinkMbps: Number.isFinite(value.downlinkMbps) ? value.downlinkMbps : null,
      rttMs: Number.isFinite(value.rttMs) ? value.rttMs : null,
      saveData: typeof value.saveData === "boolean" ? value.saveData : null,
      radioAccessTechnology: rat,
      registered: typeof value.registered === "boolean" ? value.registered : null,
      roaming: typeof value.roaming === "boolean" ? value.roaming : null,
      carrier: typeof value.carrier === "string" ? value.carrier.slice(0, 80) : null,
      supportedRats: SUPPORTED_RATS.slice(),
      limitation: "Native values are device-reported; carrier availability and end-to-end service still require active probes."
    };
  }

  function getSnapshot() {
    try {
      const bridge = window.QOSNativeConnectivity;
      if (bridge && typeof bridge.getSnapshot === "function") {
        return Promise.resolve(bridge.getSnapshot()).then(normalizeNativeSnapshot).catch(() => browserSnapshot());
      }
    } catch { /* Fall through to privacy-preserving browser-only reporting. */ }
    return Promise.resolve(browserSnapshot());
  }

  window.QOSConnectivity = Object.freeze({
    getSnapshot,
    supportedRadioLabels: SUPPORTED_RATS.slice(),
    contractVersion: "1.0.0"
  });
})();
