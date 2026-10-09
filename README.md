# Quantum OS — Web Edition

Quantum OS is a responsive, installable **web operating environment**. This repository starts with a usable, local-first workspace and a verification pipeline; it is not a native kernel or a replacement for Android, iOS, Windows, or Linux.

## Features in this build

- Responsive desktop and mobile layout with accessible labels and reduced-motion support.
- Searchable app launcher and quick-launch dock.
- Notes stored locally in the browser, with visible storage-failure handling.
- Q# identity-registration interface with explicit API configuration, server-assigned identifiers, Turnstile bot protection, and no fabricated local number when the backend is missing. Q# is an identity handle, not a telephone service.
- Calculator for basic arithmetic using a dedicated parser rather than dynamic code evaluation.
- Network panel based on the browser's online/offline signal. It explicitly does not claim end-to-end internet reachability or a specific cellular generation.
- Light/dark appearance preference.
- Service worker that caches the application shell for supported offline use.
- GitHub Actions checks for JavaScript syntax, acceptance contracts, manifest validity, package contents, and SHA-256 checksums.

## Run locally

A service worker requires localhost or HTTPS. With Python 3 installed:

```sh
python3 -m http.server 8080
```

Then open http://localhost:8080.

Run the repository checks:

```sh
node --check app.js
python3 -m unittest discover -s tests -v
python3 -m json.tool manifest.webmanifest
```

## Acceptance criteria

A release is accepted only for the implemented web-edition scope when:

1. JavaScript syntax checks pass.
2. All contract tests pass.
3. The manifest parses as valid JSON.
4. All required static assets exist and resolve through relative paths.
5. CI packages the web application and verifies every SHA-256 checksum.
6. Critical user journeys are manually or automatically tested in supported browsers.
7. Offline caching is verified after one successful online load in a real browser.
8. Browser storage denial, offline/online transitions, mobile layout, keyboard navigation, and calculator error handling are checked.
9. Security and privacy claims remain limited to what the implementation actually provides.

The current CI provides static contract checks and packaging validation. It does **not** by itself prove browser end-to-end behavior, mobile installation on every device, or offline behavior on physical hardware. Those need browser/device test evidence before the corresponding release gate can be marked complete.

## Connectivity and 6G

Quantum OS uses the connectivity exposed by its host browser and device. `navigator.onLine` is only a browser hint; it does not prove a remote service is reachable. This project does not implement a cellular modem, carrier integration, 5G/6G radio access, or a native network stack. Future 6G readiness would require real standards-based platform integrations and compatible hardware/service; no live 6G support is claimed.

## Privacy and storage

Notes and appearance preferences are stored in the current browser profile. They are not synced to a cloud account. Clearing browser site data may remove them. This build does not request location, microphone, contacts, or other device permissions.

## Public deployment

The repository includes a GitHub Pages deployment workflow. On the first deployment, it attempts to enable Pages through GitHub Actions. If repository policy blocks that operation, open **Settings → Pages**, set the build and deployment source to **GitHub Actions**, then rerun the **Deploy Quantum OS Web Edition** workflow. A live URL is only confirmed after the deployment job succeeds.

## Release package

Every successful CI run uploads a `quantum-os-web` artifact with the static application files and a `SHA256SUMS` file. Use the [Actions page](https://github.com/wayout4/Q/actions) to retrieve the artifact from a successful run.

## Current limitations

- This is a web workspace, not a bootable OS image or native mobile app.
- No user accounts, cloud synchronization, app store, kernel, drivers, or privileged device controls are implemented.
- Service-worker support requires HTTPS or localhost.
- Static tests do not substitute for browser E2E, accessibility audits, or physical-device verification.
