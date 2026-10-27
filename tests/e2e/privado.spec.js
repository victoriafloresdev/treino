import { test, expect } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';

// Usa o arquivo privado só se ele existir neste computador; o conteúdo não fica no teste.
const FILE = new URL('../../privado/dados-iniciais-PRIVADO.json', import.meta.url);

const PERFIL = new URL('../../privado/perfil-saude.json', import.meta.url);

test('perfil de saúde privado importa e todas as chaves de texto existem no app', async ({ page }) => {
  test.skip(!existsSync(PERFIL), 'perfil privado ausente');
  await page.goto('/index.html#mais');
  await page.waitForSelector('main > *');
  await page.locator('#profileFile').setInputFiles(PERFIL.pathname.replace(/^\/(\w:)/, '$1'));
  await expect(page.locator('main')).toContainText('Perfil importado');
  // cada texto do perfil precisa ter um lugar no app; chave órfã seria texto perdido
  const orphan = await page.evaluate(async () => {
    const { getProfile } = await import('/js/days.js');
    const N = await import('/js/data/nutricao.js');
    const p = await getProfile();
    const src = JSON.stringify(N.DICAS) + N.RODAPE + JSON.stringify(N.OPTS) + (await (await fetch('/js/nutri.js')).text());
    return Object.keys(p.textos).filter(k => !src.includes(k)).concat(Object.keys(p.dicas).filter(k => !N.DICAS.some(d => d.perfil === k)));
  });
  expect(orphan).toEqual([]);
  await page.goto('/index.html#comida/dia');
  await expect(page.locator('#diaMeals .mark').first()).toBeVisible();
});

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
