import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

// Quarta, 28/10/2026, 10h. Ontem = terça 27/10 (dia A pela ficha).
const QUA = new Date('2026-10-28T10:00:00');

async function open(page, hash) {
  await page.clock.install({ time: QUA });
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/index.html#hoje');
  await page.getByRole('button', { name: 'Salvar data de início' }).click();
  await page.goto('/index.html#' + hash);
  await page.waitForSelector('main > *');
}
// o WebKit do Playwright só dispara "input" no campo de data; o Safari de verdade dispara "change" ao confirmar
async function pickDay(page, d) {
  const i = page.locator('.datenav-pick input');
  await i.fill(d);
  await i.dispatchEvent('change');
}
const db = (page, fn, arg) => page.evaluate(async ([src, arg]) => { const { db } = await import('/js/db.js'); return new Function('db', 'arg', `return (${src})(db, arg)`)(db, arg); }, [fn.toString(), arg]);

test('Hoje: voltar um dia e registrar refeição, água e peso daquele dia', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, 'hoje');
  await expect(page.getByRole('button', { name: 'Próximo dia' })).toBeDisabled();
  await expect(page.locator('.datenav-pick input')).toHaveAttribute('max', '2026-10-28');

  await page.getByRole('button', { name: 'Dia anterior' }).click();
  await expect(page.locator('.datenav-pick b')).toHaveText('Ontem');
  await expect(page.locator('.past-note')).toContainText('Registrando um dia que passou');
  await expect(page.locator('.hoje-top')).toHaveCount(0);
  await expect(page.locator('.daytag')).toContainText('Cardio + musculação');

  // a primeira refeição sem marcar daquele dia
  await expect(page.locator('#hojeNext')).toContainText('Falta marcar');
  await expect(page.locator('#hojeNext')).toContainText('Café da manhã');
  await page.locator('#hojeNext').getByRole('button', { name: 'Marcar como feito' }).click();
  await expect(page.locator('#hojeNext')).toContainText('Almoço');
  await page.getByRole('button', { name: /Adicionar um copo de água/ }).click();

  await page.getByRole('button', { name: 'Registrar peso' }).click();
  await expect(page.locator('#wDate')).toHaveValue('2026-10-27');
  await page.locator('#wQuick').fill('80,4');
  await page.getByRole('button', { name: 'Salvar peso' }).click();

  const r = await db(page, async db => ({
    meal: await db.get('meals', 'meal:2026-10-27:cafe'), hoje: await db.get('meals', 'meal:2026-10-28:cafe'),
    water: await db.get('water', 'water:2026-10-27'), body: (await db.all('body')).map(b => [b.date, b.weight])
  }));
  expect(r.meal.done).toBe(true);
  expect(r.hoje).toBeUndefined();
  expect(r.water.cups).toBe(1);
  expect(r.body).toEqual([['2026-10-27', 80.4]]);

  // continua no dia escolhido ao trocar de aba, e volta para hoje
  await page.goto('/index.html#comida/dia');
  await expect(page.locator('.datenav-pick b')).toHaveText('Ontem');
  await expect(page.locator('#meal-cafe .meal-check')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Voltar para hoje' }).click();
  await expect(page.locator('.datenav-pick b')).toHaveText('Hoje');
  await expect(page.locator('#meal-cafe .meal-check')).toHaveAttribute('aria-pressed', 'false');
  expect(errors).toEqual([]);
});

test('Comida › Dia num dia escolhido no calendário; não muda o padrão dos próximos dias', async ({ page }) => {
  await open(page, 'comida/dia');
  await page.waitForSelector('#meal-cafe');
  await pickDay(page, '2026-10-20');
  await expect(page.locator('.datenav-pick b')).toHaveText('Terça, 20 de outubro');
  await page.locator('#meal-cafe .meal-head').click().catch(() => {});
  if (await page.locator('#meal-cafe .meal-head').getAttribute('aria-expanded') !== 'true') await page.locator('#meal-cafe .meal-head').click();
  await page.locator('#meal-cafe [data-act="mealPick"]').click();
  await page.locator('#sheet label:has(input[value="paosal"])').click();
  await expect(page.locator('#meal-cafe .meal-k b')).toHaveText('414');
  await page.locator('#meal-almoco .meal-check').click();
  await expect(page.locator('#meal-almoco .meal-check')).toHaveAttribute('aria-pressed', 'true');

  // hoje continua com o padrão (Ovos e pão, 405)
  await page.getByRole('button', { name: 'Voltar para hoje' }).click();
  await expect(page.locator('#meal-cafe .meal-k b')).toHaveText('405');
  const r = await db(page, async db => ({ m: await db.get('meals', 'meal:2026-10-20:cafe'), def: await db.setting('nutriDefaults') }));
  expect(r.m.optionId).toBe('paosal');
  expect(r.def?.sel?.cafe).toBeUndefined();
});

test('Treino: registrar o exercício num dia que passou', async ({ page }) => {
  await open(page, 'treino/inferior-a');
  await page.getByRole('button', { name: 'Dia anterior' }).click();
  await expect(page.locator('.past-note')).toBeVisible();
  const ex = page.locator('#ex-ia1');
  if (await ex.locator('.ex-top').getAttribute('aria-expanded') !== 'true') await ex.locator('.ex-top').click();
  await ex.locator('input[name="v"]').fill('100');
  await ex.locator('label.e-medio').click();
  await ex.getByRole('button', { name: /Salvar/ }).click();
  await expect(ex).toHaveClass(/done/);
  const r = await db(page, async db => ({ s: (await db.all('sessions')).map(x => x.date), sets: (await db.all('sets')).map(x => x.date) }));
  expect(r).toEqual({ s: ['2026-10-27'], sets: ['2026-10-27', '2026-10-27'] });
  // e o dia passa a contar como dia de musculação registrada
  await page.goto('/index.html#hoje');
  await expect(page.locator('#hojeTreinos')).toContainText('Treino registrado');
});

test('cardio de um dia que passou, e semanas anteriores em Comida › Semana', async ({ page }) => {
  await open(page, 'hoje');
  await page.waitForSelector('#hojeNext h2');
  await pickDay(page, '2026-10-24'); // sábado, dia de corrida
  await page.locator('#hojeTreinos').getByRole('button', { name: 'Registrar' }).click();
  await expect(page.locator('#kDate')).toHaveValue('2026-10-24');
  await expect(page.locator('#sheet')).toContainText('Completou a');
  await page.locator('#kMin').fill('28');
  await page.getByRole('button', { name: 'Salvar cardio' }).click();
  const c = await db(page, async db => (await db.all('cardio'))[0]);
  expect(c).toMatchObject({ date: '2026-10-24', minutes: 28, completed: 'sim' });
  expect(Number.isInteger(c.stage)).toBe(true);

  await page.goto('/index.html#comida/semana');
  await expect(page.locator('.datenav-pick b')).toHaveText('Esta semana');
  await page.getByRole('button', { name: 'Semana anterior' }).click();
  await expect(page.locator('.datenav-pick b')).toHaveText('19/10 a 25/10');
  const sab = page.locator('.wk-line').nth(5);
  await expect(sab).toContainText('Só cardio'); // corrida já era prevista no sábado
  await sab.click();
  await page.locator('#sheet label:has(input[value="D"])').click();
  await expect(page.locator('.wk-line').nth(5)).toContainText('escolhido por você');
  await page.getByRole('button', { name: 'Voltar para esta semana' }).click();
  await expect(page.locator('.datenav-pick b')).toHaveText('Esta semana');
});
