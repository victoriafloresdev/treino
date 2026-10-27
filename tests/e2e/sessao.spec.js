import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

// Sem supersets: cada exercício tem número próprio e descanso próprio.
test('panturrilha e abdominal são exercícios separados, com 60 s de descanso', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  const errors = watchErrors(page);
  await page.goto('/index.html#hoje');
  await page.getByRole('button', { name: 'Salvar data de início' }).click();
  await page.goto('/index.html#treino/inferior-a');

  await expect(page.locator('.ex .n')).toHaveText(['1', '2', '3', '4', '5', '6']);
  await expect(page.locator('main')).not.toContainText('Superset');

  await page.locator('#ex-ia5 .ex-top').click();
  await expect(page.locator('#ex-ia5 .ex-meta')).toContainText('60 s');
  const form = page.locator('[data-setform="ia5"]');
  await form.locator('[name=kg]').fill('40');
  await form.locator('[name=reps]').fill('12');
  await form.getByRole('button', { name: 'Salvar série' }).click();

  await expect(page.locator('#timer')).toHaveClass(/on/);
  await expect(page.locator('#timerLabel')).toContainText('Panturrilha em pé na máquina, série 2');
  const secs = await page.locator('#timerVal').textContent();
  expect(['1:00', '0:59']).toContain(secs);
  await expect(page.locator('#toast')).not.toContainText('Agora:');

  // terminar as 2 séries abre o próximo exercício pendente, sem pular o abdominal
  await form.locator('[name=kg]').fill('40');
  await form.locator('[name=reps]').fill('11');
  await form.getByRole('button', { name: 'Salvar série' }).click();
  await expect(page.locator('#ex-ia5')).toHaveClass(/done/);
  await expect(page.locator('#ex-ia1')).toHaveClass(/open/);
  expect(errors).toEqual([]);
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

test('Treino abre no treino do dia e troca pelo seletor', async ({ page }) => {
  const errors = watchErrors(page);
  // quinta, 29/10/2026: dia do Inferior B
  await page.clock.install({ time: new Date('2026-10-29T18:00:00') });
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/index.html#hoje');
  await page.getByRole('button', { name: 'Salvar data de início' }).click();
  await page.goto('/index.html#treino');
  await expect(page.locator('.wk-name')).toHaveText('Inferior B');
  await expect(page.locator('.wpick input[value="inferior-b"]')).toBeChecked();
  await page.locator('.wpick label:has(input[value="superior-a"])').click();
  await expect(page).toHaveURL(/#treino\/superior-a$/);
  await expect(page.locator('.wk-name')).toHaveText('Superior A');
  // a escolha vale enquanto estiver no app
  await page.goto('/index.html#hoje');
  await page.goto('/index.html#treino');
  await expect(page.locator('.wk-name')).toHaveText('Superior A');
  // sub-aba Cardio
  await page.getByRole('link', { name: 'Cardio', exact: true }).click();
  await expect(page).toHaveURL(/#treino\/cardio$/);
  await expect(page.locator('#cTimer')).toBeVisible();
  expect(errors).toEqual([]);
});

test('treino feito na semana: abre no próximo da sequência e marca o feito', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-26T20:30:00') }); // segunda
  await page.goto('/index.html#hoje');
  await page.getByRole('button', { name: 'Salvar data de início' }).click();
  await page.evaluate(async () => {
    const { db } = await import('/js/db.js');
    const sid = await db.add('sessions', { date: '2026-10-26', planId: 'inferior-a', startedAt: 1, finishedAt: 2 });
    await db.add('sets', { sessionId: sid, date: '2026-10-26', planId: 'inferior-a', exId: 'ia1', setIndex: 0, kg: 100, reps: 10, effort: 'medio', ts: 1 });
  });
  await page.goto('/index.html#treino');
  await expect(page.locator('.wk-name')).toHaveText('Superior A');
  await expect(page.locator('.wpick label:has(input[value="inferior-a"])')).toContainText('feito');
});

test('exercício mostra o desenho muscular e a carga anda de 2,5 em 2,5 kg', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/index.html#hoje');
  await page.getByRole('button', { name: 'Salvar data de início' }).click();
  await page.goto('/index.html#treino/inferior-a');
  const ex = page.locator('#ex-ia1');
  await expect(ex.locator('.ex-map svg')).toBeVisible();
  await expect(ex.locator('.ex-map')).toContainText('Principal: Quadríceps, Glúteo máximo');
  const kg = ex.locator('input[name="kg"]');
  await kg.fill('100');
  await ex.getByRole('button', { name: 'Mais 2,5 kg' }).click();
  await ex.getByRole('button', { name: 'Mais 2,5 kg' }).click();
  await expect(kg).toHaveValue('105');
  await ex.getByRole('button', { name: 'Menos 2,5 kg' }).click();
  await expect(kg).toHaveValue('102,5');
  await ex.locator('input[name="reps"]').fill('10');
  await ex.locator('label.e-medio').click();
  await ex.getByRole('button', { name: 'Salvar série' }).click();
  await expect(ex.locator('.set.saved .sv')).toHaveText('102,5 kg × 10');
  await expect(ex.locator('.set.saved .tag')).toHaveText('Médio');
});
