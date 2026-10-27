import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

// Quarta, 28/10/2026, 7h30: dia de corrida. Programa começou em 30/09 → semana 5 (etapa 3 liberada).
const QUA = new Date('2026-10-28T07:30:00');
const MIN = 60 * 1000;

async function open(page, hash, { time = QUA, start = '2026-09-30', seed } = {}) {
  await page.clock.install({ time });
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/index.html#mais');
  await page.waitForSelector('main > *');
  await page.evaluate(async ({ start, seed }) => {
    const { db } = await import('/js/db.js');
    await db.setSetting('startDate', start);
    for (const r of seed || []) await db.add('cardio', r);
  }, { start, seed });
  await page.goto('/index.html#' + hash);
  await page.waitForSelector('main > *');
}
const run = (date, stage, completed, painNextDay) => ({ date, type: 'intervalado', minutes: 30, effort: 'moderado', note: '', stage, completed, painNextDay });

test('timer de intervalos: blocos, pausa, fim e registro', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, 'cardio');
  // daqui em diante o tempo só anda quando o teste manda
  await page.clock.pauseAt(new Date(QUA.getTime() + MIN));
  await expect(page.locator('main h2').first()).toHaveText('Corrida · Etapa 3 de 4');
  await expect(page.locator('#cTimer .tm-big')).toHaveText('30:00');
  await page.getByRole('button', { name: 'Começar' }).click();
  await expect(page.locator('.tm-seg')).toHaveText('Aquecimento caminhando');
  await expect(page.locator('.tm-big')).toHaveText('5:00');

  await page.clock.fastForward(5 * MIN + 1000);
  await expect(page.locator('.tm-seg')).toHaveText('Trote leve');
  await expect(page.locator('.tm-next')).toContainText('Caminhada');
  await expect(page.locator('.tm-sub')).toContainText('bloco 2 de 14');

  // pausar congela o tempo
  await page.getByRole('button', { name: 'Pausar' }).click();
  const paused = await page.locator('.tm-big').textContent();
  await page.clock.fastForward(2 * MIN);
  await expect(page.locator('.tm-big')).toHaveText(paused);
  await page.getByRole('button', { name: 'Continuar' }).click();

  // sair e voltar não perde o tempo
  await page.goto('/index.html#hoje');
  await page.clock.fastForward(1 * MIN);
  await page.goto('/index.html#cardio');
  await expect(page.locator('.tm-sub')).toContainText('bloco 2 de 14');

  await page.clock.fastForward(25 * MIN);
  await expect(page.locator('.tm-seg')).toHaveText('Cardio concluído');
  await page.locator('#cTimer').getByRole('button', { name: 'Registrar cardio' }).click();
  await expect(page.locator('#kMin')).toHaveValue('30');
  await expect(page.locator('#sheet input[name="kType"][value="intervalado"]')).toBeChecked();
  await expect(page.locator('#sheet input[name="kDone"][value="sim"]')).toBeChecked();
  await page.locator('#sheet summary').click();
  await page.locator('#kDist').fill('3,4');
  await page.getByRole('button', { name: 'Salvar cardio' }).click();
  await expect(page.locator('main')).toContainText('Etapa 3 (completa)');
  await expect(page.locator('main')).toContainText('3,4 km');
  const rec = await page.evaluate(async () => { const { db } = await import('/js/db.js'); return (await db.all('cardio'))[0]; });
  expect(rec).toMatchObject({ stage: 2, completed: 'sim', minutes: 30, distanceKm: 3.4, type: 'intervalado' });
  expect(errors).toEqual([]);
});

test('no dia seguinte, pergunta sobre dor na tela Hoje', async ({ page }) => {
  await open(page, 'hoje', { time: new Date('2026-10-29T08:00:00'), seed: [run('2026-10-28', 2, 'sim', null)] });
  await expect(page.locator('.pain-ask')).toContainText('Alguma dor da corrida de ontem?');
  await page.locator('.pain-ask label:has(input[value="nenhuma"])').click();
  await expect(page.locator('.pain-ask')).toHaveCount(0);
  const rec = await page.evaluate(async () => { const { db } = await import('/js/db.js'); return (await db.all('cardio'))[0]; });
  expect(rec.painNextDay).toBe('nenhuma');
});

test('progressão: espera a semana do programa, depois sugere avançar', async ({ page }) => {
  const seed = [run('2026-10-21', 2, 'sim', 'nenhuma'), run('2026-10-24', 2, 'sim', 'nenhuma')];
  await open(page, 'cardio', { seed });
  await expect(page.locator('.prog')).toContainText('a partir da semana 7');
  // programa começou antes: semana 7
  await page.evaluate(async () => { const { db } = await import('/js/db.js'); await db.setSetting('startDate', '2026-09-14'); await db.setSetting('runStage', 2); });
  await page.reload();
  await expect(page.locator('.prog')).toContainText('Pronta para a etapa 4');
  await page.getByRole('button', { name: 'Avançar para a etapa 4' }).click();
  await expect(page.locator('main h2').first()).toHaveText('Corrida · Etapa 4 de 4');
  await expect(page.locator('main')).toContainText('5 × (3 min trote + 1,5 min caminhada)');
});

test('com dor: oferece repetir ou voltar uma etapa', async ({ page }) => {
  const seed = [run('2026-10-21', 2, 'sim', 'nenhuma'), run('2026-10-24', 2, 'sim', 'canela')];
  await open(page, 'cardio', { seed });
  await expect(page.locator('.prog.dor')).toContainText('Dor depois da corrida de 24/10: canela');
  await expect(page.locator('.prog.dor')).toContainText('procure avaliação');
  await page.getByRole('button', { name: 'Voltar para a etapa 2' }).click();
  await expect(page.locator('main h2').first()).toHaveText('Corrida · Etapa 2 de 4');

  // na etapa anterior não há dor registrada; volta para a 3 e escolhe repetir
  await page.locator('details.adjust > summary').click();
  await page.locator('details.adjust label:has(input[value="2"])').click();
  await page.getByRole('button', { name: 'Repetir esta etapa' }).click();
  await expect(page.locator('.prog.dor')).toContainText('Você escolheu repetir esta etapa');
});

test('dia de caminhada e domingo', async ({ page }) => {
  await open(page, 'cardio', { time: new Date('2026-10-27T07:30:00') });
  await expect(page.locator('main h2').first()).toHaveText('Caminhada');
  await expect(page.locator('#cTimer .tm-big')).toHaveText('30:00');
  await page.goto('/index.html#treino/cardio');
  await expect(page.locator('main')).toContainText('Caminhada leve, 25–30 min');
  await page.clock.setFixedTime(new Date('2026-11-01T08:00:00'));
  await page.goto('/index.html#cardio');
  await page.reload();
  await expect(page.locator('main')).toContainText('Hoje é descanso completo');
});

test('sem etapa salva, continua da última corrida registrada (não pula etapa)', async ({ page }) => {
  // semana 7 liberaria a etapa 4, mas as corridas registradas são da etapa 3
  await open(page, 'cardio', { start: '2026-09-14', seed: [run('2026-10-21', 2, 'sim', 'nenhuma'), run('2026-10-24', 2, 'sim', 'nenhuma')] });
  await expect(page.locator('main h2').first()).toHaveText('Corrida · Etapa 3 de 4');
  await expect(page.locator('.prog')).toContainText('Pronta para a etapa 4');
});
