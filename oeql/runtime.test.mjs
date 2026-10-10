import test from "node:test";
import assert from "node:assert/strict";
import { createOEQLRuntime } from "./runtime.mjs";

test("runs only explicitly registered capabilities", async () => {
  const q = createOEQLRuntime({ clock: () => "2026-01-01T00:00:00.000Z" });
  q.register("summarize.text", async input => ({ length: input.text.length }));
  assert.deepEqual(await q.run({ capability: "summarize.text", input: { text: "Quantum" }, taskId: "t1" }), { runId: "t1", status: "succeeded", output: { length: 7 } });
  await assert.rejects(q.run({ capability: "unknown.exec", input: {} }), /not registered/);
});

test("rejects malformed or duplicate capabilities and unsafe inputs", async () => {
  const q = createOEQLRuntime();
  assert.throws(() => q.register("Bad Name", () => null), /Invalid capability/);
  q.register("safe.handler", () => ({ ok: true }));
  assert.throws(() => q.register("safe.handler", () => null), /already registered/);
  await assert.rejects(q.run({ capability: "safe.handler", input: [] }), /object/);
  await q.run({ capability: "safe.handler", input: {}, taskId: "x" });
  await assert.rejects(q.run({ capability: "safe.handler", input: {}, taskId: "x" }), /already used/);
});

test("aggregates feedback and preserves run status", async () => {
  const q = createOEQLRuntime();
  q.register("reason.plan", input => ({ steps: input.steps }));
  await q.run({ capability: "reason.plan", input: { steps: ["inspect", "test"] }, taskId: "p1" });
  q.addFeedback("p1", { score: 0.8, note: "Tests passed" });
  q.addFeedback("p1", { score: 1 });
  const snapshot = q.snapshot();
  assert.equal(snapshot.feedbackByCapability["reason.plan"].count, 2);
  assert.equal(snapshot.feedbackByCapability["reason.plan"].meanScore, 0.9);
  assert.equal(snapshot.limits.arbitraryCodeExecution, false);
  assert.equal(snapshot.runs[0].status, "succeeded");
  assert.throws(() => q.addFeedback("missing", { score: 1 }), /successful run/);
  assert.throws(() => q.addFeedback("p1", { score: 2 }), /0..1/);
});

test("enforces run budget and serialized output size", async () => {
  const q = createOEQLRuntime({ maxRuns: 1 });
  q.register("ok", () => ({ ok: true }));
  await q.run({ capability: "ok", input: {}, taskId: "one" });
  await assert.rejects(q.run({ capability: "ok", input: {}, taskId: "two" }), /budget exhausted/);
  const q2 = createOEQLRuntime();
  q2.register("large.output", () => ({ value: "x".repeat(100001) }));
  await assert.rejects(q2.run({ capability: "large.output", input: {} }), /100 KB/);
});

test("supports removal and preflight cancellation", async () => {
  const q = createOEQLRuntime();
  let called = false;
  const remove = q.register("delayed.work", () => { called = true; return "done"; });
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(q.run({ capability: "delayed.work", input: {}, signal: controller.signal }), /cancelled/);
  assert.equal(called, false);
  assert.equal(remove(), true);
  assert.equal(remove(), false);
  await assert.rejects(q.run({ capability: "delayed.work", input: {} }), /not registered/);
});
