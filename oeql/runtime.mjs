/**
 * OEQL: Open-Ended Exploration & Quality Learning runtime.
 * Deterministic, auditable plugin orchestration; not a quantum processor or AGI.
 * Only explicitly registered trusted handlers can execute; this module never evals code.
 */
const NAME_RE = /^[a-z][a-z0-9.-]{1,63}$/;
const MAX_HISTORY = 500;

export function createOEQLRuntime({ maxRuns = 100, clock = () => new Date().toISOString() } = {}) {
  if (!Number.isSafeInteger(maxRuns) || maxRuns < 1 || maxRuns > 10000) throw new TypeError("maxRuns must be 1..10000");
  const capabilities = new Map(), runs = new Map(), events = [], feedback = [];
  function record(type, detail = {}) {
    events.push(Object.freeze({ at: clock(), type, ...detail }));
    if (events.length > MAX_HISTORY) events.shift();
  }
  function register(name, handler, { description = "" } = {}) {
    if (typeof name !== "string" || !NAME_RE.test(name)) throw new TypeError("Invalid capability name");
    if (typeof handler !== "function") throw new TypeError("Capability handler must be a function");
    if (capabilities.has(name)) throw new Error("Capability already registered");
    capabilities.set(name, Object.freeze({ handler, description: String(description).slice(0, 240) }));
    record("capability.registered", { capability: name });
    return () => {
      const removed = capabilities.delete(name);
      if (removed) record("capability.removed", { capability: name });
      return removed;
    };
  }
  async function run({ capability, input = {}, taskId, signal } = {}) {
    if (typeof capability !== "string" || !capabilities.has(capability)) throw new Error("Capability is not registered");
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new TypeError("Input must be an object");
    if (runs.size >= maxRuns) throw new Error("Run budget exhausted; create a new runtime session");
    const id = taskId || ("oeql-" + (runs.size + 1));
    if (runs.has(id)) throw new Error("Task ID already used");
    const entry = { id, capability, status: "running", startedAt: clock(), finishedAt: null, output: null, error: null };
    runs.set(id, entry);
    record("run.started", { runId: id, capability, inputKeys: Object.keys(input).slice(0, 40) });
    try {
      if (signal?.aborted) throw new Error("Run cancelled");
      const output = await capabilities.get(capability).handler(structuredClone(input), { signal, taskId: id });
      const serialized = JSON.stringify(output === undefined ? null : output);
      if (serialized === undefined || serialized.length > 100000) throw new Error("Capability output must be JSON serializable and <= 100 KB");
      entry.output = JSON.parse(serialized);
      entry.status = "succeeded";
      record("run.succeeded", { runId: id, capability });
      return Object.freeze({ runId: id, status: entry.status, output: structuredClone(entry.output) });
    } catch (error) {
      entry.status = signal?.aborted ? "cancelled" : "failed";
      entry.error = String(error?.message || "Capability failed").slice(0, 300);
      record("run.failed", { runId: id, capability, status: entry.status, error: entry.error });
      throw new Error(entry.error);
    } finally {
      entry.finishedAt = clock();
    }
  }
  function addFeedback(runId, { score, note = "" } = {}) {
    const entry = runs.get(runId);
    if (!entry || entry.status !== "succeeded") throw new Error("Feedback requires a successful run");
    if (typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 1) throw new TypeError("Score must be 0..1");
    const item = Object.freeze({ runId, capability: entry.capability, score, note: String(note).slice(0, 500), at: clock() });
    feedback.push(item);
    if (feedback.length > MAX_HISTORY) feedback.shift();
    record("feedback.recorded", { runId, capability: entry.capability, score });
    return item;
  }
  function snapshot() {
    const byCapability = {};
    for (const item of feedback) {
      const bucket = byCapability[item.capability] || (byCapability[item.capability] = { count: 0, meanScore: 0 });
      bucket.count += 1;
      bucket.meanScore += (item.score - bucket.meanScore) / bucket.count;
    }
    return Object.freeze({
      name: "OEQL", mode: "bounded-plugin-learning",
      capabilities: [...capabilities].map(([name, item]) => ({ name, description: item.description })),
      runs: [...runs.values()].map(({ id, capability, status, startedAt, finishedAt, error }) => ({ id, capability, status, startedAt, finishedAt, ...(error ? { error } : {}) })),
      feedbackByCapability: byCapability, events: events.map(event => ({ ...event })),
      limits: { maxRuns, maxHistory: MAX_HISTORY, arbitraryCodeExecution: false }
    });
  }
  return Object.freeze({ register, run, addFeedback, snapshot });
}
