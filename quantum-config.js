/* Public client configuration only. Never put secrets in this file. */
window.QUANTUM_CONFIG = Object.freeze({
  /* Set to the deployed Worker origin, e.g. https://quantum-q-api.example.workers.dev */
  apiBase: "",
  /* Cloudflare Turnstile public site key; the secret belongs only in Worker secrets. */
  turnstileSiteKey: ""
});
