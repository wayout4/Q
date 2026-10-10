(() => {
  "use strict";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const layer = $("#window-layer");
  const toast = $("#toast");
  let toastTimer;
  let calcExpression = "";
  let calcJustEvaluated = false;

  const appInfo = {
    notes: { title: "Notes", description: "A local-first notepad. Notes stay in this browser on this device." },
    calculator: { title: "Calculator", description: "Basic arithmetic with guarded expression evaluation." },
    network: { title: "Network", description: "Browser-reported connectivity status and capability limits." },
    settings: { title: "Settings", description: "Personalize this Quantum OS workspace." },
    about: { title: "About Quantum", description: "Build identity and platform information." },
    qnumber: { title: "My Quantum Q#", description: "Your unique Quantum identifier, separate from a carrier phone number." },
    messages: { title: "Quantum Messages", description: "Send and receive messages using Quantum Q# identities." },
    quantum: { title: "Quantum Lab", description: "A browser-based state-vector simulator for small quantum circuits." }
  };

  function notify(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("visible"), 2400);
  }

  function tickClock() {
    $("#clock").textContent = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date());
  }

  function updateNetwork() {
    const online = navigator.onLine;
    $("#network-dot").classList.toggle("offline", !online);
    $("#network-label").textContent = online ? "Browser online" : "Offline mode";
    $("#connectivity-value").textContent = online ? "Connected" : "Offline";
    $("#connectivity-detail").textContent = online ? "Browser reports a network connection" : "Local apps remain available";
    $("#footer-network").textContent = online ? "Network-aware · Local-first" : "Offline mode · Local apps available";
  }

  function safeText(value) {
    return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  function openApp(name) {
    const info = appInfo[name];
    if (!info) return;
    layer.replaceChildren();
    const win = document.createElement("section");
    win.className = "app-window";
    win.setAttribute("role", "dialog");
    win.setAttribute("aria-modal", "true");
    win.setAttribute("aria-labelledby", "window-title");
    win.innerHTML = '<div class="window-titlebar"><h3 id="window-title"></h3><button class="window-close" aria-label="Close window">×</button></div><div class="window-body"></div>';
    $(".window-titlebar h3", win).textContent = info.title;
    const body = $(".window-body", win);
    $(".window-close", win).addEventListener("click", () => layer.replaceChildren());
    layer.append(win);

    if (name === "notes") renderNotes(body);
    else if (name === "calculator") renderCalculator(body);
    else if (name === "network") renderNetwork(body);
    else if (name === "settings") renderSettings(body);
    else if (name === "qnumber") renderQNumber(body);
    else if (name === "messages") renderMessages(body);
    else if (name === "quantum") renderQuantumLab(body);
    else renderAbout(body);

    $(".window-close", win).focus();
  }

  function renderNotes(body) {
    body.innerHTML = '<p>Saved only in this browser profile. Clearing browser site data can remove these notes.</p><label for="notes-text">Your note</label><textarea id="notes-text" maxlength="20000" placeholder="Capture an idea…"></textarea><button class="primary-button" id="save-note">Save note</button><button class="secondary-button" id="clear-note">Clear</button>';
    const field = $("#notes-text", body);
    try { field.value = localStorage.getItem("quantum-os-note") || ""; }
    catch { field.value = ""; notify("Local storage is unavailable; notes may not persist."); }
    $("#save-note", body).addEventListener("click", () => {
      try { localStorage.setItem("quantum-os-note", field.value); notify("Note saved on this device."); }
      catch { notify("Could not save: browser storage is unavailable or full."); }
    });
    $("#clear-note", body).addEventListener("click", () => {
      field.value = "";
      try { localStorage.removeItem("quantum-os-note"); notify("Note cleared."); }
      catch { notify("Could not clear browser storage."); }
    });
  }

  function calculate(expression) {
    if (!expression || !/^[\d\s()+\-*\/%.]+$/.test(expression)) throw new Error("Only basic arithmetic is supported.");
    let index = 0;
    const input = expression.replace(/\s+/g, "");
    function number() {
      const begin = index;
      while (/[0-9.]/.test(input[index] || "") && index < input.length) index++;
      const token = input.slice(begin, index);
      if (!token || (token.match(/\./g) || []).length > 1) throw new Error("Invalid number.");
      const value = Number(token);
      if (!Number.isFinite(value)) throw new Error("Invalid number.");
      return value;
    }
    function factor() {
      if (input[index] === "+") { index++; return factor(); }
      if (input[index] === "-") { index++; return -factor(); }
      if (input[index] === "(") {
        index++;
        const value = sum();
        if (input[index] !== ")") throw new Error("Missing closing parenthesis.");
        index++;
        return value;
      }
      return number();
    }
    function term() {
      let value = factor();
      while (["*", "/", "%"].includes(input[index])) {
        const operator = input[index++];
        const right = factor();
        if ((operator === "/" || operator === "%") && right === 0) throw new Error("Division by zero is not allowed.");
        value = operator === "*" ? value * right : operator === "/" ? value / right : value % right;
      }
      return value;
    }
    function sum() {
      let value = term();
      while (input[index] === "+" || input[index] === "-") {
        const operator = input[index++];
        const right = term();
        value = operator === "+" ? value + right : value - right;
      }
      return value;
    }
    const result = sum();
    if (index !== input.length) throw new Error("Invalid arithmetic expression.");
    if (!Number.isFinite(result)) throw new Error("Result is not a finite number.");
    return String(Number(result.toPrecision(12)));
  }

  function renderCalculator(body) {
    body.innerHTML = '<p>Basic arithmetic only. No variables, property access, or external code.</p><div class="calc-display" id="calc-display" aria-live="polite">0</div><div class="calc-grid">' +
      ["7","8","9","/","4","5","6","*","1","2","3","-","0",".","(",")","+","%","C","⌫","="].map(key => '<button type="button" data-key="' + key + '">' + key + '</button>').join("") +
      '</div>';
    const display = $("#calc-display", body);
    $$(".calc-grid button", body).forEach(button => button.addEventListener("click", () => {
      const key = button.dataset.key;
      if (key === "C") { calcExpression = ""; calcJustEvaluated = false; display.textContent = "0"; return; }
      if (key === "⌫") { calcExpression = calcExpression.slice(0, -1); calcJustEvaluated = false; display.textContent = calcExpression || "0"; return; }
      if (key === "=") {
        try { calcExpression = calculate(calcExpression); display.textContent = calcExpression; calcJustEvaluated = true; }
        catch (error) { display.textContent = error.message; calcExpression = ""; calcJustEvaluated = false; }
        return;
      }
      if (calcJustEvaluated && /[\d.(]/.test(key)) calcExpression = "";
      calcJustEvaluated = false;
      calcExpression += key;
      display.textContent = calcExpression;
    }));
  }

  function renderNetwork(body) {
    const online = navigator.onLine;
    body.innerHTML = '<p>This panel separates browser reachability hints from verified radio information. Browser online status does not guarantee internet or service reachability. It never guesses a cellular generation.</p>' +
      '<div class="info-list"><span>Browser connectivity</span><strong>' + (online ? "Online" : "Offline") + '</strong>' +
      '<span>Radio access technology</span><strong id="qos-rat">Checking…</strong>' +
      '<span>Signal source</span><strong id="qos-rat-source">Checking…</strong>' +
      '<span>Effective connection hint</span><strong id="qos-effective-type">Unknown</strong>' +
      '<span>Estimated downlink</span><strong id="qos-downlink">Not exposed</strong>' +
      '<span>Round-trip hint</span><strong id="qos-rtt">Not exposed</strong>' +
      '<span>Service reachability</span><strong>Not verified</strong>' +
      '<span>6G status</span><strong>Not available/verified by this app</strong>' +
      '<span>Offline app shell</span><strong>' + ("serviceWorker" in navigator ? "Supported" : "Unavailable") + '</strong></div>' +
      '<p id="qos-rat-limitation" role="status">Loading device-reported network capabilities…</p>' +
      '<button class="primary-button" id="refresh-network">Refresh status</button>';
    const text = (selector, value) => { const node = $(selector, body); if (node) node.textContent = value; };
    const refresh = () => {
      updateNetwork();
      text("#qos-rat", "Checking…");
      text("#qos-rat-source", "Checking…");
      const adapter = window.QOSConnectivity;
      if (!adapter || typeof adapter.getSnapshot !== "function") {
        text("#qos-rat", "Unknown");
        text("#qos-rat-source", "Browser fallback");
        text("#qos-effective-type", "Unknown");
        text("#qos-downlink", "Not exposed");
        text("#qos-rtt", "Not exposed");
        text("#qos-rat-limitation", "Connectivity adapter unavailable. Cellular generation cannot be inferred safely.");
        return;
      }
      adapter.getSnapshot().then(snapshot => {
        text("#qos-rat", snapshot.radioAccessTechnology || "Unknown");
        text("#qos-rat-source", snapshot.source === "native" ? "Native device adapter" : "Browser API");
        text("#qos-effective-type", snapshot.effectiveType || "Unknown");
        text("#qos-downlink", Number.isFinite(snapshot.downlinkMbps) ? snapshot.downlinkMbps + " Mbps (estimate)" : "Not exposed");
        text("#qos-rtt", Number.isFinite(snapshot.rttMs) ? snapshot.rttMs + " ms (estimate)" : "Not exposed");
        text("#qos-rat-limitation", snapshot.limitation || "Device-reported values; service reachability not tested.");
      }).catch(() => {
        text("#qos-rat", "Unknown");
        text("#qos-rat-source", "Browser fallback");
        text("#qos-rat-limitation", "Could not read device capability data; no radio generation is assumed.");
      });
    };
    $("#refresh-network", body).addEventListener("click", refresh);
    refresh();
  }

  function renderSettings(body) {
    body.innerHTML = '<p>Preferences are stored locally in this browser when storage is available.</p><label for="theme-select">Appearance</label><select id="theme-select"><option value="dark">Quantum Dark</option><option value="light">Light</option></select><button class="primary-button" id="apply-theme">Apply appearance</button><p>Quantum OS does not request location, microphone, contacts, or other device permissions in this build.</p>';
    const select = $("#theme-select", body);
    select.value = document.body.classList.contains("light") ? "light" : "dark";
    $("#apply-theme", body).addEventListener("click", () => {
      document.body.classList.toggle("light", select.value === "light");
      try { localStorage.setItem("quantum-os-theme", select.value); } catch { /* Session-only fallback. */ }
      notify("Appearance updated.");
    });
  }


  function getInstallId() {
    const key = "quantum-os-install-id";
    try {
      let id = localStorage.getItem(key);
      if (!id) {
        id = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
          ? crypto.randomUUID()
          : Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, "0")).join("");
        localStorage.setItem(key, id);
      }
      return id;
    } catch {
      return "";
    }
  }

  function getClientToken() {
    const key = "quantum-os-client-token";
    try {
      let token = localStorage.getItem(key);
      if (!token) {
        token = Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, "0")).join("");
        localStorage.setItem(key, token);
      }
      return token;
    } catch {
      return "";
    }
  }

  function renderQNumber(body) {
    const config = window.QUANTUM_CONFIG || {};
    const apiBase = typeof config.apiBase === "string" ? config.apiBase.replace(/\/$/, "") : "";
    const siteKey = typeof config.turnstileSiteKey === "string" ? config.turnstileSiteKey : "";
    let turnstileToken = "";
    let turnstileWidget = null;
    let busy = false;
    let qNumber = "";
    try { qNumber = localStorage.getItem("quantum-os-q-number") || ""; } catch { /* Session-only fallback. */ }
    body.innerHTML = '<p>A Q# is your Quantum identity for Quantum services. It is <strong>not</strong> a carrier phone number and does not by itself provide calls, SMS, emergency calling, or mobile data.</p>' +
      '<div class="qnumber-card" aria-live="polite"><span class="qnumber-label">YOUR Q# ORIGIN.QUANTA</span><strong id="q-number-value">Not registered</strong><span id="q-number-status">This browser has not confirmed a server-assigned Q#.</span></div>' +
      '<p id="q-number-explainer">Registration requires the live Quantum identity API and a bot-protection check. Your number is stored on the Quantum service, not generated as a fake local number.</p>' +
      '<div id="q-turnstile" class="q-turnstile"></div><p id="q-number-message" role="status" aria-live="polite"></p>' +
      '<button class="primary-button" id="q-number-register" type="button" disabled>Connect to Quantum registration</button>' +
      '<p class="qnumber-note">Current account model: one Q# per browser installation. Cross-device recovery and verified human accounts are future work; do not treat this identifier as a verified person or as a private credential.</p>';
    const value = $("#q-number-value", body);
    const status = $("#q-number-status", body);
    const message = $("#q-number-message", body);
    const button = $("#q-number-register", body);
    const challenge = $("#q-turnstile", body);
    function setMessage(text) { message.textContent = text; }
    if (qNumber) {
      value.textContent = qNumber;
      status.textContent = "Previously server-assigned on this browser. Recheck registration to confirm it is still available.";
    }
    if (!apiBase || !siteKey) {
      status.textContent = qNumber ? status.textContent : "Registration is not live yet.";
      setMessage("Setup required: configure the Quantum API URL and public Turnstile site key in quantum-config.js, then deploy the Worker and database.");
      button.textContent = "Registration not configured";
      return;
    }
    const installId = getInstallId();
    const clientToken = getClientToken();
    if (!installId || !clientToken) {
      setMessage("Browser storage is blocked. Enable site storage and reload to create a stable installation ID.");
      return;
    }
    button.disabled = true;
    button.textContent = "Waiting for security check…";
    function enableIfReady() {
      button.disabled = !turnstileToken || busy;
      button.textContent = busy ? "Registering…" : "Assign my Q#";
    }
    function loadTurnstile() {
      if (window.turnstile) { mountTurnstile(); return; }
      const existing = document.querySelector('script[data-quantum-turnstile]');
      if (existing) { existing.addEventListener("load", mountTurnstile, { once: true }); return; }
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.quantumTurnstile = "true";
      script.addEventListener("load", mountTurnstile, { once: true });
      script.addEventListener("error", () => {
        setMessage("Security check could not load. Check your connection or content blocker and retry.");
        button.disabled = true;
      }, { once: true });
      document.head.append(script);
    }
    function mountTurnstile() {
      if (!window.turnstile || !challenge.isConnected || turnstileWidget !== null) return;
      try {
        turnstileWidget = window.turnstile.render(challenge, {
          sitekey: siteKey,
          callback: token => { turnstileToken = token; enableIfReady(); },
          "expired-callback": () => { turnstileToken = ""; enableIfReady(); },
          "error-callback": () => { turnstileToken = ""; enableIfReady(); setMessage("Security check failed to load. Retry the check."); }
        });
        setMessage("Complete the security check to request a server-assigned Q#.");
      } catch {
        setMessage("Security check could not start. Close and reopen My Q# to retry.");
      }
    }
    loadTurnstile();
    button.addEventListener("click", async () => {
      if (busy || !turnstileToken) return;
      busy = true; enableIfReady(); setMessage("Contacting Quantum registration…");
      try {
        const response = await fetch(apiBase + "/v1/q-number", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ installId, turnstileToken, clientToken })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Registration service returned HTTP " + response.status);
        if (typeof data.qNumber !== "string" || !/^[1-9][0-9]*\.00000000$/.test(data.qNumber)) {
          throw new Error("The service returned an invalid Q# response.");
        }
        qNumber = data.qNumber;
        value.textContent = qNumber;
        status.textContent = "Server-assigned and confirmed for this browser installation.";
        try { localStorage.setItem("quantum-os-q-number", qNumber); } catch { /* Show the confirmed number for this session. */ }
        setMessage("Your Q# is assigned. Save it somewhere safe; account recovery is not yet available.");
        if (window.turnstile && turnstileWidget !== null) window.turnstile.reset(turnstileWidget);
        turnstileToken = "";
      } catch (error) {
        setMessage((error && error.message ? error.message : "Registration failed") + " Nothing was registered locally as a substitute. Retry when the service is available.");
        if (window.turnstile && turnstileWidget !== null) {
          try { window.turnstile.reset(turnstileWidget); } catch { /* User can close and reopen the panel. */ }
        }
        turnstileToken = "";
      } finally {
        busy = false; enableIfReady();
      }
    });
  }

  function renderMessages(body) {
    const config = window.QUANTUM_CONFIG || {};
    const apiBase = typeof config.apiBase === "string" ? config.apiBase.replace(/\/$/, "") : "";
    const token = getClientToken();
    let after = 0;
    body.innerHTML = '<p>Message another Quantum user by their Q#. Messages use HTTPS in transit and are stored by the service. <strong>This release is not end-to-end encrypted.</strong> Do not send sensitive information.</p>' +
      '<label for="message-recipient">Recipient Q#</label><input id="message-recipient" inputmode="decimal" placeholder="e.g. 2.00000000" autocomplete="off" maxlength="40">' +
      '<label for="message-body">Message</label><textarea id="message-body" maxlength="4000" rows="4" placeholder="Write a message…"></textarea>' +
      '<button class="primary-button" id="message-send" type="button">Send message</button> <button class="secondary-button" id="message-refresh" type="button">Refresh inbox</button>' +
      '<p id="message-status" role="status" aria-live="polite"></p><h4>Inbox</h4><div id="message-inbox" class="info-list"></div>';
    const status = $("#message-status", body);
    const recipient = $("#message-recipient", body);
    const messageBody = $("#message-body", body);
    const inbox = $("#message-inbox", body);
    const send = $("#message-send", body);
    const refresh = $("#message-refresh", body);
    const qNumber = (() => { try { return localStorage.getItem("quantum-os-q-number") || ""; } catch { return ""; } })();
    if (!apiBase || !token) {
      status.textContent = "Messaging setup is not available. Configure the live API and enable browser storage.";
      send.disabled = true; refresh.disabled = true; return;
    }
    if (!qNumber) {
      status.textContent = "Register this browser in My Q# before sending or receiving messages.";
      send.disabled = true; refresh.disabled = true; return;
    }
    async function api(path, options = {}) {
      const response = await fetch(apiBase + path, {
        ...options,
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token, ...(options.headers || {}) }
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Quantum API returned HTTP " + response.status);
      return data;
    }
    async function loadInbox() {
      refresh.disabled = true;
      try {
        const data = await api("/v1/messages?after=" + after, { method: "GET", headers: {} });
        if (after === 0) inbox.replaceChildren();
        for (const item of data.messages || []) {
          const card = document.createElement("article");
          card.className = "message-item";
          const heading = document.createElement("strong");
          heading.textContent = "From " + item.fromQNumber;
          const timestamp = document.createElement("small");
          timestamp.textContent = item.createdAt ? new Date(item.createdAt).toLocaleString() : "";
          const text = document.createElement("p");
          text.textContent = item.body || "";
          card.append(heading, timestamp, text);
          inbox.append(card);
        }
        after = Math.max(after, Number(data.nextAfter) || after);
        status.textContent = (data.messages || []).length ? "Inbox refreshed." : "No new messages.";
      } catch (error) {
        status.textContent = error.message || "Could not load inbox.";
      } finally { refresh.disabled = false; }
    }
    send.addEventListener("click", async () => {
      const toQNumber = recipient.value.trim();
      const bodyText = messageBody.value.trim();
      if (!toQNumber || !bodyText) { status.textContent = "Enter a recipient Q# and a message."; return; }
      send.disabled = true;
      try {
        await api("/v1/messages", { method: "POST", body: JSON.stringify({ toQNumber, body: bodyText }) });
        messageBody.value = "";
        status.textContent = "Message sent to " + toQNumber + ".";
      } catch (error) {
        status.textContent = error.message || "Message could not be sent.";
      } finally { send.disabled = false; }
    });
    refresh.addEventListener("click", loadInbox);
    loadInbox();
  }

  function renderQuantumLab(body) {
    if (!window.QuantumSimulator) {
      body.textContent = "Quantum simulator failed to load. Reload Quantum OS and try again.";
      return;
    }
    body.innerHTML = '<p>This is a classical state-vector simulation of quantum circuits, not quantum hardware. State-vector memory grows exponentially, so this lab is limited to 10 qubits.</p>' +
      '<div class="quantum-controls"><label for="quantum-qubits">Qubits</label><select id="quantum-qubits"><option value="1">1 qubit</option><option value="2" selected>2 qubits</option><option value="3">3 qubits</option><option value="4">4 qubits</option><option value="5">5 qubits</option><option value="6">6 qubits</option><option value="7">7 qubits</option><option value="8">8 qubits</option><option value="9">9 qubits</option><option value="10">10 qubits</option></select>' +
      '<label for="quantum-gate">Gate</label><select id="quantum-gate"><option>H</option><option>X</option><option>Y</option><option>Z</option><option>S</option><option>T</option><option>CNOT</option></select>' +
      '<label for="quantum-target">Target qubit</label><select id="quantum-target"><option value="0">Qubit 0</option><option value="1">Qubit 1</option></select>' +
      '<button class="primary-button" id="quantum-apply">Apply gate</button><button class="secondary-button" id="quantum-bell">Bell pair demo</button><button class="secondary-button" id="quantum-dj">Deutsch–Jozsa demo</button><button class="secondary-button" id="quantum-measure">Measure</button><button class="secondary-button" id="quantum-reset">Reset</button></div>' +
      '<p id="quantum-status" role="status">Ready. Basis states are shown as |q(n-1)…q0⟩.</p><div id="quantum-state" class="quantum-state"></div><h4>Circuit history</h4><ol id="quantum-history" class="quantum-history"></ol>';
    const $q = selector => $(selector, body);
    let circuit = window.QuantumSimulator.createCircuit(2);
    function render() {
      const snap = circuit.snapshot();
      $q("#quantum-state").replaceChildren();
      for (const item of snap.state) {
        const row = document.createElement("div");
        row.className = "quantum-state-row";
        const label = document.createElement("span");
        label.textContent = "|" + item.basis + "⟩";
        const bar = document.createElement("span");
        bar.className = "quantum-probability-bar";
        const fill = document.createElement("span");
        fill.style.width = (item.probability * 100) + "%";
        bar.append(fill);
        const value = document.createElement("strong");
        value.textContent = (item.probability * 100).toFixed(2) + "%";
        row.append(label, bar, value);
        $q("#quantum-state").append(row);
      }
      $q("#quantum-history").replaceChildren();
      for (const item of snap.history) {
        const li = document.createElement("li");
        li.textContent = item.gate + (item.qubits ? " q" + item.qubits.join(", q") : item.outcome ? " → " + item.outcome : "");
        $q("#quantum-history").append(li);
      }
      $q("#quantum-target").innerHTML = Array.from({ length: snap.qubits }, (_, i) => '<option value="' + i + '">Qubit ' + i + '</option>').join("");
      $q("#quantum-gate").querySelector('option[value="CNOT"]')?.remove();
      if (snap.qubits > 1 && !$q("#quantum-gate").querySelector('option[value="CNOT"]')) {
        const option = document.createElement("option"); option.value = "CNOT"; option.textContent = "CNOT"; $q("#quantum-gate").append(option);
      }
      $q("#quantum-status").textContent = snap.qubits + " qubit(s) · " + snap.state.length + " basis states · total probability " + snap.totalProbability.toFixed(6);
    }
    $q("#quantum-qubits").addEventListener("change", event => {
      circuit = window.QuantumSimulator.createCircuit(Number(event.target.value));
      render();
    });
    $q("#quantum-apply").addEventListener("click", () => {
      try {
        const gate = $q("#quantum-gate").value, target = Number($q("#quantum-target").value);
        if (gate === "CNOT") circuit.cnot(target, (target + 1) % Number($q("#quantum-qubits").value));
        else circuit[gate.toLowerCase()](target);
        render();
      } catch (error) { $q("#quantum-status").textContent = error.message; }
    });
    $q("#quantum-bell").addEventListener("click", () => {
      $q("#quantum-qubits").value = "2";
      circuit = window.QuantumSimulator.bellState();
      render();
      $q("#quantum-status").textContent = "Bell pair prepared: |00⟩ and |11⟩ each have 50% probability.";
    });
    $q("#quantum-dj").addEventListener("click", () => {
      const result = window.QuantumSimulator.deutschJozsa({ qubits: 3, oracle: "balanced" });
      const output = result.measuredInput.toString(2).padStart(result.qubits, "0");
      $q("#quantum-status").textContent = "Deutsch–Jozsa · balanced oracle · deterministic simulated input result |" + output + "⟩. Distribution: " + result.distribution.map((p, i) => i.toString(2).padStart(result.qubits, "0") + "=" + (p * 100).toFixed(1) + "%").join(", ");
    });
    $q("#quantum-measure").addEventListener("click", () => {
      const result = circuit.measure();
      render();
      $q("#quantum-status").textContent = "Measured |" + result.bitstring + "⟩; probability before collapse " + (result.probability * 100).toFixed(2) + "%.";
    });
    $q("#quantum-reset").addEventListener("click", () => { circuit.reset(); render(); });
    render();
  }

  function renderAbout(body) {
    body.innerHTML = '<p>Quantum OS Web Edition is a progressive web workspace, not a replacement kernel or a native mobile operating system.</p><div class="info-list"><span>Edition</span><strong>Web</strong><span>Build</span><strong>0.1.0</strong><span>Storage model</span><strong>Local-first</strong><span>Network model</span><strong>Best effort</strong><span>6G</span><strong>Not claimed</strong><span>Platform</span><strong id="about-platform"></strong></div>';
    $("#about-platform", body).textContent = navigator.userAgentData?.platform || navigator.platform || "Browser";
  }

  function filterApps(query) {
    const normalized = query.trim().toLowerCase();
    let visible = 0;
    $$(".app-tile").forEach(tile => {
      const matches = (tile.textContent + " " + tile.dataset.app).toLowerCase().includes(normalized);
      tile.hidden = !matches;
      if (matches) visible++;
    });
    $("#no-results").hidden = visible !== 0;
    $("#app-count").textContent = visible + (visible === 1 ? " app" : " apps");
  }

  $$(".app-tile,[data-app]", document).forEach(button => {
    if (!button.dataset.app) return;
    button.addEventListener("click", () => openApp(button.dataset.app));
  });
  $("#quick-settings").addEventListener("click", () => openApp("settings"));
  $("#app-search").addEventListener("input", event => filterApps(event.target.value));
  $("#app-search").addEventListener("keydown", event => {
    if (event.key === "Enter") {
      const first = $(".app-tile:not([hidden])");
      if (first) openApp(first.dataset.app);
      else notify("No matching app found.");
    }
    if (event.key === "Escape") { event.target.value = ""; filterApps(""); }
  });

  try {
    const theme = localStorage.getItem("quantum-os-theme");
    if (theme === "light") document.body.classList.add("light");
  } catch { /* Preferences remain session-only when storage is blocked. */ }

  $("#platform-label").textContent = navigator.userAgentData?.platform || navigator.platform || "Browser";
  tickClock();
  updateNetwork();
  setInterval(tickClock, 15000);
  window.addEventListener("online", updateNetwork);
  window.addEventListener("offline", updateNetwork);

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {
      // Core features still work without offline caching.
    }));
  }
  document.documentElement.dataset.quantumBooted = "true";
})();
