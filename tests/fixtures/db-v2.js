// Armazenamento local (IndexedDB). Os dados ficam só neste aparelho.
// Regras: mudanças só por DB_VERSION + onupgradeneeded aditivo; nunca apagar nem renomear stores ou campos.
const DB_NAME = 'treino-app';
const DB_VERSION = 2;
// v1: chave numérica autoincremental (settings usa `key`)
export const STORES_V1 = ['sessions', 'sets', 'body', 'comps', 'cardio', 'settings'];
// v2: chave `uid`, determinística por data quando faz sentido (ex.: water:2026-10-27)
export const STORES_V2 = ['meals', 'water', 'daytypes', 'profile', 'achievements', 'weekly'];
export const STORES = [...STORES_V1, ...STORES_V2];
const KEY_UID = new Set(STORES_V2);

/* ---------- uid e carimbo de data ---------- */
export function newUid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // fora de HTTPS (teste pela rede local) o randomUUID não existe
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
// JSON com chaves ordenadas, sem os campos de controle
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).filter(k => !['id', 'uid', 'updatedAt', 'deleted'].includes(k)).sort()
    .map(k => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  return JSON.stringify(v ?? null);
}
// FNV-1a de 64 bits em duas metades: estável entre aparelhos e versões
function hash(str) {
  let h1 = 0x811c9dc5, h2 = 0x01000193 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return h1.toString(16).padStart(8, '0') + h2.toString(16).padStart(8, '0');
}
// Registro antigo (sem uid): o uid vem do conteúdo, para que o mesmo registro
// num backup v1 seja reconhecido depois da migração e não seja duplicado.
export function legacyUid(store, row) {
  return store === 'settings' ? `setting:${row.key}` : `v1:${store}:${hash(stable(row))}`;
}
function legacyUpdatedAt(row) {
  const t = row.ts || row.finishedAt || row.startedAt;
  if (t) return t;
  if (typeof row.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.date)) {
    const [y, m, d] = row.date.split('-').map(Number);
    return new Date(y, m - 1, d, 12).getTime();
  }
  return 0;
}
function normalize(store, row) {
  const r = { ...row };
  if (!r.uid) r.uid = legacyUid(store, row);
  if (r.updatedAt == null) r.updatedAt = legacyUpdatedAt(row);
  return r;
}

/* ---------- abertura e migração ---------- */
let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = req.result, tx = req.transaction;
      if (e.oldVersion < 1) {
        const mk = (name, idx = []) => {
          const st = db.createObjectStore(name, name === 'settings' ? { keyPath: 'key' } : { keyPath: 'id', autoIncrement: true });
          idx.forEach(i => st.createIndex(i, i));
        };
        mk('sessions', ['date']);
        mk('sets', ['sessionId', 'exId', 'date']);
        mk('body', ['date']);
        mk('comps', ['date']);
        mk('cardio', ['date']);
        mk('settings');
      }
      if (e.oldVersion < 2) {
        // stores antigos: índice de uid e preenchimento de uid/updatedAt, sem tocar nos outros campos
        for (const name of STORES_V1) {
          const st = tx.objectStore(name);
          if (!st.indexNames.contains('uid')) st.createIndex('uid', 'uid');
          st.openCursor().onsuccess = ev => {
            const cur = ev.target.result;
            if (!cur) return;
            const v = cur.value;
            if (!v.uid || v.updatedAt == null) cur.update(normalize(name, v));
            cur.continue();
          };
        }
        for (const name of STORES_V2) {
          if (db.objectStoreNames.contains(name)) continue;
          const st = db.createObjectStore(name, { keyPath: 'uid' });
          st.createIndex('date', 'date');
        }
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // outra aba abriu uma versão nova: libera o banco para o upgrade dela
      db.onversionchange = () => { db.close(); dbp = null; };
      resolve(db);
    };
    req.onerror = () => { dbp = null; reject(req.error); };
    req.onblocked = () => console.warn('Banco ocupado por outra aba do app. Feche as outras abas para atualizar.');
  });
  return dbp;
}

function tx(store, mode, fn) {
  return open().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const st = t.objectStore(store);
    let out;
    Promise.resolve(fn(st)).then(r => { out = r; });
    t.oncomplete = () => resolve(out instanceof IDBRequest ? out.result : out);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}
const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const live = rows => rows.filter(r => !r.deleted);
const stamp = val => ({ ...val, uid: val.uid || newUid(), updatedAt: Date.now() });

export const db = {
  // leituras ignoram os registros apagados (tombstones)
  all: store => tx(store, 'readonly', st => reqP(st.getAll())).then(live),
  allRaw: store => tx(store, 'readonly', st => reqP(st.getAll())),
  get: (store, key) => tx(store, 'readonly', st => reqP(st.get(key))).then(r => (r && !r.deleted ? r : undefined)),
  byIndex: (store, index, value) => tx(store, 'readonly', st => reqP(st.index(index).getAll(value))).then(live),
  add: (store, val) => tx(store, 'readwrite', st => reqP(st.add(stamp(val)))),
  put: (store, val) => tx(store, 'readwrite', st => reqP(st.put(stamp(val)))),
  // apagar vira tombstone, para a consolidação no PC saber que o registro sumiu
  del: (store, key) => tx(store, 'readwrite', async st => {
    const cur = await reqP(st.get(key));
    if (cur) st.put({ ...cur, deleted: true, updatedAt: Date.now() });
  }),
  clear: store => tx(store, 'readwrite', st => reqP(st.clear())),
  async setting(key, def = null) { const r = await db.get('settings', key); return r ? r.value : def; },
  setSetting: (key, value) => db.put('settings', { key, value, uid: `setting:${key}` }),

  async exportAll() {
    const data = { app: 'treino-app', version: DB_VERSION, exportedAt: new Date().toISOString() };
    for (const s of STORES) data[s] = await db.allRaw(s);
    return data;
  },

  // Aceita backups v1 (sem uid) e v2.
  // 'replace' apaga os stores presentes no arquivo e grava o backup no lugar.
  // 'merge' junta por uid: registro novo entra; o que já existe só é trocado se o do arquivo for mais recente.
  async importAll(data, mode = 'replace') {
    if (!data || data.app !== 'treino-app') throw new Error('Arquivo não reconhecido. Use um backup exportado por este app.');
    const sessionMap = {};
    for (const s of STORES) {
      if (!Array.isArray(data[s])) continue;
      const rows = data[s].map(r => normalize(s, r));
      if (mode === 'replace') {
        await db.clear(s);
        await tx(s, 'readwrite', st => { rows.forEach(r => st.put(r)); });
        continue;
      }
      for (const row of rows) {
        const r = { ...row };
        if (s === 'sets' && r.sessionId != null) r.sessionId = sessionMap[r.sessionId] ?? r.sessionId;
        if (KEY_UID.has(s) || s === 'settings') {
          const cur = await tx(s, 'readonly', st => reqP(st.get(KEY_UID.has(s) ? r.uid : r.key)));
          if (!cur || (r.updatedAt || 0) > (cur.updatedAt || 0)) await tx(s, 'readwrite', st => reqP(st.put(r)));
          continue;
        }
        const oldId = r.id; delete r.id;
        const [cur] = await tx(s, 'readonly', st => reqP(st.index('uid').getAll(r.uid)));
        if (cur) {
          if ((r.updatedAt || 0) > (cur.updatedAt || 0)) await tx(s, 'readwrite', st => reqP(st.put({ ...r, id: cur.id })));
          if (s === 'sessions') sessionMap[oldId] = cur.id;
        } else {
          const newId = await tx(s, 'readwrite', st => reqP(st.add(r)));
          if (s === 'sessions') sessionMap[oldId] = newId;
        }
      }
    }
  }
};
