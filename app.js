const $ = (id) => document.getElementById(id);

const STORE = {
  DRAFT: "befund_draft_v2",
  CASES: "befund_cases_v2",
  INV_COUNTER: "invoice_counter_v1",
  INV_PROFILE: "invoice_profile_v1"
};

let deferredPrompt = null;
let currentCaseId = null;

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

const defaultDomains = () => ([
  { id: uid(), title: "Gedächtnis", text: "" },
  { id: uid(), title: "Sprache/Kommunikation", text: "" },
  { id: uid(), title: "Orientierung", text: "" },
  { id: uid(), title: "Aufmerksamkeit/Exekutivfunktionen", text: "" },
  { id: uid(), title: "Wahrnehmung", text: "" },
  { id: uid(), title: "Alltag/ADL", text: "" },
  { id: uid(), title: "Motorik", text: "" },
  { id: uid(), title: "Stimmung/Verhalten", text: "" }
]);

function defaultInvoiceProfile() {
  return {
    from: "",
    bank: "",
    taxNote: "Umsatzsteuerfrei gem. § 6 Abs. 1 Z 27 UStG (Kleinunternehmerregelung)",
    dueDays: 14,
    rate: 80
  };
}

function nextInvoiceNo() {
  const y = new Date().getFullYear();
  const obj = load(STORE.INV_COUNTER, { year: y, seq: 0 });
  if (obj.year !== y) { obj.year = y; obj.seq = 0; }
  obj.seq += 1;
  save(STORE.INV_COUNTER, obj);
  return `${obj.year}-${String(obj.seq).padStart(4,"0")}`;
}

function getDraft() {
  const prof = load(STORE.INV_PROFILE, defaultInvoiceProfile());
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
    domains: defaultDomains(),
    invoice: {
      invNo: "",
      invDate: todayISO(),
      serviceDate: todayISO(),
      service: "Psychologische Diagnostik (DSDS/DTIM), Auswertung und Befunderstellung",
      units: 1,
      rate: prof.rate ?? 80,
      taxNote: prof.taxNote ?? "",
      dueDays: prof.dueDays ?? 14,
      billTo: "",
      billToAddr: "",
      from: prof.from ?? "",
      bank: prof.bank ?? ""
    },
    invoiceText: ""
  });
}

function setDraft(draft) { save(STORE.DRAFT, draft); }
function getCases() { return load(STORE.CASES, []); }
function setCases(cases) { save(STORE.CASES, cases); }

function readDomainsFromDOM() {
  const cards = Array.from($("domains").querySelectorAll("[data-id]"));
  return cards.map(c => ({
    id: c.dataset.id,
    title: c.querySelector(".dTitle").value.trim(),
    text: c.querySelector(".dText").value.trim()
  }));
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

    card.querySelector(".dTitle").addEventListener("input", autosave);
    card.querySelector(".dText").addEventListener("input", autosave);

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

function readInvoiceFromDOM() {
  return {
    invNo: $("invNo").value.trim(),
    invDate: $("invDate").value,
    serviceDate: $("invServiceDate").value,
    service: $("invService").value.trim(),
    units: parseFloat($("invUnits").value || "0") || 0,
    rate: parseFloat($("invRate").value || "0") || 0,
    taxNote: $("invTaxNote").value.trim(),
    dueDays: parseInt($("invDueDays").value || "0", 10) || 0,
    billTo: $("invBillTo").value.trim(),
    billToAddr: $("invBillToAddr").value.trim(),
    from: $("invFrom").value.trim(),
    bank: $("invBank").value.trim()
  };
}

function writeInvoiceToDOM(inv) {
  $("invNo").value = inv.invNo || "";
  $("invDate").value = inv.invDate || todayISO();
  $("invServiceDate").value = inv.serviceDate || ($("date").value || todayISO());
  $("invService").value = inv.service || "";
  $("invUnits").value = (inv.units ?? 0);
  $("invRate").value = (inv.rate ?? 0);
  $("invTaxNote").value = inv.taxNote || "";
  $("invDueDays").value = (inv.dueDays ?? 0);
  $("invBillTo").value = inv.billTo || "";
  $("invBillToAddr").value = inv.billToAddr || "";
  $("invFrom").value = inv.from || "";
  $("invBank").value = inv.bank || "";
}

function readForm() {
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
    domains: readDomainsFromDOM(),
    invoice: readInvoiceFromDOM(),
    invoiceText: $("invoiceText").value
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

  const inv = d.invoice || getDraft().invoice;
  if (!inv.serviceDate) inv.serviceDate = $("date").value || todayISO();
  if (!inv.invDate) inv.invDate = todayISO();
  writeInvoiceToDOM(inv);

  $("invoiceText").value = d.invoiceText || "";
  renderGenerated();
}

function buildNarrative(d) {
  const lines = [];
  const name = d.clientName ? d.clientName : "—";
  const date = d.date ? d.date : "—";

  lines.push(`Befund – ${name} (Datum: ${date})`);
  if (d.setting) lines.push(`Setting/Kontext: ${d.setting}`);
  if (d.dob) lines.push(`Geburtsdatum: ${d.dob}`);
  lines.push("");

  if (d.question) { lines.push("Fragestellung/Anlass:"); lines.push(d.question); lines.push(""); }
  if (d.methods) { lines.push("Methoden:"); lines.push(d.methods); lines.push(""); }

  if (d.dsds || d.dtim) {
    lines.push("Testergebnisse (Kurz):");
    if (d.dsds) lines.push(`DSDS: ${d.dsds}`);
    if (d.dtim) lines.push(`DTIM: ${d.dtim}`);
    lines.push("");
  }

  if (d.domains?.length) {
    lines.push("Funktionale Bereiche:");
    for (const dom of d.domains) lines.push(`- ${dom.title || "Bereich"}: ${dom.text || ""}`);
    lines.push("");
  }

  if (d.summary) { lines.push("Zusammenfassung:"); lines.push(d.summary); lines.push(""); }
  if (d.recommendations) { lines.push("Empfehlungen:"); lines.push(d.recommendations); lines.push(""); }

  return lines.join("\n").trim();
}

function renderGenerated() {
  $("generated").value = buildNarrative(readForm());
}

function formatMoney(n) {
  const v = (Math.round((n + Number.EPSILON) * 100) / 100);
  return v.toLocaleString("de-AT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function addDaysISO(iso, days) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + (days || 0));
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function genInvoiceText() {
  const d = readForm();
  const inv = d.invoice;

  if (!inv.invNo) { inv.invNo = nextInvoiceNo(); $("invNo").value = inv.invNo; }
  if (!inv.invDate) { inv.invDate = todayISO(); $("invDate").value = inv.invDate; }
  if (!inv.serviceDate) { inv.serviceDate = d.date || todayISO(); $("invServiceDate").value = inv.serviceDate; }

  const total = (inv.units || 0) * (inv.rate || 0);
  const dueDate = (inv.dueDays && inv.invDate) ? addDaysISO(inv.invDate, inv.dueDays) : "";

  save(STORE.INV_PROFILE, { from: inv.from, bank: inv.bank, taxNote: inv.taxNote, dueDays: inv.dueDays, rate: inv.rate });

  const lines = [];
  lines.push("HONORARNOTE / RECHNUNG", "");
  if (inv.from) { lines.push(inv.from, ""); }
  lines.push(`Rechnungsnummer: ${inv.invNo}`);
  lines.push(`Rechnungsdatum: ${inv.invDate || ""}`);
  lines.push(`Leistungsdatum: ${inv.serviceDate || ""}`, "");
  lines.push("Rechnung an:");
  lines.push(inv.billTo || d.clientName || "—");
  if (inv.billToAddr) lines.push(inv.billToAddr);
  lines.push("", "Leistung:");
  lines.push(inv.service || "—", "");
  lines.push(`Menge/Einheiten: ${inv.units || 0}`);
  lines.push(`Tarif: € ${formatMoney(inv.rate || 0)} pro Einheit`);
  lines.push(`Gesamtbetrag: € ${formatMoney(total)}`, "");
  if (inv.taxNote) { lines.push(inv.taxNote, ""); }
  if (inv.dueDays) lines.push(`Zahlungsziel: ${inv.dueDays} Tage` + (dueDate ? ` (fällig am ${dueDate})` : ""));
  if (inv.bank) { lines.push("", "Bankverbindung:", inv.bank); }

  $("invoiceText").value = lines.join("\n").trim();
  autosave();
}

function autosave() { setDraft(readForm()); renderGenerated(); }

function resetToNew() {
  currentCaseId = null;
  $("btnDeleteCase").disabled = true;
  const prof = load(STORE.INV_PROFILE, defaultInvoiceProfile());
  const empty = {
    clientName:"", dob:"", date: todayISO(), setting:"", question:"", methods:"",
    dsds:"", dtim:"", summary:"", recommendations:"", domains: defaultDomains(),
    invoice: { invNo:"", invDate: todayISO(), serviceDate: todayISO(),
      service:"Psychologische Diagnostik (DSDS/DTIM), Auswertung und Befunderstellung",
      units:1, rate: prof.rate ?? 80, taxNote: prof.taxNote ?? "", dueDays: prof.dueDays ?? 14,
      billTo:"", billToAddr:"", from: prof.from ?? "", bank: prof.bank ?? "" },
    invoiceText:""
  };
  setDraft(empty);
  writeForm(empty);
}

function saveCase() {
  const d = readForm();
  const now = new Date().toISOString();
  const cases = getCases();
  if (currentCaseId) {
    const idx = cases.findIndex(c => c.id === currentCaseId);
    if (idx >= 0) cases[idx] = { ...cases[idx], ...d, updatedAt: now };
    else cases.push({ id: currentCaseId, createdAt: now, updatedAt: now, ...d });
  } else {
    const id = uid();
    cases.push({ id, createdAt: now, updatedAt: now, ...d });
    currentCaseId = id;
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
    clientName: c.clientName || "", dob: c.dob || "", date: c.date || todayISO(),
    setting: c.setting || "", question: c.question || "", methods: c.methods || "",
    dsds: c.dsds || "", dtim: c.dtim || "", summary: c.summary || "",
    recommendations: c.recommendations || "",
    domains: Array.isArray(c.domains) && c.domains.length ? c.domains : defaultDomains(),
    invoice: c.invoice || getDraft().invoice,
    invoiceText: c.invoiceText || ""
  };
  setDraft(draft);
  writeForm(draft);
}

function deleteCurrentCase() {
  if (!currentCaseId) return;
  setCases(getCases().filter(c => c.id !== currentCaseId));
  currentCaseId = null;
  renderCaseList();
  resetToNew();
}

function safeFile(s) {
  return String(s).toLowerCase().replace(/\s+/g,"_").replace(/[^a-z0-9_\-]/g,"").slice(0,40) || "fall";
}
function downloadJSON(obj, filename) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function renderCaseList() {
  const host = $("caseList");
  const empty = $("caseEmpty");
  const q = ($("caseSearch").value || "").toLowerCase().trim();

  const cases = getCases().slice().sort((a,b) => (b.updatedAt||"").localeCompare(a.updatedAt||""))
    .filter(c => !q || (`${c.clientName||""} ${c.date||""} ${c.summary||""} ${c.setting||""}`).toLowerCase().includes(q));

  host.innerHTML = "";
  empty.style.display = cases.length ? "none" : "block";

  for (const c of cases) {
    const el = document.createElement("div");
    el.className = "caseItem";
    el.innerHTML = `
      <strong>${(c.clientName||"(Ohne Name)").replace(/</g,"&lt;")}</strong>
      <div class="caseMeta">
        <span>Datum: ${(c.date||"—")}</span>
        <span>${c.setting ? "• "+c.setting : ""}</span>
        <span>Update: ${String(c.updatedAt||"").slice(0,16).replace("T"," ")}</span>
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
      if (act === "export") downloadJSON(c, `fall_${safeFile(c.clientName||"fall")}_${c.date||"datum"}.json`);
    });
    host.appendChild(el);
  }
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
        domains: Array.isArray(c.domains) ? c.domains : defaultDomains(),
        invoice: c.invoice || getDraft().invoice,
        invoiceText: c.invoiceText || ""
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

async function setupSW() {
  const status = $("pwaStatus");
  if (!("serviceWorker" in navigator)) { status.textContent = "Status: Service Worker nicht verfügbar"; status.classList.add("bad"); return; }
  try { await navigator.serviceWorker.register("./sw.js"); status.textContent = "Status: Offline-fähig ✓"; }
  catch { status.textContent = "Status: Offline: Fehler"; status.classList.add("bad"); }
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

function wire() {
  const ids = ["clientName","dob","date","setting","question","methods","dsds","dtim","summary","recommendations",
    "invNo","invDate","invServiceDate","invService","invUnits","invRate","invTaxNote","invDueDays","invBillTo","invBillToAddr","invFrom","invBank"];
  for (const id of ids) $(id).addEventListener("input", autosave);

  $("btnAddDomain").addEventListener("click", () => { const arr = readDomainsFromDOM(); arr.push({ id: uid(), title: "Neuer Bereich", text: "" }); renderDomains(arr); autosave(); });
  $("btnResetDomains").addEventListener("click", () => { renderDomains(defaultDomains()); autosave(); });

  $("btnNew").addEventListener("click", resetToNew);
  $("btnSaveCase").addEventListener("click", saveCase);
  $("btnDeleteCase").addEventListener("click", () => { if (confirm("Diesen Fall wirklich löschen?")) deleteCurrentCase(); });

  $("btnPrint").addEventListener("click", () => window.print());
  $("btnCopy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("generated").value); alert("Befund-Text kopiert."); }
    catch { $("generated").select(); document.execCommand("copy"); alert("Befund-Text kopiert."); }
  });

  $("btnExportOne").addEventListener("click", () => {
    const d = readForm();
    downloadJSON({ id: currentCaseId || null, ...d }, `befund_${safeFile(d.clientName||"fall")}_${d.date||"datum"}.json`);
  });

  $("btnExportAll").addEventListener("click", exportAll);

  $("btnImport").addEventListener("click", () => $("importFile").click());
  $("importFile").addEventListener("change", (e) => { const f = e.target.files?.[0]; if (f) importAll(f); e.target.value = ""; });

  $("btnDeleteAll").addEventListener("click", () => {
    if (!confirm("Wirklich ALLE gespeicherten Fälle löschen?")) return;
    setCases([]); renderCaseList(); resetToNew();
  });

  $("caseSearch").addEventListener("input", renderCaseList);

  $("btnGenInvoice").addEventListener("click", genInvoiceText);
  $("btnPrintInvoice").addEventListener("click", () => { if (!$("invoiceText").value.trim()) genInvoiceText(); window.print(); });
}

(function init(){
  $("date").value = todayISO();
  setupSW();
  wire();
  const draft = getDraft();
  if (draft.invoice && !draft.invoice.serviceDate) draft.invoice.serviceDate = draft.date || todayISO();
  writeForm(draft);
  $("btnDeleteCase").disabled = !currentCaseId;
  renderCaseList();
})();