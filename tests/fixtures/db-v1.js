// Armazenamento local (IndexedDB). Os dados ficam só neste aparelho.
const DB_NAME = 'treino-app';
const DB_VERSION = 1;
export const STORES = ['sessions', 'sets', 'body', 'comps', 'cardio', 'settings'];

let dbp = null;
function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      const mk = (name, idx = []) => {
        if (db.objectStoreNames.contains(name)) return;
        const st = db.createObjectStore(name, name === 'settings' ? { keyPath: 'key' } : { keyPath: 'id', autoIncrement: true });
        idx.forEach(i => st.createIndex(i, i));
      };
      mk('sessions', ['date']);
      mk('sets', ['sessionId', 'exId', 'date']);
      mk('body', ['date']);
      mk('comps', ['date']);
      mk('cardio', ['date']);
      mk('settings');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
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

export const db = {
  all: store => tx(store, 'readonly', st => reqP(st.getAll())),
  get: (store, key) => tx(store, 'readonly', st => reqP(st.get(key))),
  add: (store, val) => tx(store, 'readwrite', st => reqP(st.add(val))),
  put: (store, val) => tx(store, 'readwrite', st => reqP(st.put(val))),
  del: (store, key) => tx(store, 'readwrite', st => reqP(st.delete(key))),
  byIndex: (store, index, value) => tx(store, 'readonly', st => reqP(st.index(index).getAll(value))),
  clear: store => tx(store, 'readwrite', st => reqP(st.clear())),
  async setting(key, def = null) { const r = await db.get('settings', key); return r ? r.value : def; },
  setSetting: (key, value) => db.put('settings', { key, value }),

  async exportAll() {
    const data = { app: 'treino-app', version: 1, exportedAt: new Date().toISOString() };
    for (const s of STORES) data[s] = await db.all(s);
    return data;
  },
  // mode 'merge' acrescenta; 'replace' apaga tudo antes
  async importAll(data, mode = 'replace') {
    if (!data || data.app !== 'treino-app') throw new Error('Arquivo não reconhecido. Use um backup exportado por este app.');
    const sessionMap = {};
    for (const s of STORES) {
      if (!Array.isArray(data[s])) continue;
      if (mode === 'replace') await db.clear(s);
      for (const row of data[s]) {
        const r = { ...row };
        if (mode === 'replace' || s === 'settings') { await db.put(s, r); continue; }
        // merge: gera novos ids para não sobrescrever o que já existe
        const oldId = r.id; delete r.id;
        if (s === 'sets' && r.sessionId != null) r.sessionId = sessionMap[r.sessionId] ?? r.sessionId;
        const newId = await db.add(s, r);
        if (s === 'sessions') sessionMap[oldId] = newId;
      }
    }
  }
};
