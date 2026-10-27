import { test, expect } from '@playwright/test';
import { SIZES, SCHEMES, watchErrors, seed, findOverflow } from './helpers.js';

// Telas e estados que precisam caber na largura do celular.
const SCREENS = [
  { name: 'hoje', hash: 'hoje' },
  { name: 'hoje-peso', hash: 'hoje', run: async p => { await p.evaluate(async () => (await import('/js/ui.js')).actions.weightSheet()); await p.waitForSelector('#sheet.on'); } },
  { name: 'comida-dia', hash: 'comida/dia' },
  { name: 'comida-dia-almoco', hash: 'comida/dia', run: async p => { const h = p.locator('#meal-almoco .meal-head'); if (await h.getAttribute('aria-expanded') !== 'true') await h.click(); } },
  { name: 'comida-dia-jantar', hash: 'comida/dia', run: async p => { const h = p.locator('#meal-jantar .meal-head'); if (await h.getAttribute('aria-expanded') !== 'true') await h.click(); } },
  { name: 'comida-dia-opcoes', hash: 'comida/dia', run: async p => { const h = p.locator('#meal-cafe .meal-head'); if (await h.getAttribute('aria-expanded') !== 'true') await h.click(); await p.locator('#meal-cafe [data-act="mealPick"]').click(); await p.waitForSelector('#sheet.on'); } },
  { name: 'hoje-mudar-dia', hash: 'hoje', sheet: '[data-act="daySheet"]' },
  { name: 'treino', hash: 'treino' },
  { name: 'sessao', hash: 'treino/inferior-a', open: true },
  { name: 'sessao-timer', hash: 'treino/inferior-a', open: true, timer: true },
  { name: 'cardio', hash: 'treino/cardio' },
  { name: 'cardio-timer', hash: 'treino/cardio', run: async p => { await p.getByRole('button', { name: 'Começar' }).click().catch(() => {}); } },
  { name: 'cardio-registro', hash: 'treino/cardio', sheet: '[data-act="cardioForm"]', run: async p => { await p.locator('#sheet details.more > summary').click(); } },
  { name: 'comida-semana', hash: 'comida/semana' },
  { name: 'comida-trocas', hash: 'comida/trocas', run: async p => { await p.locator('#cK').fill('180'); await p.locator('#cP').fill('22'); } },
  { name: 'comida-livre', hash: 'comida/livre', run: async p => { await p.locator('label:has(input[name="lvStrat"][value="diluir"])').click(); } },
  { name: 'comida-dicas', hash: 'comida/dicas', run: async p => { await p.evaluate(() => document.querySelectorAll('details.tip').forEach(d => { d.open = true; })); } },
  { name: 'progresso', hash: 'progresso' },
  { name: 'corpo', hash: 'progresso/corpo' },
  { name: 'conquistas', hash: 'progresso/conquistas' },
  { name: 'fechar', hash: 'fechar' },
  { name: 'mais', hash: 'mais' },
  { name: 'guia', hash: 'guia' },
  { name: 'como-fazer', hash: 'treino/inferior-a', sheet: '[data-how]' },
  // por último, porque a paleta fica salva no aparelho
  { name: 'hoje-ontem', hash: 'hoje', run: async p => { await p.getByRole('button', { name: 'Dia anterior' }).click(); await p.waitForSelector('.past-note'); } },
  { name: 'comida-dia-ontem', hash: 'comida/dia', run: async p => { await p.getByRole('button', { name: 'Dia anterior' }).click(); await p.waitForSelector('.past-note'); } },
  { name: 'sessao-ontem', hash: 'treino/inferior-a', run: async p => { await p.getByRole('button', { name: 'Dia anterior' }).click(); await p.waitForSelector('.past-note'); } },
  { name: 'comida-semana-anterior', hash: 'comida/semana', run: async p => { await p.getByRole('button', { name: 'Semana anterior' }).click(); await p.waitForSelector('.past-note'); } },
  { name: 'hoje-floresta', hash: 'hoje', run: async p => { await p.evaluate(async () => (await import('/js/ui/aparencia.js')).setAppearance({ palette: 'floresta' })); } },
  { name: 'comida-dia-lavanda', hash: 'comida/dia', run: async p => { await p.evaluate(async () => (await import('/js/ui/aparencia.js')).setAppearance({ palette: 'lavanda' })); } }
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
        if (sc.run) await sc.run(page);
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
