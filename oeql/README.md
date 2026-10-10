# OEQL runtime architecture

OEQL means Open-Ended Exploration & Quality Learning in this repository: a proposed Quantum OS subsystem for extending software through explicit, testable capabilities and scored feedback. This does not establish OEQL as an existing quantum-computing standard. The runtime does not perform quantum computation or prove general intelligence.

## Implemented now
- Explicit capability registry: only handlers registered by trusted application code can run.
- Structured JSON input/output boundary; no eval, generated-code execution, or implicit network access.
- Run identifiers, bounded session budget, cancellation checks, output-size limits, and bounded event history.
- Feedback scores from 0 to 1 and per-capability running mean for measurable iteration.
- Snapshot API for audit and telemetry integration.
- Unit tests for registration, execution, error paths, budget, cancellation, output validation, and feedback aggregation.

## Architecture layers
1. Experience/UI: Quantum OS surfaces requests and displays status.
2. OEQL orchestration: routes tasks to registered capabilities, enforces run budgets, and records lifecycle events.
3. Capability adapters: reviewed implementations for local utilities or external services. Network access and credentials belong in separately secured adapters, never user-supplied task text.
4. Evaluation/feedback: records explicit outcome scores and compares capability performance; it does not silently rewrite production code.
5. Persistence/observability: runtime snapshots are currently in-memory. Durable storage, multi-user tenancy, retention policy, and monitoring remain future integrations.
6. Security/release gates: capability allowlisting, output validation, resource budgets, tests, dependency review, and human approval for deployments.

## API example
Import createOEQLRuntime from ./runtime.mjs, create a runtime, register a trusted capability such as math.sum, call run with a task ID and JSON input, then call addFeedback with a score between 0 and 1 and inspect snapshot(). See runtime.test.mjs for executable examples.

## Not yet implemented / not to claim
- No quantum hardware, quantum circuit simulator, quantum advantage, or quantum-secure cryptography.
- No autonomous model training, self-modifying code, open internet agent, or production LLM adapter.
- No persistent feedback database, multi-tenant authorization, signed plugin packages, or production observability.
- No integration into the main Quantum OS UI yet; this module is a tested architectural foundation.
- Existing Q# messaging is not end-to-end encrypted, and its production service remains blocked until deployment credentials pass and live delivery is tested.

## Release gates
Run node --test oeql/runtime.test.mjs and the repository CI workflow. Before enabling external capabilities, add a permission model, input/output schemas, per-capability timeouts, secrets isolation, durable audit retention, abuse controls, and integration tests for each adapter.
