const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const INSTALL_ID_RE = /^[a-f0-9-]{32,36}$/i;

function json(data, status, origin, env) {
  const headers = new Headers(JSON_HEADERS);
  const allowed = env.ALLOWED_ORIGIN || "";
  if (origin && origin === allowed) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type");
    headers.set("Access-Control-Max-Age", "86400");
  }
  return new Response(JSON.stringify(data), { status, headers });
}

async function verifyTurnstile(token, request, env) {
  if (!env.TURNSTILE_SECRET || !token) return false;
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET);
  form.set("response", token);
  // Deliberately do not forward or persist client IP addresses.
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form
  });
  if (!response.ok) return false;
  const result = await response.json();
  if (!result.success) return false;
  if (env.ALLOWED_HOSTNAME && result.hostname !== env.ALLOWED_HOSTNAME) return false;
  return true;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "";

    if (request.method === "OPTIONS") {
      if (!origin || origin !== allowedOrigin) return new Response(null, { status: 403 });
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": origin,
          "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
          "Vary": "Origin"
        }
      });
    }

    if (!allowedOrigin || !origin || origin !== allowedOrigin) {
      return json({ error: "Origin not allowed." }, 403, origin, env);
    }

    if (url.pathname === "/healthz" && request.method === "GET") {
      const ready = Boolean(env.DB && env.TURNSTILE_SECRET && env.ALLOWED_HOSTNAME && env.Q_NUMBER_RATE_LIMITER);
      return json({ service: "quantum-q-number", status: ready ? "ok" : "setup-required", registrationEnabled: ready }, 200, origin, env);
    }

    if (url.pathname !== "/v1/q-number" || request.method !== "POST") {
      return json({ error: "Not found." }, 404, origin, env);
    }

    if (!env.DB || !env.TURNSTILE_SECRET || !env.ALLOWED_HOSTNAME || !env.Q_NUMBER_RATE_LIMITER) {
      return json({ error: "Q# registration is not configured by the service owner yet." }, 503, origin, env);
    }

    let payload;
    try {
      payload = await request.json();
    } catch {
      return json({ error: "Request body must be valid JSON." }, 400, origin, env);
    }

    const installId = typeof payload.installId === "string" ? payload.installId : "";
    const token = typeof payload.turnstileToken === "string" ? payload.turnstileToken : "";
    if (!INSTALL_ID_RE.test(installId)) {
      return json({ error: "Invalid installation identifier. Reload Quantum OS and retry." }, 400, origin, env);
    }

    // Limit verification and database work per installation. Cloudflare's limiter is
    // intentionally approximate; Turnstile remains mandatory and is the second layer.
    try {
      const rate = await env.Q_NUMBER_RATE_LIMITER.limit({ key: installId });
      if (!rate.success) {
        return json({ error: "Too many registration attempts from this installation. Wait one minute and retry." }, 429, origin, env);
      }
    } catch {
      return json({ error: "Registration protection is temporarily unavailable. Please retry shortly." }, 503, origin, env);
    }

    if (!token || token.length > 4096) {
      return json({ error: "Complete the security check before requesting a Q#." }, 400, origin, env);
    }

    let verified = false;
    try {
      verified = await verifyTurnstile(token, request, env);
    } catch {
      return json({ error: "Security verification is temporarily unavailable. Please retry." }, 503, origin, env);
    }
    if (!verified) return json({ error: "Security check failed or expired. Complete it again." }, 403, origin, env);

    try {
      const now = new Date().toISOString();
      // Unique constraint plus INSERT OR IGNORE makes repeated/racing requests idempotent.
      await env.DB.prepare(
        "INSERT OR IGNORE INTO q_numbers (install_id, created_at) VALUES (?, ?)"
      ).bind(installId, now).run();
      const row = await env.DB.prepare(
        "SELECT id FROM q_numbers WHERE install_id = ? LIMIT 1"
      ).bind(installId).first();
      if (!row || !Number.isSafeInteger(Number(row.id)) || Number(row.id) < 1) {
        return json({ error: "Could not confirm the Q# assignment. Please retry." }, 503, origin, env);
      }
      // Numeric Q# wire format: integer origin followed by an eight-digit decimal quanta field.
      // Initial assignment starts at zero quanta; do not coerce this identifier to a JS Number.
      const qNumber = String(row.id) + ".00000000";
      return json({ qNumber, status: "assigned", scope: "browser-installation" }, 200, origin, env);
    } catch {
      return json({ error: "The Q# registry is temporarily unavailable. Please retry." }, 503, origin, env);
    }
  }
};
