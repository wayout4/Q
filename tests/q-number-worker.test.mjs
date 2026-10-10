import test from "node:test";
import assert from "node:assert/strict";
import worker from "../q-number-worker/src/index.js";

const origin = "https://wayout4.github.io";
const tokenA = "a".repeat(64);
const tokenB = "b".repeat(64);
const env = {
  ALLOWED_ORIGIN: origin,
  ALLOWED_HOSTNAME: "wayout4.github.io",
  TURNSTILE_SECRET: "test-secret",
  Q_NUMBER_RATE_LIMITER: { async limit() { return { success: true }; } },
  DB: null
};

function makeDb() {
  const byInstall = new Map();
  const devices = new Map();
  const messages = [];
  let nextId = 1;
  let nextMessageId = 1;
  return {
    prepare(sql) {
      let values = [];
      const statement = {
        bind(...args) { values = args; return statement; },
        async run() {
          if (sql.includes("INSERT OR IGNORE INTO q_numbers")) {
            const [installId, createdAt] = values;
            if (!byInstall.has(installId)) byInstall.set(installId, { id: nextId++, install_id: installId, created_at: createdAt });
          } else if (sql.includes("INSERT OR IGNORE INTO q_devices")) {
            const [installId, qNumberId, tokenHash, createdAt] = values;
            if (!devices.has(installId)) devices.set(installId, { install_id: installId, q_number_id: qNumberId, token_hash: tokenHash, created_at: createdAt });
          } else if (sql.startsWith("INSERT INTO q_messages")) {
            const [senderId, recipientId, body, createdAt] = values;
            messages.push({ id: nextMessageId++, sender_id: senderId, recipient_id: recipientId, body, created_at: createdAt });
            return { success: true, meta: { last_row_id: nextMessageId - 1 } };
          }
          return { success: true };
        },
        async first() {
          if (sql.includes("FROM q_numbers WHERE install_id")) return byInstall.get(values[0]) || null;
          if (sql.includes("FROM q_numbers WHERE id")) return [...byInstall.values()].find(row => row.id === values[0]) || null;
          if (sql.includes("FROM q_devices WHERE install_id")) return devices.get(values[0]) || null;
          if (sql.includes("FROM q_devices WHERE token_hash")) return [...devices.values()].find(row => row.token_hash === values[0]) || null;
          return null;
        },
        async all() {
          if (sql.includes("FROM q_messages")) {
            const [recipientId, after] = values;
            return { results: messages.filter(row => row.recipient_id === recipientId && row.id > after)
              .sort((a, b) => a.id - b.id).slice(0, 50).map(row => ({
                id: row.id, sender_id: row.sender_id, body: row.body, created_at: row.created_at,
                sender_number: row.sender_id
              })) };
          }
          return { results: [] };
        }
      };
      return statement;
    }
  };
}

function request(path, body, requestOrigin = origin, method = "POST", token = "") {
  const headers = { Origin: requestOrigin, "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  return new Request("https://api.example.test" + path, {
    method, headers, body: body === undefined ? undefined : JSON.stringify(body)
  });
}

async function register(db, installId, clientToken) {
  const oldFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ success: true, hostname: "wayout4.github.io" }), { status: 200 });
  try {
    return await worker.fetch(request("/v1/q-number", { installId, clientToken, turnstileToken: "valid-token" }), { ...env, DB: db });
  } finally { globalThis.fetch = oldFetch; }
}

test("health reports setup readiness without exposing records", async () => {
  const response = await worker.fetch(request("/healthz", undefined, origin, "GET"), { ...env, DB: makeDb() });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).registrationEnabled, true);
});

test("assigns stable unique Q# values and binds a persistent device credential", async () => {
  const db = makeDb();
  const first = await register(db, "12345678-1234-1234-1234-123456789abc", tokenA);
  const again = await register(db, "12345678-1234-1234-1234-123456789abc", tokenA);
  const other = await register(db, "abcdefab-cdef-abcd-efab-cdefabcdefab", tokenB);
  assert.equal(first.status, 200);
  assert.equal((await first.json()).qNumber, "1.00000000");
  assert.equal((await again.json()).qNumber, "1.00000000");
  assert.equal((await other.json()).qNumber, "2.00000000");
});

test("rejects disallowed origins and invalid installation IDs", async () => {
  const db = makeDb();
  const blocked = await worker.fetch(request("/v1/q-number", {}, "https://evil.example"), { ...env, DB: db });
  assert.equal(blocked.status, 403);
  const invalid = await worker.fetch(request("/v1/q-number", { installId: "not-a-uuid", clientToken: tokenA, turnstileToken: "valid-token" }), { ...env, DB: db });
  assert.equal(invalid.status, 400);
});

test("rate limits registration before external verification", async () => {
  const oldFetch = globalThis.fetch;
  let verifications = 0;
  globalThis.fetch = async () => { verifications++; return new Response(JSON.stringify({ success: true, hostname: "wayout4.github.io" }), { status: 200 }); };
  try {
    const config = { ...env, DB: makeDb(), Q_NUMBER_RATE_LIMITER: { async limit() { return { success: false }; } } };
    const response = await worker.fetch(request("/v1/q-number", { installId: "12345678-1234-1234-1234-123456789abc", clientToken: tokenA, turnstileToken: "valid-token" }), config);
    assert.equal(response.status, 429);
    assert.equal(verifications, 0);
  } finally { globalThis.fetch = oldFetch; }
});

test("sends a message from one Q# to another and returns it only to the recipient", async () => {
  const db = makeDb();
  await register(db, "12345678-1234-1234-1234-123456789abc", tokenA);
  await register(db, "abcdefab-cdef-abcd-efab-cdefabcdefab", tokenB);
  const config = { ...env, DB: db };
  const sent = await worker.fetch(request("/v1/messages", { toQNumber: "2.00000000", body: "Hello Quantum!" }, origin, "POST", tokenA), config);
  assert.equal(sent.status, 201);
  const unauthorized = await worker.fetch(request("/v1/messages", undefined, origin, "GET"), config);
  assert.equal(unauthorized.status, 401);
  const inbox = await worker.fetch(request("/v1/messages?after=0", undefined, origin, "GET", tokenB), config);
  assert.equal(inbox.status, 200);
  const data = await inbox.json();
  assert.equal(data.messages.length, 1);
  assert.equal(data.messages[0].fromQNumber, "1.00000000");
  assert.equal(data.messages[0].body, "Hello Quantum!");
});

test("rejects missing service configuration and invalid message payloads", async () => {
  const response = await worker.fetch(request("/v1/q-number", { installId: "12345678-1234-1234-1234-123456789abc", clientToken: tokenA, turnstileToken: "x" }), { ALLOWED_ORIGIN: origin, ALLOWED_HOSTNAME: "wayout4.github.io" });
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /not configured/i);
  const db = makeDb();
  await register(db, "12345678-1234-1234-1234-123456789abc", tokenA);
  const invalid = await worker.fetch(request("/v1/messages", { toQNumber: "bad", body: "hi" }, origin, "POST", tokenA), { ...env, DB: db });
  assert.equal(invalid.status, 400);
});
