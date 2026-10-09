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
    qnumber: { title: "My Quantum Q#", description: "Your unique Quantum identifier, separate from a carrier phone number." }
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
    body.innerHTML = '<p>This status comes from the browser and does not guarantee that the internet, a specific service, or a carrier network is reachable.</p><div class="info-list"><span>Browser connectivity</span><strong>' + (online ? "Online" : "Offline") + '</strong><span>Service reachability</span><strong>Not tested</strong><span>Radio generation</span><strong>Not exposed here</strong><span>5G / 6G status</span><strong>Not verified</strong><span>Offline app shell</span><strong>' + ("serviceWorker" in navigator ? "Supported" : "Unavailable") + '</strong></div><button class="primary-button" id="refresh-network">Refresh status</button>';
    $("#refresh-network", body).addEventListener("click", () => { updateNetwork(); renderNetwork(body); });
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
      '<div class="qnumber-card" aria-live="polite"><span class="qnumber-label">YOUR QUANTUM NUMBER</span><strong id="q-number-value">Not registered</strong><span id="q-number-status">This browser has not confirmed a server-assigned Q#.</span></div>' +
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
    if (!installId) {
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
          body: JSON.stringify({ installId, turnstileToken })
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || "Registration service returned HTTP " + response.status);
        if (typeof data.qNumber !== "string" || !/^Q# [0-9]{8}$/.test(data.qNumber)) {
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
