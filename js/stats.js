// Números agregados para Progresso, conquistas e fechamento semanal (lê o banco; cálculos em progress.js).
import { db } from './db.js';
import { todayStr, addDays, weekStart, isoWeek } from './util.js';
import { loadAll, ITEMS, isTimed, avg7 } from './training.js';
import { PLAN } from './plan.js';
import { waterGoalCups } from './nutri.js';
import { dayInfo, getModel, getProfile } from './days.js';
import { habitsOf } from './habitos.js';
import { exSessions, trendOf, prEvents, consistentStreaks, backupStreak, evalAchievements, isConsistent } from './progress.js';

// Desde quando a v2 está em uso: hábitos e semanas consistentes contam a partir daí.
export async function v2Since() {
  let s = await db.setting('v2Since');
  if (!s) { s = todayStr(); await db.setSetting('v2Since', s); }
  return s;
}

/* ---------- hábitos por semana ---------- */
export async function weekHabits(ws, since, today = todayStr()) {
  const body = await db.all('body');
  const ctx = { model: await getModel(), profile: await getProfile() };
  let done = 0, total = 0;
  const days = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(ws, i);
    if (date > today || date < since) continue;
    const info = await dayInfo(date, ctx);
    const h = habitsOf(info, body.some(b => b.date === date && b.weight != null));
    done += h.done; total += h.total; days.push({ date, ...h });
  }
  return { ws, done, total, days };
}
export async function allWeekHabits(today = todayStr()) {
  const since = await v2Since();
  const out = [];
  for (let ws = weekStart(since); ws <= weekStart(today); ws = addDays(ws, 7)) out.push(await weekHabits(ws, since, today));
  return out;
}

/* ---------- séries diárias (gráficos) ---------- */
export async function dailySeries(n = 14, today = todayStr()) {
  const ctx = { model: await getModel(), profile: await getProfile() };
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    const x = await dayInfo(date, ctx);
    out.push({ date, type: x.type, target: x.d.target, burn: x.d.burn, eaten: x.eaten[0], protein: x.eaten[1], planned: x.planned[0],
      water: x.water, waterGoal: waterGoalCups(x.d), doneCount: x.doneCount, mealCount: x.mealCount });
  }
  return out;
}
// Déficit estimado por semana: usa o que foi marcado; dia sem registro completo usa o planejado.
export async function weeklyDeficit(nWeeks = 8, today = todayStr()) {
  const since = await v2Since();
  const ctx = { model: await getModel(), profile: await getProfile() };
  const out = [];
  for (let k = nWeeks - 1; k >= 0; k--) {
    const ws = addDays(weekStart(today), -7 * k);
    let def = 0, days = 0;
    for (let i = 0; i < 7; i++) {
      const date = addDays(ws, i);
      if (date > today || date < since) continue;
      const x = await dayInfo(date, ctx);
      const kcal = x.mealCount && x.doneCount / x.mealCount >= 0.8 ? x.eaten[0] : x.planned[0];
      def += x.d.burn - kcal; days++;
    }
    out.push({ ws, def: days ? def : null, days });
  }
  return out;
}

/* ---------- tendência dos exercícios ---------- */
export function trendsAll(sets) {
  const seen = new Set();
  return ITEMS.filter(it => !seen.has(it.id) && seen.add(it.id)).map(it => ({ it, t: trendOf(exSessions(sets, it.id), isTimed(it)) })).filter(x => x.t);
}
// 3 ou mais exercícios ficando mais difíceis na semana: nota sobre recuperação
export function recoveryNote(trends, ws) {
  const hard = trends.filter(x => x.t.id === 'dificil' && x.t.date >= ws);
  return hard.length >= 3 ? hard : null;
}

/* ---------- conquistas ---------- */
export async function achievementStats() {
  const all = await loadAll();
  const cardio = await db.all('cardio');
  const weekly = await db.all('weekly');
  const byWeek = {};
  all.realSessions.forEach(s => { (byWeek[weekStart(s.date)] = byWeek[weekStart(s.date)] || new Set()).add(s.planId); });
  const weeks = await allWeekHabits();
  return {
    workouts: all.realSessions.length,
    fullWeeks: Object.values(byWeek).filter(set => PLAN.every(p => set.has(p.id))).length,
    prs: prEvents(all.sets).length,
    stagesDone: [...new Set(cardio.filter(c => Number.isInteger(c.stage) && c.completed === 'sim').map(c => c.stage))],
    streak: consistentStreaks(weeks, weekStart(todayStr())),
    streakBest: consistentStreaks(weeks, weekStart(todayStr())).best,
    backupBest: backupStreak(weekly),
    weeks
  };
}
// Grava as conquistas novas e devolve as que acabaram de ser desbloqueadas.
export async function checkAchievements(stats) {
  const s = stats || await achievementStats();
  const have = new Set((await db.all('achievements')).map(a => a.id));
  const fresh = evalAchievements(s).filter(a => a.unlocked && !have.has(a.id));
  for (const a of fresh) await db.put('achievements', { uid: `ach:${a.id}`, id: a.id, date: todayStr(), unlockedAt: Date.now() });
  return fresh;
}

/* ---------- fechamento semanal ---------- */
export const weekUid = ws => `week:${isoWeek(ws).id}`;
// Semana a fechar: a atual no domingo; nos outros dias, a anterior, se ainda não foi fechada.
export async function pendingClosing(today = todayStr()) {
  const since = await v2Since();
  const isSunday = new Date(today + 'T12:00:00').getDay() === 0;
  const ws = isSunday ? weekStart(today) : addDays(weekStart(today), -7);
  if (addDays(ws, 6) < since) return null;
  const rec = await db.get('weekly', weekUid(ws));
  return rec?.closedAt ? null : ws;
}
export async function closingSummary(ws, today = todayStr()) {
  const we = addDays(ws, 6), inW = d => d >= ws && d <= we;
  const all = await loadAll(), cardio = await db.all('cardio'), achievements = await db.all('achievements');
  const since = await v2Since();
  const wh = await weekHabits(ws, since, today);
  const ctx = { model: await getModel(), profile: await getProfile() };
  const days = [];
  for (let i = 0; i < 7; i++) { const date = addDays(ws, i); if (date <= today) days.push(await dayInfo(date, ctx)); }
  const logged = days.filter(x => x.doneCount > 0);
  const avg = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);
  const sessions = all.realSessions.filter(s => inW(s.date));
  const wCardio = cardio.filter(c => inW(c.date));
  // cargas que subiram: maior carga da semana acima de tudo que veio antes
  const loadsUp = [];
  for (const it of ITEMS) {
    if (isTimed(it) || loadsUp.some(x => x.id === it.id)) continue;
    const week = all.sets.filter(s => s.exId === it.id && inW(s.date)).map(s => s.kg || 0);
    const before = all.sets.filter(s => s.exId === it.id && s.date < ws).map(s => s.kg || 0);
    if (week.length && before.length && Math.max(...week) > Math.max(...before)) loadsUp.push({ id: it.id, name: it.name, from: Math.max(...before), to: Math.max(...week) });
  }
  const trends = trendsAll(all.sets.filter(s => s.date <= we)).filter(x => inW(x.t.date));
  return {
    ws, we, habits: { done: wh.done, total: wh.total, consistent: isConsistent(wh) },
    workouts: sessions.length, workoutNames: [...new Set(sessions.map(s => PLAN.find(p => p.id === s.planId)?.name).filter(Boolean))],
    cardio: { count: wCardio.length, minutes: wCardio.reduce((a, c) => a + (c.minutes || 0), 0) },
    kcal: avg(logged.map(x => x.eaten[0])), protein: avg(logged.map(x => x.eaten[1])), loggedDays: logged.length,
    water: avg(days.map(x => x.water)), waterGoal: avg(days.map(x => waterGoalCups(x.d))),
    weight: avg7(all.body, we < today ? we : today), weightPrev: avg7(all.body, addDays(ws, -1)),
    loadsUp, easier: trends.filter(x => x.t.id === 'facil').map(x => x.it.name), harder: trends.filter(x => x.t.id === 'dificil').map(x => x.it.name),
    achievements: achievements.filter(a => inW(a.date)).map(a => a.id)
  };
}
