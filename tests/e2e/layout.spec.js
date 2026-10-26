import { test, expect } from '@playwright/test';
import { SIZES, SCHEMES, watchErrors, seed, findOverflow } from './helpers.js';

// Telas e estados que precisam caber na largura do celular.
const SCREENS = [
  { name: 'hoje', hash: 'hoje' },
  { name: 'treino', hash: 'treino' },
  { name: 'sessao', hash: 'treino/inferior-a', open: true },
  { name: 'sessao-timer', hash: 'treino/inferior-a', open: true, timer: true },
  { name: 'progresso', hash: 'progresso' },
  { name: 'corpo', hash: 'corpo' },
  { name: 'mais', hash: 'mais' },
  { name: 'guia', hash: 'guia' },
  { name: 'cardio-form', hash: 'hoje', sheet: '[data-act="cardioForm"]' },
  { name: 'como-fazer', hash: 'treino/inferior-a', sheet: '[data-how]' }
];

for (const size of SIZES) for (const scheme of SCHEMES) {
  test.describe(`${size.name} ${scheme}`, () => {
    test.use({ viewport: { width: size.width, height: size.height }, colorScheme: scheme });
    test('nenhuma caixa sai da margem', async ({ page, browserName }) => {
      const errors = watchErrors(page);
      await seed(page);
      const problems = {};
      for (const sc of SCREENS) {
        await page.goto('/index.html#' + sc.hash);
        await page.reload();
        await page.waitForSelector('main > *');
        if (sc.open) await page.locator('.ex').first().evaluate(el => el.classList.add('open'));
        if (sc.timer) await page.evaluate(() => document.getElementById('timer').classList.add('on'));
        if (sc.sheet) { await page.locator(sc.sheet).first().click(); await page.waitForSelector('#sheet.on'); }
        await page.waitForTimeout(150);
        const bad = await findOverflow(page);
        if (bad.length) problems[sc.name] = bad;
        await page.screenshot({ path: `output/shots/${browserName}/${sc.name}-${size.name}-${scheme}.png`, fullPage: !sc.sheet });
      }
      expect(problems).toEqual({});
      expect(errors).toEqual([]);
    });
  });
}
