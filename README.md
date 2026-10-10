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

## Q# messaging service

The Worker exposes the initial Q# messaging API:
- `POST /v1/q-number` assigns an idempotent browser-installation Q# after Turnstile verification and binds a client-generated random device token. Only a SHA-256 hash of that token is stored.
- `GET /v1/identity?qNumber=1.00000000` checks whether a Q# exists.
- `POST /v1/messages` sends a message to a recipient Q# using the authenticated device token.
- `GET /v1/messages?after=0` retrieves up to 50 inbox messages after the supplied message ID.
- Registration and message sends are rate-limited; the API enforces the exact GitHub Pages origin.

**Security limitations:** this initial messaging release uses HTTPS in transit but stores message bodies as readable text in D1. It is **not end-to-end encrypted**, has no verified human accounts, and has no account/device recovery. The bearer token is kept in browser local storage, so browser-profile access or an XSS vulnerability could expose it. Do not use this for sensitive communications. End-to-end encryption, key verification, recovery, message deletion/retention controls, and production abuse monitoring are separate release gates.

Unit and browser tests can validate code paths, but only a successful Cloudflare provisioning workflow and two independently registered browser installations can prove live user-to-user delivery.

## Public deployment

To provision the real Q# assignment service, open **Settings → Secrets and variables → Actions** and add repository secrets `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`. The token must be scoped to this Cloudflare account with **D1 Edit**, **Workers Scripts Edit**, and **Turnstile Sites Read + Write**. Then open **Actions → Deploy Q# API and site → Run workflow**. That workflow creates or reuses the D1 database and Turnstile widget, applies the schema, deploys the rate-limited Worker, checks live readiness and rejection paths, writes the public API URL/site key to `quantum-config.js`, and deploys the configured site. Never commit the Cloudflare API token or Turnstile secret. The workflow cannot run successfully until those two secrets are set by an account-authorized person. After it succeeds, open the site and complete the Turnstile check to receive a real Q#; the system cannot complete that user verification on your behalf.


The repository includes a GitHub Pages deployment workflow. On the first deployment, it attempts to enable Pages through GitHub Actions. If repository policy blocks that operation, open **Settings → Pages**, set the build and deployment source to **GitHub Actions**, then rerun the **Deploy Quantum OS Web Edition** workflow. A live URL is only confirmed after the deployment job succeeds.

## Release package

Every successful CI run uploads a `quantum-os-web` artifact with the static application files and a `SHA256SUMS` file. Use the [Actions page](https://github.com/wayout4/Q/actions) to retrieve the artifact from a successful run.

## Current limitations

- This is a web workspace, not a bootable OS image or native mobile app.
- No user accounts, cloud synchronization, app store, kernel, drivers, or privileged device controls are implemented.
- Service-worker support requires HTTPS or localhost.
- Static tests do not substitute for browser E2E, accessibility audits, or physical-device verification.

## Real quantum hardware (no simulator fallback)

QOS now includes an opt-in IBM Quantum Platform hardware job in `qpu/`. It submits a two-qubit Bell-state circuit to an operational, non-simulator QPU, waits for the provider result, and emits a report containing the hardware backend name, provider job ID, shot count, and measured counts. The job fails closed if credentials or hardware access are missing; it never substitutes the local Quantum Lab simulator.

To enable it without Cloudflare:

1. Create/authorize an IBM Quantum Platform account and API key, and confirm access to a Quantum Compute instance and QPU quota. IBM's official setup guide: https://quantum.cloud.ibm.com/docs/en/guides/cloud-setup-rest-api
2. In this GitHub repository, open **Settings → Secrets and variables → Actions**. Add secret `IBM_QUANTUM_API_KEY`; optionally add `IBM_QUANTUM_INSTANCE` as a repository variable/secret containing the instance CRN if your account requires it. Never paste credentials into chat, source files, or workflow logs.
3. Open **Actions → Run real quantum hardware job → Run workflow**. The workflow installs Qiskit, submits a job to a real provider QPU, and uploads `qos-real-quantum-hardware-result` if the job completes.
4. Verify the artifact's `execution` value is `real-qpu` and use its backend name and job ID to cross-check the job in the IBM Quantum Platform dashboard.

This is a real hardware execution path, not an already-connected always-on service. It will not run until valid provider credentials, an authorized instance, available hardware, and any required quota are configured. The GitHub Pages browser app cannot safely hold a private quantum-provider key, so this workflow is a secure server-side execution route rather than a direct browser-to-QPU connection. It does not make the project a 6G network or create carrier infrastructure.
