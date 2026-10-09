#!/usr/bin/env python3
"""Static acceptance tests for the Quantum OS web edition; not browser E2E tests."""
from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class QuantumOSContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.html = (ROOT / "index.html").read_text(encoding="utf-8")
        cls.js = (ROOT / "app.js").read_text(encoding="utf-8")
        cls.css = (ROOT / "styles.css").read_text(encoding="utf-8")
        cls.worker = (ROOT / "sw.js").read_text(encoding="utf-8")
        cls.manifest = (ROOT / "manifest.webmanifest").read_text(encoding="utf-8")

    def test_required_application_controls_exist(self):
        for app in ("notes", "calculator", "network", "settings", "qnumber", "about"):
            self.assertIn(f'data-app="{app}"', self.html)
            self.assertIn(f"{app}:", self.js)

    def test_notes_are_local_first_and_storage_failures_handled(self):
        self.assertIn('localStorage.setItem("quantum-os-note"', self.js)
        self.assertIn('localStorage.removeItem("quantum-os-note")', self.js)
        self.assertIn("Could not save", self.js)

    def test_network_claims_are_truthful(self):
        self.assertIn("navigator.onLine", self.js)
        self.assertIn("does not guarantee", self.js)
        self.assertIn("6G status", self.js)
        self.assertIn("Not verified", self.js)

    def test_offline_shell_and_manifest_are_present(self):
        self.assertIn("serviceWorker", self.js)
        self.assertIn('caches.open(CACHE_NAME)', self.worker)
        self.assertIn("./icon.svg", self.worker)
        self.assertIn('"display": "standalone"', self.manifest)
        self.assertIn('"src": "./icon.svg"', self.manifest)
        self.assertIn('rel="manifest"', self.html)
        self.assertTrue((ROOT / "icon.svg").is_file())
        self.assertTrue((ROOT / "quantum-config.js").is_file())

    def test_responsive_and_accessible_shell(self):
        self.assertRegex(self.css, re.compile(r"@media\s*\(max-width:\s*760px\)"))
        self.assertIn('aria-label="Search apps and actions"', self.html)
        self.assertIn('aria-live="polite"', self.html)
        self.assertIn("prefers-reduced-motion", self.css)

    def test_runtime_recovery_and_cache_safety(self):
        self.assertIn('panel.id = "quantum-fatal-screen"', self.html)
        self.assertIn('dataset.quantumBooted !== "true"', self.html)
        self.assertIn('dataset.quantumBooted = "true"', self.js)
        self.assertIn('key.startsWith(CACHE_PREFIX)', self.worker)
        self.assertIn('if (fallback) return fallback', self.worker)
        self.assertIn('Quantum OS is offline', self.worker)

    def test_q_number_is_server_assigned_not_fabricated(self):
        self.assertIn('data-app="qnumber"', self.html)
        self.assertIn('function renderQNumber(body)', self.js)
        self.assertIn('fetch(apiBase + "/v1/q-number"', self.js)
        self.assertIn('!/^Q# [0-9]{8}$/.test(data.qNumber)', self.js)
        self.assertIn('Registration is not live yet.', self.js)
        self.assertIn('carrier phone number', self.js)
        self.assertIn('quantum-config.js', self.html)
        self.assertIn('turnstileToken', self.js)

    def test_calculator_does_not_execute_dynamic_code(self):
        self.assertIn("function factor()", self.js)
        self.assertIn("function term()", self.js)
        self.assertIn("function sum()", self.js)
        self.assertNotIn("Function(", self.js)

    def test_no_fake_native_os_or_6g_claims(self):
        self.assertIn("not a replacement kernel", self.js)
        self.assertIn("Not claimed", self.js)
        self.assertNotIn("guaranteed 6g", (ROOT / "README.md").read_text(encoding="utf-8").lower())


if __name__ == "__main__":
    unittest.main(verbosity=2)
