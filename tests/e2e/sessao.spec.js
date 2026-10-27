import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

const start = async page => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/index.html#hoje');
  await page.getByRole('button', { name: 'Salvar data de início' }).click();
};
const db = (page, fn) => page.evaluate(async src => { const { db } = await import('/js/db.js'); return new Function('db', `return (${src})(db)`)(db); }, fn.toString());

// Uma carga e uma dificuldade por exercício, valendo para todas as séries do dia.
test('registrar carga e dificuldade do exercício; vale para todas as séries', async ({ page }) => {
  const errors = watchErrors(page);
  await start(page);
  await page.goto('/index.html#treino/inferior-a');
  await expect(page.locator('.ex .n')).toHaveText(['1', '2', '3', '4', '5', '6']);
  await expect(page.locator('main')).not.toContainText('Superset');

  const ex = page.locator('#ex-ia1');
  await expect(ex).toHaveClass(/open/);
  await ex.locator('input[name="v"]').fill('100');
  await ex.getByRole('button', { name: 'Mais 2,5 kg' }).click();
  await ex.getByRole('button', { name: 'Mais 2,5 kg' }).click();
  await ex.getByRole('button', { name: 'Menos 2,5 kg' }).click();
  await expect(ex.locator('input[name="v"]')).toHaveValue('102,5');
  // sem dificuldade, pede para escolher
  await ex.getByRole('button', { name: /Salvar/ }).click();
  await expect(page.locator('#toast')).toContainText('Escolha como foi');
  await ex.locator('label.e-medio').click();
  await ex.getByRole('button', { name: 'Salvar · 2 séries' }).click();

  await expect(ex).toHaveClass(/done/);
  await expect(ex.locator('.ex-top .c')).toHaveText('102,5 kg');
  await expect(page.locator('#ex-ia2')).toHaveClass(/open/);
  await expect(page.locator('#timer')).not.toHaveClass(/on/);
  let sets = await db(page, async db => (await db.all('sets')).map(s => [s.exId, s.kg, s.reps, s.effort, s.setIndex]));
  expect(sets).toEqual([['ia1', 102.5, null, 'medio', 0], ['ia1', 102.5, null, 'medio', 1]]);

  // atualizar troca o registro inteiro
  await ex.locator('.ex-top').click();
  await ex.locator('input[name="v"]').fill('105');
  await ex.locator('label.e-dificil').click();
  await ex.getByRole('button', { name: 'Atualizar · 2 séries' }).click();
  await expect(ex.locator('.ex-top .c')).toHaveText('105 kg');
  sets = await db(page, async db => (await db.all('sets')).map(s => [s.kg, s.effort]));
  expect(sets).toEqual([[105, 'dificil'], [105, 'dificil']]);

  // prancha/abdominal de tempo e exercício de máquina convivem; apagar remove tudo do exercício
  await ex.locator('.ex-top').click();
  await ex.getByRole('button', { name: 'Apagar registro' }).click();
  await expect(ex).not.toHaveClass(/done/);
  expect(await db(page, async db => (await db.all('sets')).length)).toBe(0);
  expect(errors).toEqual([]);
});

test('num dia novo, a carga já vem com a última usada e a sugestão segue a dificuldade', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-29T18:00:00') });
  await start(page);
  await db(page, async db => {
    for (const [date, kg, effort] of [['2026-10-19', 100, 'medio'], ['2026-10-22', 100, 'medio']]) {
      const sid = await db.add('sessions', { date, planId: 'inferior-a', startedAt: 1, finishedAt: 2 });
      for (const i of [0, 1, 2]) await db.add('sets', { sessionId: sid, date, planId: 'inferior-a', exId: 'ia1', setIndex: i, kg, reps: 10, effort, ts: i });
    }
  });
  await page.goto('/index.html#treino/inferior-a');
  const ex = page.locator('#ex-ia1');
  await expect(ex.locator('input[name="v"]')).toHaveValue('100');
  await expect(ex.locator('.ex-hint')).toContainText('Última vez (22/10): 100 kg, médio.');
  // semana 1 (fase de adaptação): mantém
  await expect(ex.locator('.ex-hint')).toContainText('Médio é o ponto certo: mantenha 100 kg.');

  // detalhes: prescrição, histórico, desenho muscular e execução numa gaveta
  await ex.getByRole('button', { name: 'Detalhes e como fazer' }).click();
  await expect(page.locator('#sheet .ex-meta')).toContainText('Descanso');
  await expect(page.locator('#sheet .hist li')).toHaveCount(2);
  await expect(page.locator('#sheet .ex-map svg')).toBeVisible();
  await expect(page.locator('#sheet .ex-map')).toContainText('Principal: Quadríceps, Glúteo máximo');
});

test('sugestão pela dificuldade (fase principal)', async ({ page }) => {
  await page.goto('/index.html');
  const r = await page.evaluate(async () => {
    const { suggestion, itemById } = await import('/js/training.js');
    const it = itemById('ia1'), h = (...a) => a.map(([kg, effort]) => ({ kg, effort }));
    return [
      suggestion(it, h([100, 'facil']), 1),
      suggestion(it, h([100, 'facil']), 0),
      suggestion(it, h([100, 'medio'], [95, 'medio']), 1),
      suggestion(it, h([100, 'medio'], [100, 'medio']), 1),
      suggestion(it, h([100, 'dificil']), 1),
      suggestion(it, [], 1)
    ];
  });
  expect(r).toEqual([
    'Foi fácil com 100 kg: suba o menor incremento.',
    'Fácil é o esperado nas semanas 1–2: mantenha 100 kg.',
    'Médio é o ponto certo: mantenha 100 kg.',
    'Dois treinos em Médio com 100 kg: suba o menor incremento.',
    'Foi difícil: mantenha 100 kg até ficar Médio.',
    ''
  ]);
});

test('a ficha não tem mais o campo group e mantém os ids', async ({ page }) => {
  await page.goto('/index.html');
  const r = await page.evaluate(async () => {
    const { PLAN } = await import('/js/plan.js');
    return { groups: PLAN.flatMap(p => p.items).filter(i => 'group' in i).length, ids: PLAN.flatMap(p => p.items.map(i => i.id)).join(',') };
  });
  expect(r.groups).toBe(0);
  expect(r.ids).toBe('ia1,ia2,ia3,ia4,ia5,ia6,sa1,sa2,sa3,sa4,sa5,sa6,sa7,ib1,ib2,ib3,ib4,ib5,ib6,sb1,sb2,sb3,sb4,sb5,sb6,sb7');
});

test('sem ficha fixa: abre no sugerido pela sequência e troca pelo seletor', async ({ page }) => {
  const errors = watchErrors(page);
  await page.clock.install({ time: new Date('2026-10-29T18:00:00') }); // quinta
  await start(page);
  // nada feito ainda: o primeiro da ordem
  await page.goto('/index.html#treino');
  await expect(page.locator('.wk-name')).toHaveText('Superior A');
  await expect(page.locator('.wpick label:has(input[value="superior-a"])')).toContainText('sugerido');
  await expect(page.locator('.wpick label')).toHaveText([/Superior A/, /Inferior A/, /Inferior B/, /Superior B/]);
  await page.locator('.wpick label:has(input[value="inferior-b"])').click();
  await expect(page).toHaveURL(/#treino\/inferior-b$/);
  await expect(page.locator('.wk-name')).toHaveText('Inferior B');
  // a escolha vale enquanto estiver no app
  await page.goto('/index.html#hoje');
  await page.goto('/index.html#treino');
  await expect(page.locator('.wk-name')).toHaveText('Inferior B');
  await page.getByRole('link', { name: 'Cardio', exact: true }).click();
  await expect(page).toHaveURL(/#treino\/cardio$/);
  expect(errors).toEqual([]);
});

test('o sugerido é o seguinte ao último feito, inclusive entre semanas, e a ordem muda em Mais', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-26T20:30:00') }); // segunda
  await start(page);
  await db(page, async db => {
    // sexta da semana anterior: Inferior B
    const sid = await db.add('sessions', { date: '2026-10-23', planId: 'inferior-b', startedAt: 1, finishedAt: 2 });
    await db.add('sets', { sessionId: sid, date: '2026-10-23', planId: 'inferior-b', exId: 'ib1', setIndex: 0, kg: 50, reps: null, effort: 'medio', ts: 1 });
  });
  await page.goto('/index.html#treino');
  await expect(page.locator('.wk-name')).toHaveText('Superior B');
  await page.goto('/index.html#hoje');
  await expect(page.locator('#hojeTreinos')).toContainText('Superior B');

  // trocar a ordem: Superior B sobe para antes de Inferior B
  await page.goto('/index.html#mais');
  await page.getByRole('button', { name: 'Subir Superior B' }).click();
  await expect(page.locator('.order li')).toHaveText([/Superior A/, /Inferior A/, /Superior B/, /Inferior B/]);
  await page.goto('/index.html#treino');
  // depois do Inferior B (agora o último) volta ao começo
  await expect(page.locator('.wk-name')).toHaveText('Superior A');
});
