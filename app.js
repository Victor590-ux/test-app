// Befund-App (PWA) – lokal, offline, JSON-Export
const $ = (id) => document.getElementById(id);

const STORE = {
  DRAFT: "befund_draft_v1",
  CASES: "befund_cases_v1"
};

let deferredPrompt = null;
let currentCaseId = null;

const defaultDomains = () => ([
  { id: uid(), title: "Gedächtnis", text: "" },
  { id: uid(), title: "Sprache/Kommunikation", text: "" },
  { id: uid(), title: "Orientierung", text: "" },
  { id: uid(), title: "Aufmerksamkeit/Exekutivfunktionen", text: "" },
  { id: uid(), title: "Wahrnehmung", text: "" },
  { id: uid(), title: "Alltag/ADL", text: "" },
  { id: uid(), title: "Motorik", text: "" },
  { id: uid(), title: "Stimmung/Verhalten", text: "" },
  { id: uid(), title: "Inkontinenz/Körperwahrnehmung", text: "" },
  { id: uid(), title: "Antrieb & Motivation", text: "" }
]);

function uid() {
  return (crypto?.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
}

function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function load(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
function save(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getDraft() {
  return load(STORE.DRAFT, {
    clientName: "",
    dob: "",
    date: todayISO(),
    setting: "",
    question: "",
    methods: "",
    dsds: "",
    dtim: "",
    summary: "",
    recommendations: "",
    domains: defaultDomains()
  });
}

function setDraft(draft) {
  save(STORE.DRAFT, draft);
}

function getCases() {
  return load(STORE.CASES, []);
}
function setCases(cases) {
  save(STORE.CASES, cases);
}

function readForm() {
  const domains = readDomainsFromDOM();
  return {
    clientName: $("clientName").value.trim(),
    dob: $("dob").value.trim(),
    date: $("date").value,
    setting: $("setting").value.trim(),
    question: $("question").value.trim(),
    methods: $("methods").value.trim(),
    dsds: $("dsds").value.trim(),
    dtim: $("dtim").value.trim(),
    summary: $("summary").value.trim(),
    recommendations: $("recommendations").value.trim(),
    domains
  };
}

function writeForm(d) {
  $("clientName").value = d.clientName || "";
  $("dob").value = d.dob || "";
  $("date").value = d.date || todayISO();
  $("setting").value = d.setting || "";
  $("question").value = d.question || "";
  $("methods").value = d.methods || "";
  $("dsds").value = d.dsds || "";
  $("dtim").value = d.dtim || "";
  $("summary").value = d.summary || "";
  $("recommendations").value = d.recommendations || "";
  renderDomains(d.domains || defaultDomains());
  renderGenerated();
}

function renderDomains(domains) {
  const host = $("domains");
  host.innerHTML = "";

  const wrap = document.createElement("div");
  wrap.style.display = "grid";
  wrap.style.gap = "10px";

  for (const dom of domains) {
    const card = document.createElement("div");
    card.style.border = "1px solid #223055";
    card.style.background = "#0b1020";
    card.style.borderRadius = "16px";
    card.style.padding = "10px";
    card.dataset.id = dom.id;

    card.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap">
        <input class="dTitle" placeholder="Bereichstitel" value="" style="font-weight:700" />
        <div class="noPrint" style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="secondary btnUp" type="button">↑</button>
          <button class="secondary btnDown" type="button">↓</button>
          <button class="danger btnRemove" type="button">Entfernen</button>
        </div>
      </div>
      <div style="height:8px"></div>
      <textarea class="dText" placeholder="Kurzbeschreibung / Beobachtungen / Einordnung…"></textarea>
    `;

    card.querySelector(".dTitle").value = dom.title || "";
    card.querySelector(".dText").value = dom.text || "";

    // live updates
    card.querySelector(".dTitle").addEventListener("input", autosave);
    card.querySelector(".dText").addEventListener("input", autosave);

    // actions
    card.querySelector(".btnRemove").addEventListener("click", () => {
      const next = readDomainsFromDOM().filter(x => x.id !== dom.id);
      renderDomains(next);
      autosave();
    });

    card.querySelector(".btnUp").addEventListener("click", () => {
      const arr = readDomainsFromDOM();
      const i = arr.findIndex(x => x.id === dom.id);
      if (i > 0) {
        [arr[i-1], arr[i]] = [arr[i], arr[i-1]];
        renderDomains(arr);
        autosave();
      }
    });

    card.querySelector(".btnDown").addEventListener("click", () => {
      const arr = readDomainsFromDOM();
      const i = arr.findIndex(x => x.id === dom.id);
      if (i >= 0 && i < arr.length-1) {
        [arr[i], arr[i+1]] = [arr[i+1], arr[i]];
        renderDomains(arr);
        autosave();
      }
    });

    wrap.appendChild(card);
  }

  host.appendChild(wrap);
}

function readDomainsFromDOM() {
  const cards = Array.from($("domains").querySelectorAll("[data-id]"));
  return cards.map(c => ({
    id: c.dataset.id,
    title: c.querySelector(".dTitle").value.trim(),
    text: c.querySelector(".dText").value.trim()
  }));
}

function buildNarrative(d) {
  const lines = [];
  const name = d.clientName ? d.clientName : "—";
  const date = d.date ? d.date : "—";

  lines.push(`Befund – ${name} (Datum: ${date})`);
  if (d.setting) lines.push(`Setting/Kontext: ${d.setting}`);
  if (d.dob) lines.push(`Geburtsdatum: ${d.dob}`);
  lines.push("");

  if (d.question) {
    lines.push("Fragestellung/Anlass:");
    lines.push(d.question);
    lines.push("");
  }

  if (d.methods) {
    lines.push("Methoden:");
    lines.push(d.methods);
    lines.push("");
  }

  if (d.dsds || d.dtim) {
    lines.push("Testergebnisse (Kurz):");
    if (d.dsds) lines.push(`DSDS: ${d.dsds}`);
    if (d.dtim) lines.push(`DTIM: ${d.dtim}`);
    lines.push("");
  }

  if (d.domains?.length) {
    lines.push("Funktionale Bereiche:");
    for (const dom of d.domains) {
      const t = dom.title || "Bereich";
      const txt = dom.text || "";
      lines.push(`- ${t}: ${txt}`);
    }
    lines.push("");
  }

  if (d.summary) {
    lines.push("Zusammenfassung:");
    lines.push(d.summary);
    lines.push("");
  }

  if (d.recommendations) {
    lines.push("Empfehlungen:");
    lines.push(d.recommendations);
    lines.push("");
  }

  return lines.join("\n").trim();
}

function renderGenerated() {
  const d = readForm();
  $("generated").value = buildNarrative(d);
}

function autosave() {
  const d = readForm();
  setDraft(d);
  renderGenerated();
}

function resetToNew() {
  currentCaseId = null;
  $("btnDeleteCase").disabled = true;
  const fresh = getDraft();
  // reset to empty but keep defaults
  const empty = {
    ...fresh,
    clientName:"", dob:"", date: todayISO(), setting:"",
    question:"", methods:"", dsds:"", dtim:"", summary:"", recommendations:"",
    domains: defaultDomains()
  };
  setDraft(empty);
  writeForm(empty);
}

function saveCase() {
  const d = readForm();
  const now = new Date().toISOString();
  const cases = getCases();

  const base = {
    id: currentCaseId || uid(),
    createdAt: now,
    updatedAt: now,
    ...d
  };

  if (currentCaseId) {
    const idx = cases.findIndex(c => c.id === currentCaseId);
    if (idx >= 0) {
      cases[idx] = { ...cases[idx], ...d, updatedAt: now };
    } else {
      cases.push(base);
    }
  } else {
    cases.push(base);
    currentCaseId = base.id;
  }

  setCases(cases);
  $("btnDeleteCase").disabled = false;
  renderCaseList();
}

function openCase(id) {
  const c = getCases().find(x => x.id === id);
  if (!c) return;
  currentCaseId = c.id;
  $("btnDeleteCase").disabled = false;

  const draft = {
    clientName: c.clientName || "",
    dob: c.dob || "",
    date: c.date || todayISO(),
    setting: c.setting || "",
    question: c.question || "",
    methods: c.methods || "",
    dsds: c.dsds || "",
    dtim: c.dtim || "",
    summary: c.summary || "",
    recommendations: c.recommendations || "",
    domains: Array.isArray(c.domains) && c.domains.length ? c.domains : defaultDomains()
  };
  setDraft(draft);
  writeForm(draft);
}

function deleteCurrentCase() {
  if (!currentCaseId) return;
  const next = getCases().filter(c => c.id !== currentCaseId);
  setCases(next);
  currentCaseId = null;
  renderCaseList();
  resetToNew();
}

function renderCaseList() {
  const host = $("caseList");
  const empty = $("caseEmpty");
  const q = ($("caseSearch").value || "").toLowerCase().trim();

  const cases = getCases()
    .slice()
    .sort((a,b) => (b.updatedAt||"").localeCompare(a.updatedAt||""))
    .filter(c => {
      if (!q) return true;
      const hay = `${c.clientName||""} ${c.date||""} ${c.summary||""} ${c.setting||""}`.toLowerCase();
      return hay.includes(q);
    });

  host.innerHTML = "";
  empty.style.display = cases.length ? "none" : "block";

  for (const c of cases) {
    const el = document.createElement("div");
    el.className = "caseItem";
    const nm = c.clientName || "(Ohne Name)";
    const dt = c.date || "—";
    const st = c.setting ? ` • ${c.setting}` : "";
    el.innerHTML = `
      <strong>${escapeHtml(nm)}</strong>
      <div class="caseMeta">
        <span>Datum: ${escapeHtml(dt)}</span>
        <span>${escapeHtml(st)}</span>
        <span>Update: ${escapeHtml((c.updatedAt||"").slice(0,16).replace("T"," "))}</span>
      </div>
      <div class="noPrint" style="display:flex;gap:10px;flex-wrap:wrap">
        <button class="secondary" type="button" data-act="open">Öffnen</button>
        <button class="ghost" type="button" data-act="export">Export</button>
      </div>
    `;
    el.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      const act = btn.dataset.act;
      if (act === "open") openCase(c.id);
      if (act === "export") downloadJSON(c, `befund_${safeFile(nm)}_${dt}.json`);
    });
    host.appendChild(el);
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}
function safeFile(s) {
  return String(s).toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_\-]/g,"").slice(0,40) || "fall";
}

function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function exportAll() {
  downloadJSON({ exportedAt: new Date().toISOString(), cases: getCases() }, "befund_export_all.json");
}

function importAll(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const imported = Array.isArray(data) ? data : (data.cases || []);
      if (!Array.isArray(imported)) throw new Error("Ungültiges Format.");
      // light validation
      const cleaned = imported.map(c => ({
        id: c.id || uid(),
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
        clientName: c.clientName || "",
        dob: c.dob || "",
        date: c.date || "",
        setting: c.setting || "",
        question: c.question || "",
        methods: c.methods || "",
        dsds: c.dsds || "",
        dtim: c.dtim || "",
        summary: c.summary || "",
        recommendations: c.recommendations || "",
        domains: Array.isArray(c.domains) ? c.domains : defaultDomains()
      }));
      setCases(cleaned);
      renderCaseList();
      alert("Import erfolgreich.");
    } catch (e) {
      alert("Import fehlgeschlagen: " + (e?.message || "Fehler"));
    }
  };
  reader.readAsText(file);
}

// PWA / SW
async function setupSW() {
  const status = $("pwaStatus");
  if (!("serviceWorker" in navigator)) {
    status.textContent = "Status: Service Worker nicht verfügbar";
    status.classList.add("bad");
    return;
  }
  try {
    await navigator.serviceWorker.register("./sw.js");
    status.textContent = "Status: Offline-fähig ✓";
  } catch {
    status.textContent = "Status: Offline: Fehler";
    status.classList.add("bad");
  }
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  $("btnInstall").style.display = "inline-block";
});
$("btnInstall").addEventListener("click", async () => {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  $("btnInstall").style.display = "none";
});

// wiring
function wire() {
  const inputs = ["clientName","dob","date","setting","question","methods","dsds","dtim","summary","recommendations"];
  for (const id of inputs) $(id).addEventListener("input", autosave);

  $("btnAddDomain").addEventListener("click", () => {
    const arr = readDomainsFromDOM();
    arr.push({ id: uid(), title: "Neuer Bereich", text: "" });
    renderDomains(arr);
    autosave();
  });

  $("btnResetDomains").addEventListener("click", () => {
    renderDomains(defaultDomains());
    autosave();
  });

  $("btnNew").addEventListener("click", resetToNew);
  $("btnSaveCase").addEventListener("click", saveCase);
  $("btnDeleteCase").addEventListener("click", () => {
    if (confirm("Diesen Fall wirklich löschen?")) deleteCurrentCase();
  });

  $("btnPrint").addEventListener("click", () => window.print());
  $("btnCopy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("generated").value);
      alert("Text kopiert.");
    } catch {
      // fallback
      $("generated").select();
      document.execCommand("copy");
      alert("Text kopiert.");
    }
  });

  $("btnExportOne").addEventListener("click", () => {
    const d = readForm();
    downloadJSON({ id: currentCaseId || null, ...d }, `befund_${safeFile(d.clientName||"fall")}_${d.date||"datum"}.json`);
  });

  $("btnExportAll").addEventListener("click", exportAll);

  $("btnImport").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (f) importAll(f);
    e.target.value = "";
  });

  $("btnDeleteAll").addEventListener("click", () => {
    if (!confirm("Wirklich ALLE gespeicherten Fälle löschen?")) return;
    setCases([]);
    renderCaseList();
    resetToNew();
  });

  $("caseSearch").addEventListener("input", renderCaseList);
}

(function init(){
  $("date").value = todayISO();
  setupSW();
  wire();

  const draft = getDraft();
  writeForm(draft);

  // enable delete button only if currentCaseId exists
  $("btnDeleteCase").disabled = !currentCaseId;

  renderCaseList();
})();
