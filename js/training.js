// Regras do programa de treino e dados derivados do histórico.
import { todayStr, parseDate, addDays, weekStart, fmtN } from './util.js';
import { db } from './db.js';
import { PLAN, MUSCLES } from './plan.js';

export const e1rm = (kg, reps) => (kg > 0 && reps > 0 && reps <= 15) ? kg * (1 + reps / 30) : null;
export const ITEMS = PLAN.flatMap(p => p.items.map(it => ({ ...it, planId: p.id })));
export const itemById = id => ITEMS.find(i => i.id === id);
export const planById = id => PLAN.find(p => p.id === id);

export const EFFORT = { facil: { l: 'Fácil', rir: 4 }, medio: { l: 'Médio', rir: 2.5 }, dificil: { l: 'Difícil', rir: 0.5 } };
export const isTimed = it => /s$/.test(it.reps);
export function range(it) {
  const m = it.reps.match(/(\d+)–(\d+)/);
  return m ? { lo: +m[1], hi: +m[2] } : { lo: 0, hi: 0 };
}
export const rirFor = (it, phase) => (phase === 0 && !/Pare/.test(it.rir)) ? '3–4' : it.rir;

/* ================= programa ================= */
export async function program() {
  const start = await db.setting('startDate');
  if (!start) return { start: null, week: 0, phase: 0 };
  const days = Math.round((parseDate(todayStr()) - parseDate(start)) / 864e5);
  if (days < 0) return { start, week: 0, phase: 0, future: true };
  const week = Math.floor(days / 7) + 1;
  return { start, week, phase: week <= 2 ? 0 : 1 };
}
export const phaseLabel = p => p.week === 0 ? 'Programa não iniciado' : `Semana ${p.week} · ${p.phase === 0 ? 'adaptação' : 'fase principal'}`;

export function cardioPlan(week, dow) {
  if (dow === 0) return 'Descanso completo';
  const run = dow === 3 || dow === 6;
  if (!run) return (dow === 1 || dow === 4) ? 'Caminhada moderada, 25–30 min' : 'Caminhada leve, 25–30 min';
  if (week <= 2) return 'Caminhada rápida com inclinação de 3–6%, cerca de 30 min';
  if (week <= 4) return '5 min caminhando + 7 × (1 min trote leve + 2 min caminhada) + 4 min caminhando';
  if (week <= 6) return '5 min caminhando + 6 × (2 min trote + 2 min caminhada) + 1 min caminhando';
  return '5 min caminhando + 5 × (3 min trote + 1,5 min caminhada) + 2,5 min caminhando';
}

/* ================= dados derivados ================= */
export async function loadAll() {
  const [sessions, sets, body, comps, cardio] = await Promise.all(['sessions', 'sets', 'body', 'comps', 'cardio'].map(s => db.all(s)));
  const setsBySession = {};
  sets.forEach(s => (setsBySession[s.sessionId] = setsBySession[s.sessionId] || []).push(s));
  const realSessions = sessions.filter(s => (setsBySession[s.id] || []).length > 0);
  return { sessions, realSessions, sets, setsBySession, body, comps, cardio };
}
export function doneThisWeek(all) {
  const ws = weekStart(todayStr());
  const done = {};
  all.realSessions.filter(s => weekStart(s.date) === ws).forEach(s => { done[s.planId] = s; });
  return done;
}
// Sequência dos treinos: a ficha não fica presa ao dia da semana.
export const DEFAULT_ORDER = ['superior-a', 'inferior-a', 'inferior-b', 'superior-b'];
export async function workoutOrder() {
  const o = await db.setting('workoutOrder');
  return Array.isArray(o) && o.length === PLAN.length && PLAN.every(p => o.includes(p.id)) ? o : DEFAULT_ORDER;
}
// Sugerido para a data: o treino já começado nela; senão, o seguinte ao último feito antes dela.
export function suggestedWorkout(all, order, date) {
  const real = all.realSessions.filter(s => s.date <= date && planById(s.planId))
    .sort((a, b) => (a.date === b.date ? (a.startedAt || 0) - (b.startedAt || 0) : a.date < b.date ? -1 : 1));
  const onDate = real.filter(s => s.date === date).pop();
  if (onDate) return onDate.planId;
  const last = real.pop();
  if (!last) return order[0];
  return order[(order.indexOf(last.planId) + 1) % order.length];
}

// Última vez de cada exercício, uma entrada por sessão (a mais recente primeiro).
const HARD = { facil: 1, medio: 2, dificil: 3 };
export function entryOf(sets) {
  const eff = sets.map(s => s.effort).filter(Boolean).sort((a, b) => HARD[b] - HARD[a])[0] || null;
  return { date: sets[0].date, sessionId: sets[0].sessionId, n: sets.length,
    kg: Math.max(0, ...sets.map(s => s.kg || 0)), secs: Math.max(0, ...sets.map(s => s.secs || 0)), effort: eff };
}
export async function historyFor(exId, excludeSessionId) {
  const rows = (await db.byIndex('sets', 'exId', exId)).filter(s => s.sessionId !== excludeSessionId);
  const by = {};
  rows.forEach(s => (by[s.sessionId] = by[s.sessionId] || []).push(s));
  return Object.values(by).map(entryOf)
    .sort((a, b) => (a.date === b.date ? b.sessionId - a.sessionId : a.date < b.date ? 1 : -1));
}

// Sugestão pela dificuldade (o registro é uma carga e uma dificuldade por exercício):
// Fácil → sobe o menor incremento; Médio → mantém, e sobe depois de dois Médios seguidos com a mesma carga;
// Difícil → mantém. Nas semanas 1–2, Fácil é o esperado.
export function suggestion(it, hist, phase) {
  const [last, prev] = hist;
  if (!last) return '';
  if (isTimed(it)) return last.secs >= 40 ? 'Segurou 40 s: mantenha 40 s ou passe para o Pallof press.' : 'Tente uns 5 s a mais.';
  const kg = `${fmtN(last.kg)} kg`;
  if (last.effort === 'facil') return phase === 0 ? `Fácil é o esperado nas semanas 1–2: mantenha ${kg}.` : `Foi fácil com ${kg}: suba o menor incremento.`;
  if (last.effort === 'medio') return prev?.effort === 'medio' && Math.abs(prev.kg - last.kg) < 0.01 && phase > 0
    ? `Dois treinos em Médio com ${kg}: suba o menor incremento.` : `Médio é o ponto certo: mantenha ${kg}.`;
  if (last.effort === 'dificil') return `Foi difícil: mantenha ${kg} até ficar Médio.`;
  return `Mantenha ${kg}.`;
}
export function weeklyMuscleSets(all, phase) {
  const ws = weekStart(todayStr());
  const done = {}, target = {};
  Object.keys(MUSCLES).forEach(m => { done[m] = 0; target[m] = 0; });
  ITEMS.forEach(it => { const n = it.sets[phase]; it.prim.forEach(m => target[m] += n); it.sec.forEach(m => target[m] += n / 2); });
  all.sets.filter(s => weekStart(s.date) === ws).forEach(s => {
    const it = itemById(s.exId); if (!it) return;
    it.prim.forEach(m => done[m] += 1); it.sec.forEach(m => done[m] += 0.5);
  });
  return Object.keys(MUSCLES).filter(m => target[m] > 0).map(m => ({ m, done: done[m], target: target[m] }))
    .sort((a, b) => b.target - a.target);
}
export function avg7(body, upTo) {
  const from = addDays(upTo, -6);
  const w = body.filter(b => b.weight != null && b.date >= from && b.date <= upTo).map(b => b.weight);
  return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null;
}
