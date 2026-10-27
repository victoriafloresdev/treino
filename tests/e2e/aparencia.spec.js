import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

// Mais › Aparência: modo claro/escuro e paleta, guardados neste aparelho.
test('tema e paleta mudam na hora e ficam salvos', async ({ page }) => {
  const errors = watchErrors(page);
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/index.html#mais/aparencia');
  await page.waitForSelector('.pal-grid');
  const bg = () => page.evaluate(async () => (await import('/js/ui.js')).cssVar('--bg'));
  const meta = () => page.evaluate(() => document.querySelector('meta[name="theme-color"]').content);
  const claro = await bg();

  await page.locator('label:has(input[name="themeMode"][value="dark"])').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  const escuro = await bg();
  expect(escuro).not.toBe(claro);
  expect(await meta()).toBe(escuro);

  await page.locator('label:has(input[name="palette"][value="oceano"])').click();
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'oceano');

  // fica salvo e já abre assim
  await page.reload();
  await page.waitForSelector('.pal-grid');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'oceano');
  await expect(page.locator('input[name="themeMode"][value="dark"]')).toBeChecked();
  await expect(page.locator('input[name="palette"][value="oceano"]')).toBeChecked();

  // a cor do dia muda com a paleta
  await page.evaluate(() => { document.documentElement.dataset.day = 'A'; });
  const oceanoA = await page.evaluate(async () => (await import('/js/ui.js')).cssVar('--accent'));
  await page.locator('label:has(input[name="palette"][value="comida"])').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-palette', /./);
  await page.evaluate(() => { document.documentElement.dataset.day = 'A'; });
  expect(await page.evaluate(async () => (await import('/js/ui.js')).cssVar('--accent'))).not.toBe(oceanoA);

  // automático volta a seguir o sistema
  await page.locator('label:has(input[name="themeMode"][value="auto"])').click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /./);
  expect(await bg()).toBe(claro);
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await bg()).toBe(escuro);
  expect(errors).toEqual([]);
});
