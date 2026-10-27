import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

const QUA = new Date('2026-10-28T10:00:00');
const DOM = new Date('2026-11-01T18:00:00');

async function open(page, hash, { time = QUA, seed } = {}) {
  await page.clock.install({ time });
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/index.html#mais');
  await page.waitForSelector('main > *');
  if (seed?.fn) await page.evaluate(seed.fn, seed.arg); else if (seed) await page.evaluate(seed);
  await page.goto('/index.html#' + hash);
  await page.waitForSelector('main > *');
}

// sessões de musculação: cada item é [data, planId, [[exId, kg, reps, esforço], ...]]
const seedSessions = arg => ({ arg, fn: async sessions => {
  const { db } = await import('/js/db.js');
  await db.setSetting('startDate', '2026-09-14');
  await db.setSetting('v2Since', '2026-10-19');
  let ts = 1;
  for (const [date, planId, sets] of sessions) {
    const sid = await db.add('sessions', { date, planId, startedAt: ts, finishedAt: ts + 1 });
    for (const [i, [exId, kg, reps, effort]] of sets.entries())
      await db.add('sets', { sessionId: sid, date, planId, exId, setIndex: i, kg, reps, secs: null, effort, rir: 2, ts: ts++ });
  }
} });

test('Progresso mostra os gráficos de treino, comida, água, déficit, cardio e corpo', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, 'progresso', { seed: async () => {
    const { db } = await import('/js/db.js');
    await db.setSetting('startDate', '2026-09-14'); await db.setSetting('v2Since', '2026-10-19');
    await db.put('meals', { uid: 'meal:2026-10-27:cafe', date: '2026-10-27', slot: 'cafe', optionId: 'salgado', done: true });
    await db.put('water', { uid: 'water:2026-10-27', date: '2026-10-27', cups: 10 });
    await db.add('cardio', { date: '2026-10-24', type: 'intervalado', minutes: 30, effort: 'moderado', note: '', stage: 1, completed: 'sim', painNextDay: 'nenhuma' });
    await db.add('comps', { date: '2026-03-03', method: 'Dobras cutâneas', weight: 83, fatPct: 24, fatKg: 19.92, leanKg: 63.08 });
    await db.add('body', { date: '2026-10-27', weight: 82, waist: null, note: '' });
  } });
  for (const id of ['cWeeks', 'cKcal', 'cProt', 'cWater', 'cDef', 'cWeight', 'cComp', 'cLean', 'cCardio', 'cStage']) await expect(page.locator('#' + id), id).toBeVisible();
  await expect(page.locator('main')).toContainText('Déficit semanal (estimativa)');
  // o dado do dia 27 aparece no gráfico de calorias
  const kcal = await page.evaluate(() => Chart.getChart('cKcal').data.datasets[0].data);
  expect(kcal[12]).toBe(405);
  expect(errors).toEqual([]);
});

test('tendência por exercício e nota de recuperação', async ({ page }) => {
  const hard = (date, kgs) => [date, 'inferior-a', [['ia1', kgs, 10, 'medio'], ['ia2', 35, 12, 'medio'], ['ia3', 40, 12, 'medio']]];
  const harder = date => [date, 'inferior-a', [['ia1', 100, 8, 'dificil'], ['ia2', 35, 9, 'dificil'], ['ia3', 40, 9, 'dificil']]];
  await open(page, 'progresso', { seed: seedSessions([hard('2026-10-12', 100), hard('2026-10-19', 100), harder('2026-10-26')]) });
  await expect(page.locator('.rows.trends li')).toHaveCount(3);
  await expect(page.locator('.rows.trends')).toContainText('ficando mais difícil');
  await expect(page.locator('main .callout').first()).toContainText('3 exercícios ficaram mais difíceis nesta semana');
  await page.goto('/index.html#treino/inferior-a');
  await page.locator('#ex-ia1 .ex-top').click();
  await expect(page.locator('#ex-ia1 .trend')).toContainText('Tendência: ficando mais difícil');
});

test('conquistas: desbloqueia, comemora uma vez só e nada ligado a peso', async ({ page }) => {
  const s = [];
  for (let i = 0; i < 10; i++) s.push([`2026-10-${String(5 + i * 2).padStart(2, '0')}`, ['inferior-a', 'superior-a', 'inferior-b', 'superior-b'][i % 4], [['ia1', 100 + i, 10, 'medio']]]);
  await open(page, 'progresso/conquistas', { seed: seedSessions(s) });
  await expect(page.locator('.celebrate').first()).toBeVisible();
  await expect(page.locator('.ach li.on')).toContainText(['10 treinos']);
  await expect(page.locator('.ach')).not.toContainText(/peso|gordura/i);
  await page.reload();
  await page.waitForSelector('.ach');
  await expect(page.locator('.celebrate')).toHaveCount(0);
});

test('fechar a semana no domingo', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, 'hoje', { time: DOM, seed: seedSessions([['2026-10-27', 'inferior-a', [['ia1', 100, 10, 'medio']]], ['2026-10-20', 'inferior-a', [['ia1', 95, 10, 'medio']]]]) });
  await expect(page.locator('a.card.closing')).toContainText('Fechar a semana');
  await page.locator('a.card.closing').click();
  await expect(page.locator('#title')).toHaveText('Fechar a semana');
  await expect(page.locator('main')).toContainText('Semana 44');
  await expect(page.locator('main')).toContainText('Leg press 45°: 95 → 100 kg');
  await page.locator('label:has(input[name="energia"][value="alta"])').click();
  await page.locator('#wkNote').fill('Semana boa, canela ok.');
  await page.getByRole('button', { name: 'Fechar a semana' }).click();
  await expect(page.locator('#title')).toHaveText('Progresso');
  await expect(page.locator('main')).toContainText('Semana de 26/10 a 01/11');
  const rec = await page.evaluate(async () => { const { db } = await import('/js/db.js'); return db.get('weekly', 'week:2026-W44'); });
  expect(rec).toMatchObject({ start: '2026-10-26', end: '2026-11-01', feeling: { energia: 'alta', nota: 'Semana boa, canela ok.' } });
  expect(rec.summary.workouts).toBe(1);
  await page.goto('/index.html#hoje');
  await expect(page.locator('a.card.closing')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('na segunda, oferece fechar a semana anterior', async ({ page }) => {
  await open(page, 'hoje', { time: new Date('2026-11-02T09:00:00'), seed: async () => { const { db } = await import('/js/db.js'); await db.setSetting('v2Since', '2026-10-20'); } });
  await expect(page.locator('a.card.closing')).toContainText('26/10 a 01/11');
});
