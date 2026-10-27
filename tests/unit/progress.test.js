// Tendência por exercício, recordes, semanas consistentes e conquistas.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { exSessions, trendOf, prEvents, consistentStreaks, backupStreak, evalAchievements, ACHIEVEMENTS } from '../../js/progress.js';

let sid = 0;
// uma sessão: kg, lista de reps e esforço de cada série
const sess = (date, kg, reps, effort) => { sid++; return reps.map((r, i) => ({ sessionId: sid, date, exId: 'ia1', setIndex: i, kg, reps: r, effort: effort[i] ?? effort[0], ts: i })); };
const trend = (...ss) => trendOf(exSessions(ss.flat(), 'ia1'))?.id;

test('tendência precisa de 3 sessões', () => {
  assert.equal(trend(sess('2026-10-01', 100, [10, 10], ['medio']), sess('2026-10-05', 100, [10, 10], ['medio'])), undefined);
});

test('mais fácil: carga igual ou maior e esforço caiu ou repetições subiram', () => {
  assert.equal(trend(sess('2026-10-01', 100, [10, 10], ['medio']), sess('2026-10-05', 100, [10, 10], ['medio']), sess('2026-10-08', 100, [10, 10], ['facil'])), 'facil');
  assert.equal(trend(sess('2026-10-01', 100, [10, 10], ['medio']), sess('2026-10-05', 100, [10, 10], ['medio']), sess('2026-10-08', 105, [11, 11], ['medio'])), 'facil');
});

test('mais difícil: carga igual ou menor e esforço subiu ou repetições caíram', () => {
  assert.equal(trend(sess('2026-10-01', 100, [10, 10], ['medio']), sess('2026-10-05', 100, [10, 10], ['medio']), sess('2026-10-08', 100, [10, 10], ['dificil'])), 'dificil');
  assert.equal(trend(sess('2026-10-01', 100, [12, 12], ['medio']), sess('2026-10-05', 100, [12, 12], ['medio']), sess('2026-10-08', 95, [10, 10], ['medio'])), 'dificil');
});

test('estável, e subir a carga com menos repetições não é "mais difícil"', () => {
  assert.equal(trend(sess('2026-10-01', 100, [10, 10], ['medio']), sess('2026-10-05', 100, [10, 10], ['medio']), sess('2026-10-08', 100, [10, 11], ['medio'])), 'estavel');
  assert.equal(trend(sess('2026-10-01', 100, [12, 12], ['medio']), sess('2026-10-05', 100, [12, 12], ['medio']), sess('2026-10-08', 110, [9, 9], ['medio'])), 'estavel');
});

test('passar de 2 para 3 séries não conta como mais repetições', () => {
  assert.equal(trend(sess('2026-10-01', 100, [10, 10], ['medio']), sess('2026-10-05', 100, [10, 10], ['medio']), sess('2026-10-14', 100, [10, 10, 10], ['medio'])), 'estavel');
});

test('recordes de força estimada', () => {
  const sets = [...sess('2026-10-01', 100, [10], ['medio']), ...sess('2026-10-05', 100, [12], ['medio']), ...sess('2026-10-08', 100, [11], ['medio'])];
  assert.equal(prEvents(sets).length, 1);
});

test('semanas consistentes: a sequência é de semanas, não de dias', () => {
  const w = (ws, done, total = 10) => ({ ws, done, total });
  const weeks = [w('2026-09-28', 9), w('2026-10-05', 8), w('2026-10-12', 6), w('2026-10-19', 8), w('2026-10-26', 3)];
  // a semana atual ainda não chegou a 80%, então não quebra a sequência
  assert.deepEqual(consistentStreaks(weeks, '2026-10-26'), { current: 1, best: 2 });
  assert.deepEqual(consistentStreaks([...weeks.slice(0, 4), w('2026-10-26', 9)], '2026-10-26'), { current: 2, best: 2 });
});

test('fechamentos com backup em semanas seguidas', () => {
  const wk = (start, b = true) => ({ start, backupAt: b ? 1 : null });
  assert.equal(backupStreak([wk('2026-10-05'), wk('2026-10-12'), wk('2026-10-19', false), wk('2026-10-26')]), 2);
  assert.equal(backupStreak([wk('2026-10-05'), wk('2026-10-12'), wk('2026-10-19'), wk('2026-10-26')]), 4);
});

test('conquistas: nenhuma ligada a peso ou gordura', () => {
  for (const a of ACHIEVEMENTS) assert.doesNotMatch(a.title + a.desc, /peso|kg|gordura|emagre/i);
  const r = evalAchievements({ workouts: 12, fullWeeks: 1, prs: 0, stagesDone: [0, 1], streakBest: 2, backupBest: 0 });
  const on = r.filter(a => a.unlocked).map(a => a.id);
  assert.deepEqual(on, ['semana-completa', 'treinos-10', 'corrida-1', 'corrida-2']);
  assert.deepEqual(r.find(a => a.id === 'treinos-25').progress, [12, 25]);
});
