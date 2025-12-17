// PraxisDoku – single-file-ish app (no build tools), offline, local data.
// Storage: localStorage (optionally locked with passphrase via WebCrypto).
// NOTE: This is not medical software certification; it's a practical local organizer.

import { ui } from './ui.js';
import { store } from './store.js';
import { templates } from './templates.js';

const state = ui.createState({
  locked: true,
  vaultReady: false,
  passphrase: '',
  activeTab: 'Patient:innen',
  search: '',
  selectedPatientId: null,
  selectedDocId: null,
  toast: null,
});

function toast(msg, kind='info'){
  state.toast = { msg, kind, ts: Date.now() };
  setTimeout(() => { if(state.toast?.ts && Date.now()-state.toast.ts > 2500) state.toast = null; ui.render(); }, 2600);
  ui.render();
}

async function unlock(){
  const p = state.passphrase.trim();
  if(!p) return toast('Bitte Passwort eingeben.', 'warn');
  try{
    await store.unlock(p);
    state.locked = false;
    state.vaultReady = true;
    state.passphrase = '';
    await store.migrateIfNeeded();
    toast('Entsperrt. Daten sind lokal.', 'ok');
    ui.render();
  }catch(e){
    console.error(e);
    toast('Passwort falsch oder Daten beschädigt.', 'warn');
  }
}

async function lock(){
  state.locked = true;
  state.selectedPatientId = null;
  state.selectedDocId = null;
  toast('Gesperrt.', 'info');
  ui.render();
}

function nowISO(){
  const d = new Date();
  const pad = (n)=> String(n).padStart(2,'0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function shortId(prefix='id'){
  return prefix+'_'+Math.random().toString(16).slice(2)+Math.random().toString(16).slice(2);
}

function patientLabel(p){
  const code = (p.code||'').trim() || '—';
  return `${p.lastName||''} ${p.firstName||''}`.trim() || code;
}

function filteredPatients(list){
  const q = state.search.trim().toLowerCase();
  if(!q) return list;
  return list.filter(p => (patientLabel(p).toLowerCase().includes(q) || (p.code||'').toLowerCase().includes(q)));
}

function formatDate(dateStr){
  if(!dateStr) return '';
  return dateStr;
}

async function addPatient(){
  const p = {
    id: shortId('p'),
    code: '',
    firstName: '',
    lastName: '',
    dob: '',
    contact: '',
    notes: '',
    createdAt: nowISO(),
    updatedAt: nowISO(),
  };
  await store.upsertPatient(p);
  state.selectedPatientId = p.id;
  state.activeTab = 'Patient:innen';
  toast('Patient:in angelegt.', 'ok');
  ui.render();
}

async function deletePatient(id){
  if(!confirm('Patient:in wirklich löschen? (Dokumente werden ebenfalls entfernt)')) return;
  await store.deletePatient(id);
  state.selectedPatientId = null;
  state.selectedDocId = null;
  toast('Gelöscht.', 'info');
  ui.render();
}

async function upsertPatientFromForm(form){
  const p = await store.getPatient(state.selectedPatientId);
  if(!p) return;
  const patch = Object.fromEntries(new FormData(form).entries());
  Object.assign(p, patch);
  p.updatedAt = nowISO();
  await store.upsertPatient(p);
  toast('Gespeichert.', 'ok');
  ui.render();
}

async function addDocument(kind){
  const pid = state.selectedPatientId;
  if(!pid) return toast('Bitte zuerst Patient:in auswählen.', 'warn');
  const doc = {
    id: shortId('d'),
    patientId: pid,
    kind,
    title: kind,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    data: templates.create(kind),
    attachments: [],
  };
  await store.upsertDoc(doc);
  state.selectedDocId = doc.id;
  toast('Dokument erstellt.', 'ok');
  ui.render();
}

async function deleteDoc(id){
  if(!confirm('Dokument wirklich löschen?')) return;
  await store.deleteDoc(id);
  state.selectedDocId = null;
  toast('Dokument gelöscht.', 'info');
  ui.render();
}

async function saveDocFromForm(form){
  const doc = await store.getDoc(state.selectedDocId);
  if(!doc) return;
  const entries = Object.fromEntries(new FormData(form).entries());
  // merge into doc.data shallowly; nested keys use dot notation
  for(const [k,v] of Object.entries(entries)){
    if(k.includes('.')){
      const parts = k.split('.');
      let cur = doc.data;
      for(let i=0;i<parts.length-1;i++){
        const key = parts[i];
        cur[key] = cur[key] ?? {};
        cur = cur[key];
      }
      cur[parts[parts.length-1]] = v;
    }else{
      doc.data[k] = v;
    }
  }
  doc.title = entries.title || doc.title;
  doc.updatedAt = nowISO();
  await store.upsertDoc(doc);
  toast('Dokument gespeichert.', 'ok');
  ui.render();
}

async function addAttachment(file){
  const doc = await store.getDoc(state.selectedDocId);
  if(!doc) return;
  const buf = await file.arrayBuffer();
  const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
  doc.attachments.push({
    id: shortId('a'),
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    addedAt: nowISO(),
    b64,
  });
  doc.updatedAt = nowISO();
  await store.upsertDoc(doc);
  toast('Anhang hinzugefügt.', 'ok');
  ui.render();
}

async function removeAttachment(attId){
  const doc = await store.getDoc(state.selectedDocId);
  if(!doc) return;
  doc.attachments = doc.attachments.filter(a=>a.id!==attId);
  doc.updatedAt = nowISO();
  await store.upsertDoc(doc);
  toast('Anhang entfernt.', 'info');
  ui.render();
}

function downloadAttachment(att){
  const bytes = Uint8Array.from(atob(att.b64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: att.type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = att.name;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

function exportJSON(){
  const data = store.exportAll();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `praxisdoku_export_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}

async function importJSON(file){
  const txt = await file.text();
  const data = JSON.parse(txt);
  await store.importAll(data);
  toast('Import abgeschlossen.', 'ok');
  ui.render();
}

function printDoc(){
  window.print();
}

function view(){
  return ui.h('div', {}, [
    ui.h('div', { class: 'topbar noPrint' }, [
      ui.h('div', { class: 'brand' }, [
        ui.h('div', { class: 'logo' }),
        ui.h('div', {}, [
          ui.h('h1', {}, ['PraxisDoku']),
          ui.h('div', { class: 'sub' }, ['lokal · offline · strukturierte Doku'])
        ])
      ]),
      ui.h('div', { class: 'actions' }, state.locked ? [
        ui.h('input', { placeholder:'Passwort', type:'password', value: state.passphrase,
          oninput: (e)=>{ state.passphrase = e.target.value; }
        }),
        ui.h('button', { class:'pill ok', onclick: unlock }, ['Entsperren']),
      ] : [
        ui.h('button', { class:'pill', onclick: ()=>{ state.activeTab='Patient:innen'; state.selectedDocId=null; ui.render(); } }, ['Patient:innen']),
        ui.h('button', { class:'pill', onclick: ()=>{ state.activeTab='Dokumente'; ui.render(); } }, ['Dokumente']),
        ui.h('button', { class:'pill', onclick: ()=>{ state.activeTab='Vorlagen'; ui.render(); } }, ['Vorlagen']),
        ui.h('button', { class:'pill', onclick: ()=>{ state.activeTab='Einstellungen'; ui.render(); } }, ['Einstellungen']),
        ui.h('button', { class:'pill danger', onclick: lock }, ['Sperren']),
      ])
    ]),
    state.toast ? ui.h('div', { class: 'notice '+(state.toast.kind==='warn'?'warn':''), style:'margin-top:12px' }, [state.toast.msg]) : null,
    state.locked ? ui.h('div', { class:'panel', style:'margin-top:14px' }, [
      ui.h('div', { class:'hd' }, [ui.h('h2', {}, ['Gesperrt'])]),
      ui.h('div', { class:'bd' }, [
        ui.h('div', { class:'small' }, [
          'Diese App speichert Daten lokal im Browser. Mit Passwort wird ein verschlüsselter Tresor verwendet. ',
          'Wenn du das Passwort vergisst, sind die verschlüsselten Daten nicht wiederherstellbar.'
        ]),
        ui.h('hr'),
        ui.h('div', { class:'small' }, [
          'Tipp: Nutze einen festen Computer/Browser für die Praxis und exportiere regelmäßig ein Backup (JSON).'
        ])
      ])
    ]) : mainUI(),
    ui.h('div', { class:'printOnly' }, [
      ui.h('h2', {}, ['PraxisDoku – Ausdruck']),
      ui.h('div', {}, ['Erstellt am: ', new Date().toLocaleString('de-AT')]),
    ])
  ]);
}

function mainUI(){
  return ui.h('div', { class:'grid', style:'margin-top:14px' }, [
    sidePanel(),
    contentPanel()
  ]);
}

function sidePanel(){
  const patients = store.listPatients();
  const list = filteredPatients(patients);
  return ui.h('div', { class:'panel side' }, [
    ui.h('div', { class:'hd' }, [
      ui.h('h2', {}, ['Patient:innen']),
      ui.h('button', { class:'pill ok', onclick: addPatient }, ['+ Neu'])
    ]),
    ui.h('div', { class:'bd' }, [
      ui.h('div', { class:'field' }, [
        ui.h('label', {}, ['Suche (Name oder Code)']),
        ui.h('input', { value: state.search, placeholder:'z.B. Gruber oder GG-01', oninput:(e)=>{ state.search=e.target.value; ui.render(); } })
      ]),
      ui.h('div', { class:'list' }, list.map(p => {
        const selected = p.id === state.selectedPatientId;
        return ui.h('div', { class:'item', onclick: ()=>{ state.selectedPatientId=p.id; state.selectedDocId=null; ui.render(); },
          style: selected ? 'border-color:rgba(122,162,255,.55); background:rgba(122,162,255,.10)' : ''
        }, [
          ui.h('div', { class:'t' }, [
            ui.h('div', { class:'name' }, [patientLabel(p)]),
            ui.h('div', { class:'badge' }, [p.code?.trim() ? p.code : 'ohne Code'])
          ]),
          ui.h('div', { class:'small' }, ['aktualisiert: ', p.updatedAt || p.createdAt ])
        ]);
      })),
      list.length===0 ? ui.h('div', { class:'small' }, ['Keine Treffer.']) : null,
    ])
  ]);
}

function contentPanel(){
  if(!state.selectedPatientId){
    return ui.h('div', { class:'panel' }, [
      ui.h('div', { class:'hd' }, [
        ui.h('h2', {}, ['Start'])
      ]),
      ui.h('div', { class:'bd' }, [
        ui.h('div', { class:'notice' }, [
          ui.h('div', {}, ['1) Patient:in anlegen oder auswählen']),
          ui.h('div', {}, ['2) Dokumente erstellen (Befund, Verlauf, Vereinbarung, Übergabe, …)']),
          ui.h('div', {}, ['3) Export/Backup regelmäßig nutzen'])
        ]),
        ui.h('hr'),
        ui.h('div', { class:'small' }, [
          'Diese App hilft dir, die 3 Ebenen aus dem Seminar praktisch umzusetzen: ',
          ui.h('br'), '• Ebene 1: Strukturdaten / optimale Gesamtbehandlung (Befund, Medikation, Ziele, Termine, Vereinbarungen).',
          ui.h('br'), '• Ebene 2: „Geheimnisse“ – hier als eigenes Dokument-Feld „Nur psychologisch / vertraulich“ (bei Team-Kontext separat).',
          ui.h('br'), '• Ebene 3: Eigene Resonanz/Arbeitshypothesen (nur für dich).'
        ])
      ])
    ]);
  }

  const p = store.getPatientSync(state.selectedPatientId);
  const docs = store.listDocsForPatient(state.selectedPatientId);

  const tabs = ['Patient:innen','Dokumente','Vorlagen','Einstellungen'];
  const right = state.activeTab;

  return ui.h('div', { class:'panel' }, [
    ui.h('div', { class:'hd' }, [
      ui.h('h2', {}, [patientLabel(p), ' · ', ui.h('span', { class:'small' }, [p.code?.trim()?p.code:'kein Code'])]),
      ui.h('div', { class:'tabs noPrint' }, tabs.map(t =>
        ui.h('div', { class:'tab '+(right===t?'active':''), onclick: ()=>{ state.activeTab=t; ui.render(); } }, [t])
      ))
    ]),
    ui.h('div', { class:'bd' }, [
      right==='Patient:innen' ? patientForm(p) :
      right==='Dokumente' ? docsUI(docs) :
      right==='Vorlagen' ? templatesUI() :
      settingsUI()
    ])
  ]);
}

function patientForm(p){
  return ui.h('form', { onsubmit: async (e)=>{ e.preventDefault(); await upsertPatientFromForm(e.target); } }, [
    ui.h('div', { class:'split' }, [
      ui.h('div', {}, [
        field('Code / Kürzel', ui.h('input', { name:'code', value:p.code||'', placeholder:'z.B. GG-01' })),
        field('Vorname', ui.h('input', { name:'firstName', value:p.firstName||'' })),
        field('Nachname', ui.h('input', { name:'lastName', value:p.lastName||'' })),
        field('Geburtsdatum', ui.h('input', { name:'dob', value:p.dob||'', placeholder:'YYYY-MM-DD' })),
      ]),
      ui.h('div', {}, [
        field('Kontakt (optional)', ui.h('textarea', { name:'contact', placeholder:'Telefon / E-Mail / Adresse (wenn du willst)' }, [p.contact||''])),
        field('Allgemeine Notizen (Ebene 1 – strukturell)', ui.h('textarea', { name:'notes', placeholder:'Wichtige strukturelle Infos für die Gesamtbehandlung' }, [p.notes||''])),
      ])
    ]),
    ui.h('div', { class:'row noPrint' }, [
      ui.h('button', { class:'pill ok', type:'submit' }, ['Speichern']),
      ui.h('button', { class:'pill danger', type:'button', onclick: ()=>deletePatient(p.id) }, ['Patient:in löschen'])
    ]),
    ui.h('div', { class:'small' }, ['Erstellt: ', p.createdAt, ' · Aktualisiert: ', p.updatedAt ])
  ]);
}

function docsUI(docs){
  const doc = state.selectedDocId ? store.getDocSync(state.selectedDocId) : null;
  const docList = ui.h('div', { class:'panel', style:'margin-bottom:12px;background:rgba(0,0,0,.12)' }, [
    ui.h('div', { class:'hd' }, [
      ui.h('h2', {}, ['Dokumente']),
      ui.h('div', { class:'row noPrint' }, [
        ui.h('button', { class:'pill ok', type:'button', onclick: ()=>addDocument('Befund (kurz)') }, ['+ Befund']),
        ui.h('button', { class:'pill ok', type:'button', onclick: ()=>addDocument('Verlaufsnotiz') }, ['+ Verlauf']),
        ui.h('button', { class:'pill ok', type:'button', onclick: ()=>addDocument('Vereinbarung/Entbindung') }, ['+ Vereinbarung']),
        ui.h('button', { class:'pill ok', type:'button', onclick: ()=>addDocument('Übergabebericht') }, ['+ Übergabe']),
      ])
    ]),
    ui.h('div', { class:'bd' }, [
      docs.length===0 ? ui.h('div', { class:'small' }, ['Noch keine Dokumente.']) :
      ui.h('div', { class:'list' }, docs
        .slice()
        .sort((a,b)=> (b.updatedAt||'').localeCompare(a.updatedAt||''))
        .map(d=>{
          const selected = d.id===state.selectedDocId;
          return ui.h('div', { class:'item', onclick: ()=>{ state.selectedDocId=d.id; ui.render(); },
            style: selected ? 'border-color:rgba(122,162,255,.55); background:rgba(122,162,255,.10)' : ''
          }, [
            ui.h('div', { class:'t' }, [
              ui.h('div', { class:'name' }, [d.title || d.kind]),
              ui.h('div', { class:'badge' }, [d.kind])
            ]),
            ui.h('div', { class:'small' }, ['aktualisiert: ', d.updatedAt || d.createdAt ])
          ]);
        }))
    ])
  ]);

  const editor = !doc ? ui.h('div', { class:'small' }, ['Wähle ein Dokument zum Bearbeiten.']) : docEditor(doc);

  return ui.h('div', {}, [docList, editor]);
}

function docEditor(doc){
  const kind = doc.kind;
  const has = (path, fallback='') => {
    const parts = path.split('.');
    let cur = doc.data;
    for(const p of parts){
      cur = cur?.[p];
      if(cur===undefined) return fallback;
    }
    return cur ?? fallback;
  };

  return ui.h('div', { class:'panel', style:'background:rgba(0,0,0,.12)' }, [
    ui.h('div', { class:'hd' }, [
      ui.h('h2', {}, [kind]),
      ui.h('div', { class:'row noPrint' }, [
        ui.h('button', { class:'pill', type:'button', onclick: printDoc }, ['PDF/Print']),
        ui.h('button', { class:'pill danger', type:'button', onclick: ()=>deleteDoc(doc.id) }, ['Löschen'])
      ])
    ]),
    ui.h('div', { class:'bd' }, [
      ui.h('form', { onsubmit: async (e)=>{ e.preventDefault(); await saveDocFromForm(e.target); } }, [
        field('Titel', ui.h('input', { name:'title', value: doc.title || kind })),
        ...templates.render(kind, { ui, field, has }),
        ui.h('div', { class:'row noPrint' }, [
          ui.h('button', { class:'pill ok', type:'submit' }, ['Speichern'])
        ])
      ]),
      ui.h('hr'),
      ui.h('div', { class:'hd', style:'border:none;padding:0 0 10px 0' }, [
        ui.h('h2', {}, ['Anhänge']),
        ui.h('div', { class:'small' }, ['(z.B. eingescanntes Info-Blatt, Unterschrift, Fremdbefund)'])
      ]),
      ui.h('div', { class:'row noPrint' }, [
        ui.h('input', { type:'file', onchange: async (e)=>{ if(e.target.files?.[0]) await addAttachment(e.target.files[0]); e.target.value=''; } })
      ]),
      ui.h('div', { class:'list' }, (doc.attachments||[]).map(att =>
        ui.h('div', { class:'item' }, [
          ui.h('div', { class:'t' }, [
            ui.h('div', { class:'name' }, [att.name]),
            ui.h('div', { class:'badge' }, [Math.round((att.size||0)/1024)+' KB'])
          ]),
          ui.h('div', { class:'row noPrint', style:'margin-top:8px' }, [
            ui.h('button', { class:'pill', type:'button', onclick: ()=>downloadAttachment(att) }, ['Download']),
            ui.h('button', { class:'pill danger', type:'button', onclick: ()=>removeAttachment(att.id) }, ['Entfernen'])
          ])
        ])
      )),
      (doc.attachments||[]).length===0 ? ui.h('div', { class:'small' }, ['Keine Anhänge.']) : null
    ])
  ]);
}

function templatesUI(){
  const kinds = templates.listKinds();
  return ui.h('div', {}, [
    ui.h('div', { class:'notice' }, [
      ui.h('div', {}, ['Vorlagen dienen als „Starter“. Du kannst sie pro Dokument anpassen.']),
      ui.h('div', { class:'small' }, ['Tipp: Ebene 2/3 bewusst getrennt halten (Geheimnisse / Resonanz).'])
    ]),
    ui.h('hr'),
    ui.h('div', { class:'list' }, kinds.map(k =>
      ui.h('div', { class:'item', onclick: ()=>addDocument(k) }, [
        ui.h('div', { class:'t' }, [
          ui.h('div', { class:'name' }, [k]),
          ui.h('div', { class:'badge' }, ['+'])
        ]),
        ui.h('div', { class:'small' }, [templates.describe(k)])
      ])
    ))
  ]);
}

function settingsUI(){
  return ui.h('div', {}, [
    ui.h('div', { class:'notice' }, [
      ui.h('div', {}, ['Backup & Sicherheit']),
      ui.h('div', { class:'small' }, [
        'Exportiere regelmäßig (z.B. wöchentlich) ein JSON-Backup und bewahre es getrennt auf (z.B. verschlüsselte Festplatte).'
      ])
    ]),
    ui.h('hr'),
    ui.h('div', { class:'row noPrint' }, [
      ui.h('button', { class:'pill', type:'button', onclick: exportJSON }, ['Export (JSON)']),
      ui.h('input', { type:'file', accept:'.json,application/json', onchange: async (e)=>{ if(e.target.files?.[0]) await importJSON(e.target.files[0]); e.target.value=''; } }),
    ]),
    ui.h('hr'),
    ui.h('div', { class:'small' }, [
      'Hinweis: Passwort schützt die Daten im Browser (Verschlüsselung). ',
      'Wenn du den Browser-Cache/Daten löschst, können lokale Daten verloren gehen. Export ist dein Rettungsanker.'
    ])
  ]);
}

function field(lbl, control){
  return ui.h('div', { class:'field' }, [ui.h('label', {}, [lbl]), control]);
}

ui.mount(document.getElementById('app'), view, state);
ui.render();
