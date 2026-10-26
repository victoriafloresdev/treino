import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

// Fluxo principal de ponta a ponta, num banco vazio.
test('registrar treino, cardio, corpo, exportar e importar', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  const errors = watchErrors(page);
  await page.goto('/index.html#hoje');

  await page.getByRole('button', { name: 'Salvar data de início' }).click();
  await expect(page.locator('#ctx')).toContainText('Semana 1');

  // série 1 do leg press
  await page.goto('/index.html#treino/inferior-a');
  const form = page.locator('[data-setform="ia1"]');
  await form.locator('[name=kg]').fill('100');
  await form.locator('[name=reps]').fill('10');
  await form.getByRole('button', { name: 'Médio' }).click();
  await form.getByRole('button', { name: 'Salvar série' }).click();
  await expect(page.locator('#ex-ia1 .ex-top .c')).toHaveText('1/2');
  await expect(page.locator('#timer')).toHaveClass(/on/);

  // apagar e registrar de novo
  await page.locator('#ex-ia1 [data-delset]').click();
  await expect(page.locator('#ex-ia1 .ex-top .c')).toHaveText('0/2');
  await form.locator('[name=kg]').fill('102,5');
  await form.locator('[name=reps]').fill('12');
  await form.getByRole('button', { name: 'Salvar série' }).click();
  await expect(page.locator('#ex-ia1 .set.saved .sv')).toHaveText('102,5 kg × 12');

  await page.getByRole('button', { name: 'Finalizar treino' }).click();
  await expect(page.locator('#sheet')).toContainText('Treino registrado');
  await page.locator('#sheet').getByRole('link', { name: 'Voltar para Hoje' }).click();

  // cardio
  await page.getByRole('button', { name: 'Registrar cardio' }).click();
  await page.locator('#kMin').fill('32');
  await page.getByRole('button', { name: 'Salvar cardio' }).click();
  await expect(page.locator('main')).toContainText('32 min de caminhada');

  // peso rápido
  await page.locator('#wQuick').fill('81,6');
  await page.getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.locator('main')).toContainText('Hoje: 81,6 kg');

  // corpo
  await page.goto('/index.html#corpo');
  await page.locator('#bWaist').fill('81');
  await page.getByRole('button', { name: 'Salvar medida' }).click();
  await page.locator('#cW').fill('81,6');
  await page.locator('#cFat').fill('33');
  await page.getByRole('button', { name: 'Salvar avaliação' }).click();
  await expect(page.locator('main')).toContainText('Dobras cutâneas');

  await page.goto('/index.html#progresso');
  await expect(page.locator('#cWeeks')).toBeVisible();
  await page.goto('/index.html#guia');
  await expect(page.locator('main')).toContainText('Quanto esforço');

  // exportar (cai no download quando não há folha de compartilhamento)
  await page.goto('/index.html#mais');
  await page.evaluate(() => { navigator.canShare = () => false; });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar dados' }).click()]);
  const path = await dl.path();
  const before = await page.evaluate(async () => { const { db } = await import('/js/db.js'); return (await db.exportAll()); });

  // importar substituindo tudo
  await page.locator('#importFile').setInputFiles(path);
  await page.getByRole('button', { name: 'Substituir tudo' }).click();
  await expect(page.locator('#toast')).toContainText('Dados importados');
  const after = await page.evaluate(async () => { const { db } = await import('/js/db.js'); return (await db.exportAll()); });
  for (const s of ['sessions', 'sets', 'body', 'comps', 'cardio']) expect(after[s]).toEqual(before[s]);

  expect(errors).toEqual([]);
});
