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
export function nextInSequence(done) {
  return PLAN.find(p => !done[p.id]) || null;
}
export async function lastSetsFor(exId, excludeSessionId) {
  const rows = (await db.byIndex('sets', 'exId', exId)).filter(s => s.sessionId !== excludeSessionId);
  if (!rows.length) return { date: null, sets: [] };
  rows.sort((a, b) => (a.date === b.date ? a.ts - b.ts : a.date < b.date ? -1 : 1));
  const lastSid = rows[rows.length - 1].sessionId;
  const sets = rows.filter(s => s.sessionId === lastSid).sort((a, b) => a.setIndex - b.setIndex);
  return { date: sets[0].date, sets };
}
export function suggestion(it, sets, phase) {
  if (!sets.length) return '';
  if (isTimed(it)) {
    const ok = sets.every(s => (s.secs || 0) >= 40);
    return ok ? 'Segurou 40 s em todas: mantenha 40 s ou passe para o Pallof press.' : 'Some cerca de 5 s por série na próxima.';
  }
  const { lo, hi } = range(it);
  const target = it.sets[phase];
  const reps = sets.map(s => s.reps || 0);
  const lastKg = sets[sets.length - 1].kg;
  const anyHard = sets.some(s => s.effort === 'dificil');
  const allEasy = sets.every(s => s.effort === 'facil');
  if (sets.length >= target && reps.every(r => r >= hi))
    return anyHard ? `Topo da faixa em todas, mas foi difícil: suba só o menor incremento (estava ${fmtN(lastKg)} kg).`
      : `Topo da faixa em todas as séries: suba a carga (estava ${fmtN(lastKg)} kg).`;
  if (reps.some(r => r < lo)) return `Alguma série ficou abaixo de ${lo} repetições: mantenha a carga ou reduza 5–10%.`;
  if (allEasy && phase === 0) return 'Fácil é o esperado nas semanas 1–2. Mantenha a carga e busque +1 repetição.';
  if (allEasy) return 'Tudo marcado como fácil: busque +2 repetições por série ou suba a carga.';
  return 'Dentro da faixa: mantenha a carga e tente +1 repetição em alguma série.';
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
