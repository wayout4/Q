import test from "node:test";
import assert from "node:assert/strict";
import worker from "../q-number-worker/src/index.js";

const origin = "https://wayout4.github.io";
const env = {
  ALLOWED_ORIGIN: origin,
  ALLOWED_HOSTNAME: "wayout4.github.io",
  TURNSTILE_SECRET: "test-secret",
  Q_NUMBER_RATE_LIMITER: { async limit() { return { success: true }; } },
  DB: null
};

function makeDb() {
  const byInstall = new Map();
  let nextId = 1;
  return {
    prepare(sql) {
      let values = [];
      const statement = {
        bind(...args) { values = args; return statement; },
        async run() {
          if (sql.startsWith("INSERT OR IGNORE")) {
            const [installId, createdAt] = values;
            if (!byInstall.has(installId)) byInstall.set(installId, { id: nextId++, created_at: createdAt });
          }
          return { success: true };
        },
        async first() {
          if (sql.startsWith("SELECT id")) return byInstall.get(values[0]) || null;
          return null;
        }
      };
      return statement;
    }
  };
}

function request(path, body, requestOrigin = origin, method = "POST") {
  return new Request("https://api.example.test" + path, {
    method,
    headers: { Origin: requestOrigin, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body)
  });
}

test("health reports setup readiness without exposing records", async () => {
  const response = await worker.fetch(request("/healthz", undefined, origin, "GET"), { ...env, DB: makeDb() });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).registrationEnabled, true);
});

test("assigns stable unique Q# values and is idempotent for the same install", async () => {
  const db = makeDb();
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, hostname: "wayout4.github.io" }), { status: 200 });
  try {
    const config = { ...env, DB: db };
    const body = { installId: "12345678-1234-1234-1234-123456789abc", turnstileToken: "valid-token" };
    const first = await worker.fetch(request("/v1/q-number", body), config);
    const again = await worker.fetch(request("/v1/q-number", body), config);
    const other = await worker.fetch(request("/v1/q-number", { ...body, installId: "abcdefab-cdef-abcd-efab-cdefabcdefab" }), config);
    assert.equal(first.status, 200);
    assert.equal((await first.json()).qNumber, "Q# 00000001");
    assert.equal((await again.json()).qNumber, "Q# 00000001");
    assert.equal((await other.json()).qNumber, "Q# 00000002");
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test("rejects disallowed origins and invalid installation IDs", async () => {
  const db = makeDb();
  const blocked = await worker.fetch(request("/v1/q-number", {}, "https://evil.example"), { ...env, DB: db });
  assert.equal(blocked.status, 403);
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, hostname: "wayout4.github.io" }), { status: 200 });
  try {
    const invalid = await worker.fetch(request("/v1/q-number", { installId: "not-a-uuid", turnstileToken: "valid-token" }), { ...env, DB: db });
    assert.equal(invalid.status, 400);
  } finally {
    globalThis.fetch = oldFetch;
  }
});

test("rate limits repeated registration attempts before external verification", async () => {
  const oldFetch = globalThis.fetch;
  let verifications = 0;
  globalThis.fetch = async () => { verifications++; return new Response(JSON.stringify({ success: true, hostname: "wayout4.github.io" }), { status: 200 }); };
  try {
    const config = { ...env, DB: makeDb(), Q_NUMBER_RATE_LIMITER: { async limit() { return { success: false }; } } };
    const response = await worker.fetch(request("/v1/q-number", { installId: "12345678-1234-1234-1234-123456789abc", turnstileToken: "valid-token" }), config);
    assert.equal(response.status, 429);
    assert.equal(verifications, 0, "rate limiting must happen before Turnstile network verification");
  } finally { globalThis.fetch = oldFetch; }
});

test("fails closed when Turnstile, database, or rate limiting configuration is missing", async () => {
  const response = await worker.fetch(request("/v1/q-number", { installId: "12345678-1234-1234-1234-123456789abc", turnstileToken: "x" }), { ALLOWED_ORIGIN: origin, ALLOWED_HOSTNAME: "wayout4.github.io" });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /not configured/i);
});
