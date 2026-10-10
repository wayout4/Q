"""Submit a Bell-state circuit to a real IBM Quantum QPU.

Requires IBM Quantum Platform credentials supplied via environment variables.
This module deliberately has no local-simulator fallback: missing credentials or
hardware access fail loudly instead of presenting simulated output as hardware.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone


def main() -> int:
    api_key = os.environ.get("IBM_QUANTUM_API_KEY", "").strip()
    instance = os.environ.get("IBM_QUANTUM_INSTANCE", "").strip()
    if not api_key:
        print("ERROR: set IBM_QUANTUM_API_KEY in the trusted runtime secrets.", file=sys.stderr)
        return 2

    try:
        from qiskit import QuantumCircuit, transpile
        from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2
    except ImportError:
        print("ERROR: install requirements from qpu/requirements.txt.", file=sys.stderr)
        return 2

    try:
        service_args = {"channel": "ibm_quantum_platform", "token": api_key}
        if instance:
            service_args["instance"] = instance
        service = QiskitRuntimeService(**service_args)
        backend = service.least_busy(operational=True, simulator=False)

        circuit = QuantumCircuit(2)
        circuit.h(0)
        circuit.cx(0, 1)
        circuit.measure_all()
        compiled = transpile(circuit, backend=backend, optimization_level=1)

        sampler = SamplerV2(mode=backend)
        job = sampler.run([compiled], shots=1024)
        result = job.result()
        counts = result[0].data.meas.get_counts()

        report = {
            "provider": "IBM Quantum Platform",
            "execution": "real-qpu",
            "backend": backend.name,
            "job_id": job.job_id(),
            "shots": 1024,
            "counts": {str(k): int(v) for k, v in counts.items()},
            "submitted_at_utc": datetime.now(timezone.utc).isoformat(),
            "warning": "Hardware results are noisy; this is a Bell-state demonstration, not a claim of quantum advantage.",
        }
        rendered = json.dumps(report, indent=2, sort_keys=True)
        with open("qpu-result.json", "w", encoding="utf-8") as handle:
            handle.write(rendered + "\n")
        print(rendered)
        return 0
    except Exception as exc:  # fail closed; never fabricate hardware results
        message = str(exc)
        if "Unable to retrieve instances" in message or "valid API token" in message or "InvalidAccountError" in type(exc).__name__:
            print("ERROR: IBM rejected the credential. The GitHub secret is present, but it is not accepted as an IBM Quantum Platform API token.", file=sys.stderr)
            print("FIX: In IBM Quantum Platform, create a fresh API key for Quantum Platform access, then replace the GitHub Actions secret IBM_API_KEY (or IBM_QUANTUM_API_KEY). Do not paste the key into chat or commit it. If IBM provides an instance/CRN for your account, add it as repository secret IBM_QUANTUM_INSTANCE.", file=sys.stderr)
        else:
            print(f"ERROR: IBM Quantum hardware execution failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
