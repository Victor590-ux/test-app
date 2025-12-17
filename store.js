// Encrypted local store for PraxisDoku
// We store a single JSON payload (patients + docs) encrypted in localStorage.
// Key derived from passphrase via PBKDF2.
// If unlocked, we keep decrypted data in-memory and also persist encrypted blob on every change.

const LS_KEY = 'praxisdoku_vault_v1';

function utf8ToBytes(str){
  return new TextEncoder().encode(str);
}
function bytesToUtf8(buf){
  return new TextDecoder().decode(buf);
}
function b64encode(buf){
  const bytes = new Uint8Array(buf);
  let bin = '';
  for(const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function b64decode(b64){
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
  return bytes.buffer;
}

async function deriveKey(passphrase, salt){
  const baseKey = await crypto.subtle.importKey(
    'raw',
    utf8ToBytes(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name:'PBKDF2', salt, iterations: 120000, hash:'SHA-256' },
    baseKey,
    { name:'AES-GCM', length:256 },
    false,
    ['encrypt','decrypt']
  );
}

function defaultData(){
  return {
    version: 1,
    patients: [],
    docs: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

let _key = null;
let _data = null;

async function encryptAndSave(){
  if(!_key || !_data) return;
  _data.updatedAt = new Date().toISOString();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const plaintext = utf8ToBytes(JSON.stringify(_data));
  const ciphertext = await crypto.subtle.encrypt({ name:'AES-GCM', iv }, _key, plaintext);
  const payload = {
    v: 1,
    iv: b64encode(iv),
    ct: b64encode(ciphertext),
    // salt not stored here; stored alongside in header
    // but we store full vault object with salt
  };
  // salt stored separately in meta
  const vault = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
  const saltB64 = vault?.salt;
  localStorage.setItem(LS_KEY, JSON.stringify({ salt: saltB64, payload }));
}

async function initVaultIfMissing(){
  const existing = localStorage.getItem(LS_KEY);
  if(existing) return;
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const vault = { salt: b64encode(salt), payload: null };
  localStorage.setItem(LS_KEY, JSON.stringify(vault));
}

async function unlock(passphrase){
  await initVaultIfMissing();
  const vault = JSON.parse(localStorage.getItem(LS_KEY));
  const salt = new Uint8Array(b64decode(vault.salt));
  _key = await deriveKey(passphrase, salt);
  if(!vault.payload){
    _data = defaultData();
    await encryptAndSave();
    return true;
  }
  const iv = new Uint8Array(b64decode(vault.payload.iv));
  const ct = b64decode(vault.payload.ct);
  const pt = await crypto.subtle.decrypt({ name:'AES-GCM', iv }, _key, ct);
  _data = JSON.parse(bytesToUtf8(pt));
  if(!_data?.patients) _data = defaultData();
  return true;
}

function requireUnlocked(){
  if(!_data) throw new Error('locked');
}

function listPatients(){
  requireUnlocked();
  return _data.patients.slice().sort((a,b)=> (a.lastName||'').localeCompare(b.lastName||''));
}
function getPatientSync(id){
  requireUnlocked();
  return _data.patients.find(p=>p.id===id) || null;
}
async function getPatient(id){ return getPatientSync(id); }

function listDocsForPatient(pid){
  requireUnlocked();
  return _data.docs.filter(d=>d.patientId===pid);
}
function getDocSync(id){
  requireUnlocked();
  return _data.docs.find(d=>d.id===id) || null;
}
async function getDoc(id){ return getDocSync(id); }

async function upsertPatient(p){
  requireUnlocked();
  const idx = _data.patients.findIndex(x=>x.id===p.id);
  if(idx>=0) _data.patients[idx]=p; else _data.patients.push(p);
  await encryptAndSave();
}
async function deletePatient(id){
  requireUnlocked();
  _data.patients = _data.patients.filter(p=>p.id!==id);
  _data.docs = _data.docs.filter(d=>d.patientId!==id);
  await encryptAndSave();
}

async function upsertDoc(d){
  requireUnlocked();
  const idx = _data.docs.findIndex(x=>x.id===d.id);
  if(idx>=0) _data.docs[idx]=d; else _data.docs.push(d);
  await encryptAndSave();
}
async function deleteDoc(id){
  requireUnlocked();
  _data.docs = _data.docs.filter(d=>d.id!==id);
  await encryptAndSave();
}

function exportAll(){
  requireUnlocked();
  return JSON.parse(JSON.stringify(_data));
}
async function importAll(data){
  requireUnlocked();
  if(!data || !data.patients || !data.docs) throw new Error('bad import');
  _data = data;
  await encryptAndSave();
}

async function migrateIfNeeded(){
  requireUnlocked();
  // placeholder for future migrations
}

export const store = {
  unlock,
  migrateIfNeeded,
  listPatients,
  getPatientSync,
  getPatient,
  upsertPatient,
  deletePatient,
  listDocsForPatient,
  getDocSync,
  getDoc,
  upsertDoc,
  deleteDoc,
  exportAll,
  importAll,
};
