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
        for app in ("notes", "calculator", "network", "settings", "about"):
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
        self.assertIn('"display": "standalone"', self.manifest)
        self.assertIn('rel="manifest"', self.html)

    def test_responsive_and_accessible_shell(self):
        self.assertRegex(self.css, re.compile(r"@media\s*\(max-width:\s*760px\)"))
        self.assertIn('aria-label="Search apps and actions"', self.html)
        self.assertIn('aria-live="polite"', self.html)
        self.assertIn("prefers-reduced-motion", self.css)

    def test_no_fake_native_os_or_6g_claims(self):
        self.assertIn("not a replacement kernel", self.js)
        self.assertIn("Not claimed", self.js)
        self.assertNotIn("guaranteed 6G", (ROOT / "README.md").read_text(encoding="utf-8").lower())


if __name__ == "__main__":
    unittest.main(verbosity=2)
