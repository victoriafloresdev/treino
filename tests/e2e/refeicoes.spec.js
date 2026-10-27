import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

async function open(page, time, hash = 'hoje') {
  await page.clock.install({ time });
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/index.html#hoje');
  await page.getByRole('button', { name: 'Salvar data de início' }).click();
  await expect(page.locator('#ctx')).toContainText('Semana 1');
  await page.goto('/index.html#' + hash);
  await page.waitForSelector('main > *');
}
const db = (page, fn) => page.evaluate(async src => { const { db } = await import('/js/db.js'); return new Function('db', `return (${src})(db)`)(db); }, fn.toString());

test('mesmo ao meio-dia, sem nada marcado, a próxima é o café; só avança marcando', async ({ page }) => {
  await open(page, new Date('2026-10-27T12:30:00'));
  await expect(page.locator('#hojeNext h2')).toHaveText('Café da manhã');
  await page.locator('#hojeNext').getByRole('button', { name: 'Marcar como feito' }).click();
  await expect(page.locator('#hojeNext h2')).toHaveText('Almoço');
  // em Comida › Dia, o card aberto é o da próxima
  await page.goto('/index.html#comida/dia');
  await expect(page.locator('#meal-almoco .meal-head')).toHaveAttribute('aria-expanded', 'true');
});

test('editar itens do café: desmarcar pão, muçarela e fruta conta só ovos e leite naquele dia', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, new Date('2026-10-27T08:00:00'), 'comida/dia');
  const cafe = page.locator('#meal-cafe');
  if (await cafe.locator('.meal-head').getAttribute('aria-expanded') !== 'true') await cafe.locator('.meal-head').click();
  await expect(cafe.locator('.meal-k b')).toHaveText('405');
  await cafe.getByRole('button', { name: 'Editar itens' }).click();
  await expect(page.locator('#sheet .check-row')).toHaveCount(5);
  for (const n of ['Pão de forma integral', 'Muçarela', 'Fruta']) await page.locator(`#sheet .check-row:has-text("${n}") input`).uncheck();
  await page.getByRole('button', { name: 'Salvar itens' }).click();

  await expect(cafe.locator('.items li.off')).toHaveCount(3);
  const kcal = Number(await cafe.locator('.meal-k b').textContent());
  expect(kcal).toBeGreaterThan(180); expect(kcal).toBeLessThan(250);
  await expect(cafe.locator('.items li.off').first()).toContainText('tirado hoje');
  await cafe.locator('.meal-check').click();
  await expect(page.locator('#diaQuick')).toContainText(`${kcal} de`);

  // o registro guarda os macros do que foi comido; o padrão de amanhã continua completo
  const rec = await db(page, async db => db.get('meals', 'meal:2026-10-27:cafe'));
  expect(rec.m[0]).toBe(kcal);
  expect(rec.skip).toEqual({ opt: 'salgado', idx: [1, 2, 4] });
  await page.clock.setFixedTime(new Date('2026-10-28T08:00:00'));
  await page.reload();
  await page.waitForSelector('#meal-cafe');
  await expect(page.locator('#meal-cafe .meal-k b')).toHaveText('405');

  // de volta ao dia anterior: dá para desfazer
  await page.getByRole('button', { name: 'Dia anterior' }).click();
  await expect(page.locator('.datenav-pick b')).toHaveText('Ontem');
  const c2 = page.locator('#meal-cafe');
  await expect(c2.locator('.meal-check')).toHaveAttribute('aria-pressed', 'true');
  if (await c2.locator('.meal-head').getAttribute('aria-expanded') !== 'true') await c2.locator('.meal-head').click();
  await c2.getByRole('button', { name: /Editar itens/ }).click();
  await page.getByRole('button', { name: 'Voltar ao completo' }).click();
  await expect(page.locator('#meal-cafe .meal-k b')).toHaveText('405');
  expect(errors).toEqual([]);
});

test('toque duplo não dá zoom (touch-action) e hábitos se marcam sozinhos com os registros', async ({ page }) => {
  await open(page, new Date('2026-10-27T19:00:00'));
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).touchAction)).toBe('manipulation');
  expect(await page.evaluate(() => getComputedStyle(document.querySelector('button')).touchAction)).toBe('manipulation');

  await page.locator('#hojeHabits summary').click();
  const habit = name => page.locator(`#hojeHabits li:has-text("${name}")`);
  await expect(habit('Treino feito')).not.toHaveClass(/ok/);
  await expect(habit('Pesagem')).not.toHaveClass(/ok/);
  // um exercício salvo já conta como treino feito
  await page.goto('/index.html#treino/superior-a');
  const ex = page.locator('.ex.open');
  await ex.locator('input[name="v"]').fill('30');
  await ex.locator('label.e-medio').click();
  await ex.getByRole('button', { name: /Salvar/ }).click();
  await expect(page.locator('.ex.done')).toHaveCount(1);
  await page.goto('/index.html#hoje');
  await page.getByRole('button', { name: 'Registrar peso' }).click();
  await page.locator('#wQuick').fill('80');
  await page.getByRole('button', { name: 'Salvar peso' }).click();
  await page.locator('#hojeTreinos').getByRole('button', { name: 'Registrar' }).click();
  await page.getByRole('button', { name: 'Salvar cardio' }).click();
  await page.waitForSelector('#hojeHabits summary');
  await page.locator('#hojeHabits summary').click();
  for (const h of ['Treino feito', 'Cardio feito', 'Pesagem']) await expect(habit(h)).toHaveClass(/ok/);
});
