import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

// Usa o arquivo privado só se ele existir neste computador; o conteúdo não fica no teste.
const FILE = new URL('../../privado/dados-iniciais-PRIVADO.json', import.meta.url);

test('dados iniciais privados importam e não duplicam', async ({ page }) => {
  test.skip(!existsSync(FILE), 'arquivo privado ausente');
  const data = JSON.parse(readFileSync(FILE, 'utf8'));
  await page.goto('/index.html#hoje');
  await page.waitForSelector('main > *');
  const n = await page.evaluate(async data => {
    const { db } = await import('/js/db.js');
    await db.importAll(data, 'merge');
    await db.importAll(data, 'merge');
    return { body: (await db.all('body')).length, comps: (await db.all('comps')).length };
  }, data);
  expect(n).toEqual({ body: data.body.length, comps: data.comps.length });
  await page.goto('/index.html#corpo');
  await expect(page.locator('.rows li')).toHaveCount(data.comps.length);
});
