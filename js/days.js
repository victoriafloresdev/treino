// Dia a dia da alimentação no banco: escolhas por data, refeições feitas, água, psyllium e tipo do dia.
// As escolhas mais recentes viram o padrão dos próximos dias (como no Plano da Vic).
import { db } from './db.js';
import { DAYS, OPTS, SLOTS, DEFAULT_BUILD, PSY } from './data/nutricao.js';
import { mealOf, totals, add, ZERO, visible, countedMeals } from './nutri.js';
import { resolveDay, weekModelFromPlan } from './daytype.js';
import { todayStr, addDays, weekStart } from './util.js';
import { toast } from './ui.js';

export const mealUid = (date, slot) => `meal:${date}:${slot}`;
const dayUid = date => `day:${date}`;
const waterUid = date => `water:${date}`;

export async function getModel() {
  const m = await db.setting('weekModel');
  // o modelo antigo da ficha (musculação seg/ter/qui/sex) salvo sem edição segue o padrão novo
  const fichaAntiga = 'AABAABD';
  return Array.isArray(m) && m.length === 7 && m.every(t => DAYS[t]) && m.join('') !== fichaAntiga ? m : weekModelFromPlan();
}
export const setModel = model => db.setSetting('weekModel', model);
export async function getProfile() { return (await db.get('profile', 'profile:main')) || null; }
async function getDefaults() {
  const d = (await db.setting('nutriDefaults')) || {};
  return { sel: d.sel || {}, build: { almoco: { ...DEFAULT_BUILD, ...(d.build?.almoco || {}) }, jantar: { ...DEFAULT_BUILD, ...(d.build?.jantar || {}) } }, opt: d.opt || {}, psy: !!d.psy };
}
async function patchDefaults(fn, date = todayStr()) {
  if (date < todayStr()) return; // corrigir um dia que passou não muda o padrão dos próximos
  const d = await getDefaults(); fn(d); await db.setSetting('nutriDefaults', d);
}

// atividades registradas na data: musculação conta com pelo menos 1 série
async function registered(date) {
  const [sessions, sets, cardio] = await Promise.all([db.byIndex('sessions', 'date', date), db.byIndex('sets', 'date', date), db.byIndex('cardio', 'date', date)]);
  return { musc: sessions.some(s => sets.some(x => x.sessionId === s.id)), cardio: cardio.length > 0 };
}

// Tudo o que as telas precisam de um dia.
export async function dayInfo(date = todayStr(), ctx = {}) {
  const model = ctx.model || await getModel();
  const profile = ctx.profile !== undefined ? ctx.profile : await getProfile();
  const defaults = ctx.defaults || await getDefaults();
  const [reg, rec, meals, water] = await Promise.all([registered(date), db.get('daytypes', dayUid(date)), db.byIndex('meals', 'date', date), db.get('water', waterUid(date))]);
  const res = resolveDay(date, model, reg, rec);
  const d = DAYS[res.type];
  const bySlot = Object.fromEntries(meals.map(m => [m.slot, m]));
  const st = {
    sel: { ...defaults.sel }, build: { almoco: { ...defaults.build.almoco }, jantar: { ...defaults.build.jantar } }, included: {},
    psy: rec?.psy != null ? rec.psy : defaults.psy
  };
  for (const m of meals) {
    if (m.optionId) st.sel[m.slot] = m.optionId;
    if (m.build) st.build[m.slot] = { ...st.build[m.slot], ...m.build };
  }
  for (const s of SLOTS) if (s.optional) {
    const v = bySlot[s.id]?.included;
    st.included[s.id] = v != null ? v : (defaults.opt[`${res.type}:${s.id}`] ?? s.defaultOn);
  }
  const done = Object.fromEntries(meals.filter(m => m.done).map(m => [m.slot, true]));
  const planned = totals(d, st);
  // consumido: refeições marcadas como feitas (+ psyllium, se ligado e houver algo feito)
  const doneSlots = countedMeals(d, st).filter(s => done[s.id]);
  let eaten = doneSlots.reduce((t, s) => add(t, bySlot[s.id]?.m && date < todayStr() ? bySlot[s.id].m : mealOf(s.id, d, st).m), ZERO);
  if (st.psy && doneSlots.length) eaten = add(eaten, PSY.m);
  return { date, ...res, d, st, done, planned, eaten, doneCount: doneSlots.length, mealCount: countedMeals(d, st).length,
    water: water?.cups || 0, rec, reg, profile, model, visible: visible(d, profile) };
}

// grava o registro da refeição com a cópia dos macros do momento
async function saveMeal(date, slot, patch) {
  const info = await dayInfo(date);
  const cur = (await db.get('meals', mealUid(date, slot))) || { uid: mealUid(date, slot), date, slot };
  const next = { ...cur, ...patch };
  const st = { ...info.st, sel: { ...info.st.sel }, build: { ...info.st.build } };
  if (next.optionId) st.sel[slot] = next.optionId;
  if (next.build) st.build[slot] = { ...st.build[slot], ...next.build };
  next.m = mealOf(slot, info.d, st).m;
  await db.put('meals', next);
}
export async function chooseOption(date, slot, optionId) {
  if (!OPTS[slot]?.some(o => o.id === optionId)) return;
  await saveMeal(date, slot, { optionId });
  await patchDefaults(d => { d.sel[slot] = optionId; }, date);
}
export async function chooseBuild(date, meal, key, value) {
  const info = await dayInfo(date);
  await saveMeal(date, meal, { build: { ...info.st.build[meal], [key]: value } });
  await patchDefaults(d => { d.build[meal] = { ...d.build[meal], [key]: value }; }, date);
}
export async function setIncluded(date, slot, value) {
  const info = await dayInfo(date);
  await saveMeal(date, slot, { included: value });
  await patchDefaults(d => { d.opt[`${info.type}:${slot}`] = value; }, date);
}
export async function toggleDone(date, slot) {
  const cur = await db.get('meals', mealUid(date, slot));
  await saveMeal(date, slot, { done: !cur?.done });
  return !cur?.done;
}
async function patchDay(date, patch) {
  const cur = (await db.get('daytypes', dayUid(date))) || { uid: dayUid(date), date };
  await db.put('daytypes', { ...cur, ...patch });
}
export async function setPsy(date, value) {
  await patchDay(date, { psy: value });
  await patchDefaults(d => { d.psy = value; }, date);
}
export const setOverride = (date, type) => patchDay(date, { override: type || null });
export async function setSkip(date, kind, value) {
  const cur = await db.get('daytypes', dayUid(date));
  await patchDay(date, { skip: { ...(cur?.skip || {}), [kind]: value } });
}
export const setWater = (date, cups) => db.put('water', { uid: waterUid(date), date, cups: Math.max(0, cups) });

// os 7 dias (seg a dom) da semana da data
export async function weekInfo(date = todayStr()) {
  const ctx = { model: await getModel(), profile: await getProfile(), defaults: await getDefaults() };
  const ws = weekStart(date);
  return Promise.all([0, 1, 2, 3, 4, 5, 6].map(i => dayInfo(addDays(ws, i), ctx)));
}

export async function importProfile(data) {
  if (!data || data.tipo !== 'perfil-saude') throw new Error('Arquivo não é um perfil de saúde deste app.');
  const { tipo, versao, ...rest } = data;
  await db.put('profile', { uid: 'profile:main', ...rest, versao: versao || 1, importedAt: new Date().toISOString() });
}
export const removeProfile = () => db.del('profile', 'profile:main');
// lê o arquivo escolhido e importa; devolve true se deu certo (mensagens pelo toast)
export async function importProfileFile(file) {
  if (!file) return false;
  try { await importProfile(JSON.parse(await file.text())); toast('Perfil de saúde importado.'); return true; }
  catch (err) { toast(err instanceof SyntaxError ? 'Arquivo inválido: não é um JSON.' : err.message, 4000); return false; }
}
