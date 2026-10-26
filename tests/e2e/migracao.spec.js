import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

const V1_STORES = ['sessions', 'sets', 'body', 'comps', 'cardio', 'settings'];

// Cria um banco v1 com o db.js antigo e devolve o backup v1 exportado por ele.
async function makeV1(page) {
  await page.goto('/tests/fixtures/v1.html');
  await page.waitForFunction(() => window.v1Ready);
  return page.evaluate(async () => {
    const db = window.dbV1;
    const s1 = await db.add('sessions', { date: '2026-10-19', planId: 'inferior-a', startedAt: 1760900000000, finishedAt: 1760903000000 });
    const s2 = await db.add('sessions', { date: '2026-10-20', planId: 'superior-a', startedAt: 1760990000000, finishedAt: null });
    await db.add('sets', { sessionId: s1, date: '2026-10-19', planId: 'inferior-a', exId: 'ia1', setIndex: 0, kg: 120, reps: 10, secs: null, effort: 'medio', rir: 2.5, ts: 1760900100000 });
    await db.add('sets', { sessionId: s1, date: '2026-10-19', planId: 'inferior-a', exId: 'ia5', setIndex: 0, kg: 60, reps: 12, secs: null, effort: 'facil', rir: 4, ts: 1760900200000 });
    await db.add('sets', { sessionId: s2, date: '2026-10-20', planId: 'superior-a', exId: 'sa6', setIndex: 0, kg: 15, reps: 12, secs: null, effort: 'dificil', rir: 0.5, ts: 1760990100000 });
    await db.add('body', { date: '2026-10-19', weight: 82.4, waist: 88, note: '' });
    await db.add('body', { date: '2026-10-20', weight: 82.1, waist: null, note: 'manhã' });
    await db.add('comps', { date: '2026-03-03', method: 'Dobras cutâneas', weight: 83, fatPct: 24, fatKg: 19.92, leanKg: 63.08, muscleKg: null, visceral: null, note: '' });
    await db.add('cardio', { date: '2026-10-19', type: 'caminhada', minutes: 30, effort: 'moderado', note: 'canela ok' });
    await db.setSetting('startDate', '2026-10-12');
    await db.setSetting('lastBackup', '2026-10-18');
    return db.exportAll();
  });
}

async function openApp(page) {
  await page.goto('/index.html#hoje');
  await page.waitForSelector('main > *');
}

test('migração v1 → v2 preserva tudo e preenche uid e updatedAt', async ({ page }) => {
  const errors = watchErrors(page);
  const v1 = await makeV1(page);
  expect(v1.version).toBe(1);

  // abre o app v2 no mesmo banco (a navegação fecha a conexão da v1)
  await openApp(page);
  const after = await page.evaluate(async () => {
    const { db, STORES } = await import('/js/db.js');
    const out = {};
    for (const s of STORES) out[s] = await db.allRaw(s);
    const idb = await new Promise(r => {
      const q = indexedDB.open('treino-app');
      q.onsuccess = () => { r({ version: q.result.version, stores: [...q.result.objectStoreNames].sort() }); q.result.close(); };
    });
    return { out, idb };
  });

  expect(after.idb.version).toBe(2);
  expect(after.idb.stores).toEqual(['achievements', 'body', 'cardio', 'comps', 'daytypes', 'meals', 'profile', 'sessions', 'sets', 'settings', 'water', 'weekly']);
  for (const s of V1_STORES) {
    expect(after.out[s].length, s).toBe(v1[s].length);
    // todo campo antigo continua com o mesmo valor
    for (const old of v1[s]) {
      const key = s === 'settings' ? 'key' : 'id';
      const now = after.out[s].find(r => r[key] === old[key]);
      expect(now, `${s} ${old[key]}`).toBeTruthy();
      for (const [k, v] of Object.entries(old)) expect(now[k], `${s}.${k}`).toEqual(v);
      expect(typeof now.uid).toBe('string');
      expect(typeof now.updatedAt).toBe('number');
    }
  }
  // updatedAt vem do próprio registro
  expect(after.out.sets.find(r => r.exId === 'ia1').updatedAt).toBe(1760900100000);
  expect(after.out.sessions.find(r => r.planId === 'superior-a').updatedAt).toBe(1760990000000);
  // o app continua funcionando com os dados migrados
  await page.goto('/index.html#progresso');
  await expect(page.locator('main')).toContainText('Evolução por exercício');
  await page.goto('/index.html#corpo');
  await expect(page.locator('main')).toContainText('Dobras cutâneas');
  expect(errors).toEqual([]);
});

test('backup v1 importado depois da migração não duplica nada', async ({ page }) => {
  const v1 = await makeV1(page);
  await openApp(page);
  const counts = await page.evaluate(async v1 => {
    const { db } = await import('/js/db.js');
    await db.importAll(v1, 'merge');
    await db.importAll(v1, 'merge');
    const c = {};
    for (const s of ['sessions', 'sets', 'body', 'comps', 'cardio', 'settings']) c[s] = (await db.all(s)).length;
    // as séries continuam ligadas às sessões certas
    const sessions = await db.all('sessions');
    c.orphanSets = (await db.all('sets')).filter(x => !sessions.some(s => s.id === x.sessionId)).length;
    return c;
  }, v1);
  expect(counts).toEqual({ sessions: 2, sets: 3, body: 2, comps: 1, cardio: 1, settings: 2, orphanSets: 0 });
});

test('backup v1 restaurado com "Substituir tudo" num app v2 vazio', async ({ page, browser }) => {
  const v1 = await makeV1(page);
  const ctx = await browser.newContext();
  const fresh = await ctx.newPage();
  await openApp(fresh);
  const c = await fresh.evaluate(async v1 => {
    const { db } = await import('/js/db.js');
    await db.importAll(v1, 'replace');
    const out = {};
    for (const s of ['sessions', 'sets', 'body', 'comps', 'cardio', 'settings']) out[s] = (await db.all(s)).length;
    out.semUid = (await db.all('sets')).filter(r => !r.uid).length;
    return out;
  }, v1);
  expect(c).toEqual({ sessions: 2, sets: 3, body: 2, comps: 1, cardio: 1, settings: 2, semUid: 0 });
  await ctx.close();
});

test('exportar v2 e juntar no mesmo aparelho ou em outro não duplica', async ({ page, browser }) => {
  await makeV1(page);
  await openApp(page);
  const backup = await page.evaluate(async () => {
    const { db } = await import('/js/db.js');
    await db.add('water', { uid: 'water:2026-10-20', date: '2026-10-20', cups: 9 });
    await db.add('body', { date: '2026-10-21', weight: 81.9, waist: null, note: '' });
    const b = await db.exportAll();
    await db.importAll(b, 'merge');
    return b;
  });
  expect(backup.version).toBe(2);
  const same = await page.evaluate(async () => {
    const { db } = await import('/js/db.js');
    return { body: (await db.all('body')).length, water: (await db.all('water')).length };
  });
  expect(same).toEqual({ body: 3, water: 1 });

  // outro aparelho com dados próprios: junta duas vezes
  const ctx = await browser.newContext();
  const other = await ctx.newPage();
  await openApp(other);
  const merged = await other.evaluate(async b => {
    const { db } = await import('/js/db.js');
    const sid = await db.add('sessions', { date: '2026-10-22', planId: 'inferior-b', startedAt: 1, finishedAt: 2 });
    await db.add('sets', { sessionId: sid, date: '2026-10-22', planId: 'inferior-b', exId: 'ib1', setIndex: 0, kg: 50, reps: 10, effort: 'medio', rir: 2.5, ts: 3 });
    await db.importAll(b, 'merge');
    await db.importAll(b, 'merge');
    const sessions = await db.all('sessions'), sets = await db.all('sets');
    return {
      sessions: sessions.length, sets: sets.length, body: (await db.all('body')).length,
      orphan: sets.filter(x => !sessions.some(s => s.id === x.sessionId)).length,
      ia1Session: sessions.find(s => s.id === sets.find(x => x.exId === 'ia1').sessionId).planId
    };
  }, backup);
  expect(merged).toEqual({ sessions: 3, sets: 4, body: 3, orphan: 0, ia1Session: 'inferior-a' });
  await ctx.close();
});

test('apagar vira tombstone: some da tela, vai no backup e se propaga ao juntar', async ({ page, browser }) => {
  await openApp(page);
  const r = await page.evaluate(async () => {
    const { db } = await import('/js/db.js');
    const id = await db.add('body', { date: '2026-10-20', weight: 82, waist: null, note: '' });
    const before = await db.exportAll();
    await new Promise(res => setTimeout(res, 5));
    await db.del('body', id);
    const after = await db.exportAll();
    return { visible: (await db.all('body')).length, raw: after.body.length, deleted: after.body[0].deleted, before, after };
  });
  expect(r).toMatchObject({ visible: 0, raw: 1, deleted: true });

  // aparelho que ainda tem o registro recebe o tombstone e esconde o registro
  const ctx = await browser.newContext();
  const other = await ctx.newPage();
  await openApp(other);
  const vis = await other.evaluate(async ({ before, after }) => {
    const { db } = await import('/js/db.js');
    await db.importAll(before, 'merge');
    const a = (await db.all('body')).length;
    await db.importAll(after, 'merge');
    // um backup velho não ressuscita o registro apagado
    await db.importAll(before, 'merge');
    return [a, (await db.all('body')).length];
  }, { before: r.before, after: r.after });
  expect(vis).toEqual([1, 0]);
  await ctx.close();
});
