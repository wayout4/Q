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
    about: { title: "About Quantum", description: "Build identity and platform information." }
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
    if (!expression || !/^[\d\s()+\-*/%.]+$/.test(expression)) throw new Error("Only basic arithmetic is supported.");
    if (/[/][\s]*0(?:\D|$)/.test(expression)) throw new Error("Division by zero is not allowed.");
    const result = Function('"use strict"; return (' + expression + ')')();
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
})();
