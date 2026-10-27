import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

// Fluxo principal de ponta a ponta, num banco vazio.
test('registrar treino, cardio, corpo, exportar e importar', async ({ page }) => {
  await page.setViewportSize({ width: 402, height: 874 });
  const errors = watchErrors(page);
  await page.goto('/index.html#hoje');

  await page.getByRole('button', { name: 'Salvar data de início' }).click();
  await expect(page.locator('#ctx')).toContainText('Semana 1');

  // leg press
  await page.goto('/index.html#treino/inferior-a');
  const form = page.locator('[data-exform="ia1"]');
  await form.locator('[name=v]').fill('102,5');
  await form.locator('label.e-medio').click();
  await form.getByRole('button', { name: /Salvar/ }).click();
  await expect(page.locator('#ex-ia1 .ex-top .c')).toHaveText('102,5 kg');

  await page.getByRole('button', { name: 'Finalizar treino' }).click();
  await expect(page.locator('#sheet')).toContainText('Treino registrado');
  await page.locator('#sheet').getByRole('link', { name: 'Voltar para Hoje' }).click();

  // cardio
  await page.goto('/index.html#treino/cardio');
  await page.getByRole('button', { name: /Registrar cardio/ }).first().click();
  await page.locator('#kMin').fill('32');
  await page.getByRole('button', { name: 'Salvar cardio' }).click();
  await page.goto('/index.html#hoje');
  await expect(page.locator('#hojeTreinos')).toContainText('32 min de caminhada');

  // peso rápido
  await page.getByRole('button', { name: 'Registrar peso' }).click();
  await page.locator('#wQuick').fill('81,6');
  await page.getByRole('button', { name: 'Salvar peso' }).click();
  await expect(page.locator('main')).toContainText('Hoje: 81,6 kg');

  // corpo
  await page.goto('/index.html#progresso/corpo');
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
