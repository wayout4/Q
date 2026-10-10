const JSON_HEADERS = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
const INSTALL_ID_RE = /^[a-f0-9-]{32,36}$/i;
const CLIENT_TOKEN_RE = /^[A-Za-z0-9_-]{43,128}$/;
const Q_NUMBER_RE = /^([1-9][0-9]*)\\.00000000$/;
const MAX_MESSAGE_LENGTH = 4000;

function json(data, status, origin, env) {
  const headers = new Headers(JSON_HEADERS);
  const allowed = env.ALLOWED_ORIGIN || "";
  if (origin && origin === allowed) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Vary", "Origin");
    headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    headers.set("Access-Control-Max-Age", "86400");
  }
  return new Response(JSON.stringify(data), { status, headers });
}

async function verifyTurnstile(token, env) {
  if (!env.TURNSTILE_SECRET || !token) return false;
  const form = new FormData();
  form.set("secret", env.TURNSTILE_SECRET);
  form.set("response", token);
  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: form });
  if (!response.ok) return false;
  const result = await response.json();
  return Boolean(result.success && (!env.ALLOWED_HOSTNAME || result.hostname === env.ALLOWED_HOSTNAME));
}

async function hashToken(token) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function parseQNumber(value) {
  if (typeof value !== "string") return null;
  const match = Q_NUMBER_RE.exec(value);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

async function authenticatedDevice(request, env) {
  const match = /^Bearer ([A-Za-z0-9_-]{43,128})$/.exec(request.headers.get("Authorization") || "");
  if (!match) return null;
  const tokenHash = await hashToken(match[1]);
  return env.DB.prepare(
    "SELECT q_number_id, install_id FROM q_devices WHERE token_hash = ? LIMIT 1"
  ).bind(tokenHash).first();
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin") || "";
    const allowedOrigin = env.ALLOWED_ORIGIN || "";

    if (request.method === "OPTIONS") {
      if (!origin || origin !== allowedOrigin) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
        "Vary": "Origin"
      }});
    }
    if (!allowedOrigin || !origin || origin !== allowedOrigin) return json({ error: "Origin not allowed." }, 403, origin, env);

    if (url.pathname === "/healthz" && request.method === "GET") {
      const ready = Boolean(env.DB && env.TURNSTILE_SECRET && env.ALLOWED_HOSTNAME && env.Q_NUMBER_RATE_LIMITER);
      return json({ service: "quantum-q-number", status: ready ? "ok" : "setup-required", registrationEnabled: ready, messagingEnabled: ready }, 200, origin, env);
    }
    if (!env.DB || !env.Q_NUMBER_RATE_LIMITER) return json({ error: "Quantum service is not configured." }, 503, origin, env);

    if (url.pathname === "/v1/q-number" && request.method === "POST") {
      if (!env.TURNSTILE_SECRET || !env.ALLOWED_HOSTNAME) return json({ error: "Q# registration is not configured." }, 503, origin, env);
      let payload;
      try { payload = await request.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400, origin, env); }
      const installId = typeof payload.installId === "string" ? payload.installId : "";
      const turnstileToken = typeof payload.turnstileToken === "string" ? payload.turnstileToken : "";
      const clientToken = typeof payload.clientToken === "string" ? payload.clientToken : "";
      if (!INSTALL_ID_RE.test(installId)) return json({ error: "Invalid installation identifier." }, 400, origin, env);
      if (!CLIENT_TOKEN_RE.test(clientToken)) return json({ error: "Invalid device credential. Reload and retry." }, 400, origin, env);
      try {
        const rate = await env.Q_NUMBER_RATE_LIMITER.limit({ key: "register:" + installId });
        if (!rate.success) return json({ error: "Too many registration attempts. Wait one minute and retry." }, 429, origin, env);
      } catch { return json({ error: "Registration protection is temporarily unavailable." }, 503, origin, env); }
      if (!turnstileToken || turnstileToken.length > 4096) return json({ error: "Complete the security check first." }, 400, origin, env);
      let verified = false;
      try { verified = await verifyTurnstile(turnstileToken, env); } catch { return json({ error: "Security verification is temporarily unavailable." }, 503, origin, env); }
      if (!verified) return json({ error: "Security check failed or expired. Complete it again." }, 403, origin, env);
      try {
        const now = new Date().toISOString();
        await env.DB.prepare("INSERT OR IGNORE INTO q_numbers (install_id, created_at) VALUES (?, ?)").bind(installId, now).run();
        const row = await env.DB.prepare("SELECT id FROM q_numbers WHERE install_id = ? LIMIT 1").bind(installId).first();
        if (!row || !Number.isSafeInteger(Number(row.id)) || Number(row.id) < 1) return json({ error: "Could not confirm Q# assignment. Retry." }, 503, origin, env);
        const tokenHash = await hashToken(clientToken);
        await env.DB.prepare("INSERT OR IGNORE INTO q_devices (install_id, q_number_id, token_hash, created_at) VALUES (?, ?, ?, ?)").bind(installId, Number(row.id), tokenHash, now).run();
        const device = await env.DB.prepare("SELECT token_hash FROM q_devices WHERE install_id = ? LIMIT 1").bind(installId).first();
        if (!device || device.token_hash !== tokenHash) return json({ error: "This installation is already registered with a different local credential. Clear site data only if you understand that recovery is not available." }, 409, origin, env);
        return json({ qNumber: String(row.id) + ".00000000", status: "assigned", scope: "browser-installation" }, 200, origin, env);
      } catch { return json({ error: "The Q# registry is temporarily unavailable." }, 503, origin, env); }
    }

    if (url.pathname === "/v1/identity" && request.method === "GET") {
      const id = parseQNumber(url.searchParams.get("qNumber"));
      if (!id) return json({ error: "Invalid Q# format." }, 400, origin, env);
      try {
        const row = await env.DB.prepare("SELECT id FROM q_numbers WHERE id = ? LIMIT 1").bind(id).first();
        return row ? json({ qNumber: String(id) + ".00000000", exists: true }, 200, origin, env) : json({ error: "Q# not found." }, 404, origin, env);
      } catch { return json({ error: "Identity lookup is temporarily unavailable." }, 503, origin, env); }
    }

    if (url.pathname === "/v1/messages" && (request.method === "POST" || request.method === "GET")) {
      let device;
      try { device = await authenticatedDevice(request, env); } catch { return json({ error: "Authentication service is temporarily unavailable." }, 503, origin, env); }
      if (!device) return json({ error: "Device authentication required. Register this browser first." }, 401, origin, env);
      if (request.method === "POST") {
        let payload;
        try { payload = await request.json(); } catch { return json({ error: "Request body must be valid JSON." }, 400, origin, env); }
        const recipientId = parseQNumber(payload.toQNumber);
        const body = typeof payload.body === "string" ? payload.body.trim() : "";
        if (!recipientId) return json({ error: "Enter a valid recipient Q#." }, 400, origin, env);
        if (!body || body.length > MAX_MESSAGE_LENGTH) return json({ error: "Message must be between 1 and 4000 characters." }, 400, origin, env);
        try {
          const recipient = await env.DB.prepare("SELECT id FROM q_numbers WHERE id = ? LIMIT 1").bind(recipientId).first();
          if (!recipient) return json({ error: "Recipient Q# was not found." }, 404, origin, env);
          const now = new Date().toISOString();
          const inserted = await env.DB.prepare("INSERT INTO q_messages (sender_id, recipient_id, body, created_at) VALUES (?, ?, ?, ?)").bind(Number(device.q_number_id), recipientId, body, now).run();
          const id = Number(inserted.meta?.last_row_id || 0);
          return json({ status: "sent", messageId: id, createdAt: now }, 201, origin, env);
        } catch { return json({ error: "Message could not be saved. Retry shortly." }, 503, origin, env); }
      }
      const after = Math.max(0, Math.floor(Number(url.searchParams.get("after") || 0)) || 0);
      try {
        const result = await env.DB.prepare(
          "SELECT m.id, m.sender_id, m.body, m.created_at, q.id AS sender_number FROM q_messages m JOIN q_numbers q ON q.id = m.sender_id WHERE m.recipient_id = ? AND m.id > ? ORDER BY m.id ASC LIMIT 50"
        ).bind(Number(device.q_number_id), after).all();
        const messages = (result.results || []).map(row => ({
          id: Number(row.id), fromQNumber: String(row.sender_number) + ".00000000",
          body: row.body, createdAt: row.created_at
        }));
        return json({ messages, nextAfter: messages.length ? messages[messages.length - 1].id : after }, 200, origin, env);
      } catch { return json({ error: "Inbox is temporarily unavailable." }, 503, origin, env); }
    }

    return json({ error: "Not found." }, 404, origin, env);
  }
};
