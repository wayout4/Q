/* Quantum OS state-vector simulator. Browser-side simulation only; no quantum hardware. */
(function (root) {
  "use strict";
  const MAX_QUBITS = 10;
  const EPSILON = 1e-12;
  const SQRT_HALF = Math.SQRT1_2;

  function validateQubits(n) {
    if (!Number.isInteger(n) || n < 1 || n > MAX_QUBITS) throw new RangeError("Qubit count must be an integer from 1 to " + MAX_QUBITS);
  }
  function validateQubit(q, n) {
    if (!Number.isInteger(q) || q < 0 || q >= n) throw new RangeError("Qubit index out of range");
  }
  function complex(re, im = 0) { return { re, im }; }
  function add(a, b) { return complex(a.re + b.re, a.im + b.im); }
  function mul(a, b) { return complex(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re); }
  function scale(a, x) { return complex(a.re * x, a.im * x); }
  function abs2(a) { return a.re * a.re + a.im * a.im; }

  function createCircuit(n) {
    validateQubits(n);
    const size = 1 << n;
    const state = Array.from({ length: size }, (_, i) => complex(i === 0 ? 1 : 0));
    const history = [];
    function applySingle(q, matrix, name) {
      validateQubit(q, n);
      const mask = 1 << q;
      for (let i = 0; i < size; i++) {
        if (i & mask) continue;
        const j = i | mask, a = state[i], b = state[j];
        const nextA = add(mul(matrix[0][0], a), mul(matrix[0][1], b));
        const nextB = add(mul(matrix[1][0], a), mul(matrix[1][1], b));
        state[i] = nextA; state[j] = nextB;
      }
      history.push({ gate: name, qubits: [q] });
      return api;
    }
    const I = [[complex(1), complex(0)], [complex(0), complex(1)]];
    const X = [[complex(0), complex(1)], [complex(1), complex(0)]];
    const Y = [[complex(0), complex(0, -1)], [complex(0, 1), complex(0)]];
    const Z = [[complex(1), complex(0)], [complex(0), complex(-1)]];
    const H = [[complex(SQRT_HALF), complex(SQRT_HALF)], [complex(SQRT_HALF), complex(-SQRT_HALF)]];
    const S = [[complex(1), complex(0)], [complex(0), complex(0, 1)]];
    const T = [[complex(1), complex(0)], [complex(0), complex(Math.cos(Math.PI / 4), Math.sin(Math.PI / 4))]];
    function cnot(control, target) {
      validateQubit(control, n); validateQubit(target, n);
      if (control === target) throw new RangeError("CNOT control and target must differ");
      const cm = 1 << control, tm = 1 << target;
      for (let i = 0; i < size; i++) if ((i & cm) && !(i & tm)) {
        const j = i | tm, temp = state[i]; state[i] = state[j]; state[j] = temp;
      }
      history.push({ gate: "CNOT", qubits: [control, target] });
      return api;
    }
    function probabilities() {
      return state.map(abs2);
    }
    function measure({ random = Math.random } = {}) {
      const probs = probabilities();
      let r = random(), selected = probs.length - 1;
      for (let i = 0; i < probs.length; i++) { r -= probs[i]; if (r < 0) { selected = i; break; } }
      const p = probs[selected];
      if (p <= EPSILON) throw new Error("State has no measurable probability");
      const factor = 1 / Math.sqrt(p);
      for (let i = 0; i < size; i++) state[i] = i === selected ? scale(state[i], factor) : complex(0);
      history.push({ gate: "MEASURE", outcome: selected.toString(2).padStart(n, "0") });
      return { index: selected, bitstring: selected.toString(2).padStart(n, "0"), probability: p };
    }
    function snapshot() {
      return {
        qubits: n,
        state: state.map((v, index) => ({ basis: index.toString(2).padStart(n, "0"), re: v.re, im: v.im, probability: abs2(v) })),
        history: history.map(item => ({ ...item, ...(item.qubits ? { qubits: item.qubits.slice() } : {}) })),
        totalProbability: probabilities().reduce((sum, p) => sum + p, 0)
      };
    }
    const api = {
      x: q => applySingle(q, X, "X"), y: q => applySingle(q, Y, "Y"), z: q => applySingle(q, Z, "Z"),
      h: q => applySingle(q, H, "H"), s: q => applySingle(q, S, "S"), t: q => applySingle(q, T, "T"),
      cnot, measure, probabilities, snapshot,
      reset() { state.fill(null); for (let i = 0; i < size; i++) state[i] = complex(i === 0 ? 1 : 0); history.length = 0; return api; },
      identity(q) { return applySingle(q, I, "I"); }
    };
    return api;
  }

  function bellState() { return createCircuit(2).h(0).cnot(0, 1); }
  function deutschJozsa({ qubits = 3, oracle = "balanced" } = {}) {
    if (!Number.isInteger(qubits) || qubits < 1 || qubits >= MAX_QUBITS) throw new RangeError("Deutsch-Jozsa input qubits must be from 1 to " + (MAX_QUBITS - 1));
    if (oracle !== "constant" && oracle !== "balanced") throw new TypeError("oracle must be constant or balanced");
    const circuit = createCircuit(qubits + 1);
    for (let q = 0; q <= qubits; q++) circuit.x(q);
    for (let q = 0; q <= qubits; q++) circuit.h(q);
    if (oracle === "balanced") for (let q = 0; q < qubits; q++) circuit.cnot(q, qubits);
    for (let q = 0; q < qubits; q++) circuit.h(q);
    const result = circuit.snapshot();
    const distribution = Array(1 << qubits).fill(0);
    for (const item of result.state) {
      const input = parseInt(item.basis.slice(-qubits), 2);
      distribution[input] += item.probability;
    }
    return { oracle, qubits, distribution, measuredInput: distribution.reduce((best, p, i, arr) => p > arr[best] ? i : best, 0), circuit: result };
  }

  root.QuantumSimulator = Object.freeze({ createCircuit, bellState, deutschJozsa, MAX_QUBITS });
})(typeof window !== "undefined" ? window : globalThis);
