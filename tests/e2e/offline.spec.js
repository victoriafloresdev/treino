import { test, expect } from '@playwright/test';

// Depois do primeiro carregamento, o app abre e navega sem rede.
test.use({ serviceWorkers: 'allow' });

// O app recarrega sozinho quando o service worker assume; uma navegação pode ser interrompida por isso.
async function go(page, url, reload = false) {
  for (let i = 0; i < 4; i++) {
    try { await page.goto(url); if (reload) await page.reload(); await page.waitForSelector('main > *'); return; }
    catch (e) { if (!/interrupted|destroyed/.test(e.message)) throw e; }
  }
  throw new Error('navegação interrompida repetidamente: ' + url);
}

test('abre offline depois do primeiro carregamento', async ({ page, context }) => {
  await page.goto('/index.html#hoje');
  await page.waitForSelector('main > *');
  // espera o service worker instalar e guardar todos os arquivos
  // quando o service worker assume, o app recarrega sozinho; por isso a checagem é repetida
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller).catch(() => false), { timeout: 30000 }).toBe(true);
  await page.waitForSelector('main > *');

  await context.setOffline(true);
  for (const r of ['hoje', 'treino', 'treino/inferior-b', 'cardio', 'comida/semana', 'comida/dicas', 'progresso', 'progresso/corpo', 'mais', 'guia']) {
    await go(page, '/index.html#' + r, true);
    await expect(page.locator('main')).not.toContainText('Algo deu errado');
  }
  // foto do exercício e gráfico também vêm do cache
  await go(page, '/index.html#treino/inferior-b', true);
  const img = page.locator('.ex.open .media img').first();
  await expect(img).toBeVisible();
  expect(await img.evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
  expect(await page.evaluate(() => typeof window.Chart)).toBe('function');
});
