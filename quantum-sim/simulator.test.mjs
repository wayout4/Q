import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const context = { Math, RangeError, TypeError, Error, Array, Object, Number, String, parseInt };
context.window = context;
vm.runInNewContext(fs.readFileSync(new URL("./simulator.js", import.meta.url), "utf8"), context);
const Q = context.QuantumSimulator;
const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, a + " != " + b);

test("starts in |0> and conserves total probability", () => {
  const c = Q.createCircuit(3);
  assert.deepEqual(Array.from(c.probabilities()), [1,0,0,0,0,0,0,0]);
  c.h(0).x(2).t(1);
  close(c.snapshot().totalProbability, 1);
});

test("Hadamard creates balanced probabilities and measurement collapses", () => {
  const c = Q.createCircuit(1).h(0);
  close(c.probabilities()[0], 0.5); close(c.probabilities()[1], 0.5);
  const measured = c.measure({ random: () => 0.9 });
  assert.equal(measured.bitstring, "1");
  assert.deepEqual(Array.from(c.probabilities()), [0,1]);
  assert.equal(c.measure({ random: () => 0.1 }).bitstring, "1");
});

test("X, Y, Z and phase gates preserve normalized state", () => {
  for (const gate of ["x", "y", "z", "s", "t", "h"]) {
    const c = Q.createCircuit(1);
    c.h(0)[gate](0);
    close(c.snapshot().totalProbability, 1);
  }
});

test("CNOT entangles a Bell pair with correlated outcomes", () => {
  const c = Q.bellState();
  const probs = Array.from(c.probabilities());
  close(probs[0], 0.5); close(probs[1], 0); close(probs[2], 0); close(probs[3], 0.5);
  assert.equal(c.snapshot().history.at(-1).gate, "CNOT");
});

test("validates resource bounds and gate arguments", () => {
  assert.throws(() => Q.createCircuit(0), /Qubit count/);
  assert.throws(() => Q.createCircuit(11), /Qubit count/);
  assert.throws(() => Q.createCircuit(1).x(1), /index out of range/);
  assert.throws(() => Q.createCircuit(2).cnot(0,0), /must differ/);
  assert.throws(() => Q.deutschJozsa({ oracle: "unknown" }), /oracle/);
});

test("reset restores |0> and clears history", () => {
  const c = Q.createCircuit(2).h(0).x(1);
  c.reset();
  assert.deepEqual(Array.from(c.probabilities()), [1,0,0,0]);
  assert.equal(c.snapshot().history.length, 0);
});
