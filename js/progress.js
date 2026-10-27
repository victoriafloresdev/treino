// Progresso: tendência por exercício, recordes, semanas consistentes e conquistas. Funções puras.
// A gamificação premia hábitos (treinar, registrar, beber água, bater proteína), nunca o peso.
import { e1rm } from './training.js';

const EFF = { facil: 1, medio: 2, dificil: 3 };
const mean = a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

// Sessões de um exercício, da mais antiga para a mais recente.
export function exSessions(sets, exId) {
  const by = {};
  for (const s of sets) if (s.exId === exId) (by[s.sessionId] = by[s.sessionId] || []).push(s);
  return Object.values(by).map(ss => {
    const eff = ss.map(s => EFF[s.effort]).filter(Boolean);
    return {
      date: ss[0].date, sessionId: ss[0].sessionId, n: ss.length,
      maxKg: Math.max(0, ...ss.map(s => s.kg || 0)),
      reps: ss.reduce((a, s) => a + (s.reps || 0), 0),
      secs: ss.reduce((a, s) => a + (s.secs || 0), 0),
      effort: mean(eff),
      e1: Math.max(0, ...ss.map(s => e1rm(s.kg, s.reps) || 0)) || null
    };
  }).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.sessionId - b.sessionId));
}

export const TREND = {
  facil: { arrow: '↗', label: 'ficando mais fácil' },
  estavel: { arrow: '→', label: 'estável' },
  dificil: { arrow: '↘', label: 'ficando mais difícil' }
};

// Última sessão contra a média das duas anteriores (precisa de 3 sessões).
// Repetições são comparadas por série, para a mudança de 2 para 3 séries não parecer progresso.
// Mais fácil: carga igual ou maior, e esforço caiu ≥ 0,5 ou repetições subiram ≥ 2.
// Mais difícil: carga igual ou menor, e esforço subiu ≥ 0,5 ou repetições caíram.
export function trendOf(sessions, timed = false) {
  if (sessions.length < 3) return null;
  const last = sessions[sessions.length - 1], prev = sessions.slice(-3, -1);
  const vol = s => (timed ? s.secs : s.reps);
  const pKg = mean(prev.map(s => s.maxKg));
  const pEff = mean(prev.map(s => s.effort).filter(v => v != null));
  const dReps = vol(last) - mean(prev.map(s => vol(s) / s.n)) * last.n;
  const repsUp = timed ? dReps >= 10 : dReps >= 2;
  const repsDown = timed ? dReps <= -5 : dReps < -0.5;
  const dEff = last.effort != null && pEff != null ? last.effort - pEff : 0;
  const easier = last.maxKg >= pKg - 0.01 && (dEff <= -0.5 || repsUp);
  const harder = last.maxKg <= pKg + 0.01 && (dEff >= 0.5 || repsDown);
  const id = easier && !harder ? 'facil' : harder && !easier ? 'dificil' : 'estavel';
  return { id, ...TREND[id], date: last.date };
}

// Quantas vezes a força estimada de algum exercício bateu o próprio recorde.
export function prEvents(sets) {
  const best = {}, events = [];
  const sorted = [...sets].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.ts || 0) - (b.ts || 0)));
  for (const s of sorted) {
    const v = e1rm(s.kg, s.reps); if (!v) continue;
    if (best[s.exId] != null && v > best[s.exId] + 0.01) events.push({ exId: s.exId, date: s.date, e1: v });
    if (best[s.exId] == null || v > best[s.exId]) best[s.exId] = v;
  }
  return events;
}

/* ---------- semanas ---------- */
export const CONSISTENT = 0.8;
// weeks: [{ ws, done, total }] em ordem; a semana atual pode estar incompleta
export const isConsistent = w => w.total > 0 && w.done / w.total >= CONSISTENT;
export function consistentStreaks(weeks, currentWs) {
  let cur = 0, best = 0, run = 0;
  for (const w of weeks) {
    if (w.ws === currentWs && !isConsistent(w)) continue; // semana em curso só conta quando já chegou lá
    run = isConsistent(w) ? run + 1 : 0;
    best = Math.max(best, run);
  }
  cur = run;
  return { current: cur, best };
}
// fechamentos com backup em semanas seguidas
export function backupStreak(weekly) {
  const ids = weekly.filter(w => w.backupAt).map(w => w.start).sort();
  let best = 0, run = 0, prev = null;
  for (const s of ids) {
    run = prev && (Date.parse(s) - Date.parse(prev)) / 864e5 === 7 ? run + 1 : 1;
    best = Math.max(best, run); prev = s;
  }
  return best;
}

/* ---------- conquistas ---------- */
// s: { workouts, fullWeeks, prs, stagesDone: [n...], streakBest, backupBest }
export const ACHIEVEMENTS = [
  { id: 'semana-completa', ic: 'calendar-check', title: 'Primeira semana completa', desc: 'Os quatro treinos de musculação numa mesma semana.', ok: s => s.fullWeeks >= 1 },
  { id: 'treinos-10', ic: 'barbell', title: '10 treinos', desc: 'Dez sessões de musculação registradas.', ok: s => s.workouts >= 10, prog: s => [s.workouts, 10] },
  { id: 'treinos-25', ic: 'barbell', title: '25 treinos', desc: 'Vinte e cinco sessões de musculação.', ok: s => s.workouts >= 25, prog: s => [s.workouts, 25] },
  { id: 'treinos-50', ic: 'trophy', title: '50 treinos', desc: 'Cinquenta sessões de musculação.', ok: s => s.workouts >= 50, prog: s => [s.workouts, 50] },
  { id: 'recorde', ic: 'target', title: 'Novo recorde de força', desc: 'A força estimada de um exercício passou do seu melhor.', ok: s => s.prs >= 1 },
  ...[0, 1, 2, 3].map(n => ({ id: `corrida-${n + 1}`, ic: 'sneaker-move', title: `Etapa ${n + 1} da corrida`, desc: 'Uma sessão completa da etapa.', ok: s => s.stagesDone.includes(n) })),
  { id: 'semanas-4', ic: 'list-checks', title: '4 semanas consistentes', desc: '4 semanas seguidas com 80% ou mais dos hábitos.', ok: s => s.streakBest >= 4, prog: s => [Math.min(s.streakBest, 4), 4] },
  { id: 'backup-4', ic: 'download-simple', title: '4 fechamentos com backup', desc: '4 semanas seguidas fechadas com o arquivo exportado.', ok: s => s.backupBest >= 4, prog: s => [Math.min(s.backupBest, 4), 4] }
];
export const evalAchievements = s => ACHIEVEMENTS.map(a => ({ ...a, unlocked: a.ok(s), progress: a.prog ? a.prog(s) : null }));
