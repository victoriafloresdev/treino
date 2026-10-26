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
