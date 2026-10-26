import { test, expect } from '@playwright/test';

// Depois do primeiro carregamento, o app abre e navega sem rede.
test.use({ serviceWorkers: 'allow' });

test('abre offline depois do primeiro carregamento', async ({ page, context }) => {
  await page.goto('/index.html#hoje');
  await page.waitForSelector('main > *');
  // espera o service worker instalar e guardar todos os arquivos
  // quando o service worker assume, o app recarrega sozinho; por isso a checagem é repetida
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller).catch(() => false), { timeout: 30000 }).toBe(true);
  await page.waitForSelector('main > *');

  await context.setOffline(true);
  for (const r of ['hoje', 'treino', 'treino/inferior-b', 'progresso', 'corpo', 'mais', 'guia']) {
    await page.goto('/index.html#' + r);
    await page.reload();
    await page.waitForSelector('main > *');
    await expect(page.locator('main')).not.toContainText('Algo deu errado');
  }
  // foto do exercício e gráfico também vêm do cache
  await page.goto('/index.html#treino/inferior-b');
  await page.reload();
  const img = page.locator('.ex.open .media img').first();
  await expect(img).toBeVisible();
  expect(await img.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  expect(await page.evaluate(() => typeof window.Chart)).toBe('function');
});
