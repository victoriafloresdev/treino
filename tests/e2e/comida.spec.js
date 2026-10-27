import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';
import { writeFileSync } from 'node:fs';

// Relógio fixo: segunda, 26/10/2026, 10h (dia A pela ficha).
const SEG = new Date('2026-10-26T10:00:00');
const DOM = new Date('2026-11-01T10:00:00');

async function open(page, hash, time = SEG) {
  await page.clock.install({ time });
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/index.html#' + hash);
  await page.waitForSelector('main > *');
}
const kcalPlanejada = page => page.locator('#pK').textContent();

test('tipo de dia: previsto, pulado pela usuária e elevado pelo registro', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, 'hoje');
  await expect(page.locator('.daytag')).toContainText('Cardio + musculação');
  await expect(page.locator('.daytag')).toContainText('previsto pela ficha');
  await expect(page.locator('html')).toHaveAttribute('data-day', 'A');
  await expect(page.locator('#hojeTreinos')).toContainText('Inferior A');

  await page.getByRole('button', { name: 'Mudar', exact: true }).click();
  await page.getByRole('button', { name: 'Hoje não vou treinar' }).click();
  await expect(page.locator('.daytag')).toContainText('Só cardio');
  await expect(page.locator('.daytag')).toContainText('escolhido por você');
  await expect(page.locator('html')).toHaveAttribute('data-day', 'B');
  await expect(page.locator('#hojeTreinos')).not.toContainText('Inferior A');
  await page.goto('/index.html#comida/dia');
  await expect(page.locator('#meal-preTreino')).toHaveCount(0);
  await page.goto('/index.html#hoje');

  // escolha manual vence e pode ser desfeita
  await page.getByRole('button', { name: 'Mudar', exact: true }).click();
  await page.locator('#sheet label:has(input[value="D"])').click();
  await expect(page.locator('.daytag')).toContainText('Descanso');
  await page.getByRole('button', { name: 'Mudar', exact: true }).click();
  await page.getByRole('button', { name: 'Voltar ao previsto pela ficha' }).click();
  await expect(page.locator('.daytag')).toContainText('Só cardio');
  expect(errors).toEqual([]);
});

test('domingo: registrar cardio eleva o dia de descanso para só cardio', async ({ page }) => {
  await open(page, 'hoje', DOM);
  await expect(page.locator('.daytag')).toContainText('Descanso');
  await expect(page.locator('#hojeHabits')).toContainText('Dia de descanso');
  await page.evaluate(async () => { const { db } = await import('/js/db.js'); await db.add('cardio', { date: '2026-11-01', type: 'caminhada', minutes: 20, effort: 'leve', note: '' }); });
  await page.reload();
  await expect(page.locator('.daytag')).toContainText('Só cardio');
  await expect(page.locator('.daytag')).toContainText('ajustado pelo registro');
});

test('refeições: escolher, montar o prato, marcar como feito, água e psyllium', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, 'comida/dia');
  const k0 = await kcalPlanejada(page);

  // às 10h, a próxima refeição (café) já vem aberta; trocar Ovos e pão (405) por Pão de sal (414) pela sheet
  await expect(page.locator('#meal-cafe .meal-head')).toHaveAttribute('aria-expanded', 'true');
  await page.locator('#meal-cafe [data-act="mealPick"]').click();
  await page.locator('#sheet label:has(input[value="paosal"])').click();
  await expect(page.locator('#sheet')).not.toHaveClass(/on/);
  await expect(page.locator('#meal-cafe .meal-k b')).toHaveText('414');
  expect(await kcalPlanejada(page)).not.toBe(k0);

  // almoço: tilápia + batata
  await page.locator('#meal-almoco .meal-head').click();
  await page.locator('#meal-almoco label:has(input[name="almoco-prot"][value="tilapia"])').click();
  await page.locator('#meal-almoco label:has(input[name="almoco-carb"][value="batata"])').click();
  await expect(page.locator('#meal-almoco .items')).toContainText('150 g (2,5 filés médios)');
  await expect(page.locator('#meal-almoco .items')).toContainText('240 g (≈ 2 batatas médias)');

  // na Hoje, a próxima refeição é o café; marcar mostra a seguinte
  await page.goto('/index.html#hoje');
  await expect(page.locator('#hojeNext')).toContainText('Café da manhã');
  await expect(page.locator('#hojeNext')).toContainText('Pão de sal');
  await page.locator('#hojeNext').getByRole('button', { name: 'Marcar como feito' }).click();
  await expect(page.locator('#hojeNext')).toContainText('Almoço');
  await expect(page.locator('#hojeNext')).toContainText('Tilápia + Batata');
  await expect(page.locator('#hojeRings .ring').first()).toContainText('414');

  // anel de água: tocar soma um copo
  await page.getByRole('button', { name: /Adicionar um copo de água/ }).click();
  await page.getByRole('button', { name: /Adicionar um copo de água/ }).click();
  await expect(page.locator('#hojeRings')).toContainText('2/14');
  await page.getByRole('button', { name: 'Tirar um copo de água' }).click();
  await expect(page.locator('#hojeRings')).toContainText('1/14');

  // "Ver no plano" abre Comida › Dia na refeição
  await page.locator('#hojeNext').getByRole('button', { name: 'Ver no plano' }).click();
  await expect(page.locator('#meal-almoco .meal-head')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.facts')).toContainText('414');
  await expect(page.locator('#diaSummary')).toContainText('1 de 14 copos');

  // o check marca sem abrir o card
  await page.locator('#meal-lanche .meal-check').click();
  await expect(page.locator('#meal-lanche .meal-check')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#meal-lanche .meal-head')).toHaveAttribute('aria-expanded', 'false');

  // psyllium soma 15 kcal ao planejado
  const before = Number((await kcalPlanejada(page)).replace('.', ''));
  await page.getByRole('switch', { name: 'Incluir psyllium' }).click();
  await expect(page.locator('#pK')).toHaveText((before + 15).toLocaleString('pt-BR'));

  // docinho pode sair do dia
  await page.locator('#meal-doce .meal-head').click();
  await page.getByRole('switch', { name: 'Incluir docinho' }).click();
  await expect(page.locator('#meal-doce .meal-k b')).toHaveText('0');

  // tudo persiste e a escolha vira padrão do dia seguinte
  await page.reload();
  await expect(page.locator('#meal-cafe .meal-k b')).toHaveText('414');
  await expect(page.locator('#meal-cafe .meal-check')).toHaveAttribute('aria-pressed', 'true');
  await page.clock.setFixedTime(new Date('2026-10-27T10:00:00'));
  await page.reload();
  await expect(page.locator('#meal-cafe .meal-k b')).toHaveText('414');
  await expect(page.locator('#meal-cafe .meal-check')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#diaSummary')).toContainText('0 de 14 copos');
  expect(errors).toEqual([]);
});

test('Comida: semana, trocas, refeição livre e dicas', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, 'comida/semana');
  const qua = page.locator('.wk-row').nth(2);
  await expect(qua).toContainText('previsto pela ficha');
  await qua.locator('label:has(input[value="D"])').click();
  await expect(page.locator('.wk-row').nth(2)).toContainText('escolhido por você');
  await page.locator('.wk-row').nth(2).getByRole('button', { name: 'voltar ao previsto' }).click();
  await expect(page.locator('.wk-row').nth(2)).toContainText('previsto pela ficha');
  await expect(page.locator('.callout')).toContainText('Boa distribuição');

  await page.getByRole('link', { name: 'Trocas' }).click();
  await page.locator('#cK').fill('150');
  await page.locator('#cP').fill('25');
  await expect(page.locator('#calcOut')).toContainText('150 g');
  await expect(page.locator('#calcOut')).toContainText('Fica praticamente igual a 120 g de frango');
  await page.locator('label:has(input[name="cat"][value="fruta"])').click();
  await expect(page.locator('.rows.trocas')).toContainText('Mamão');

  await page.getByRole('link', { name: 'Livre', exact: true }).click();
  await page.locator('label:has(input[name="lvPreset"][value="1"])').click();
  await expect(page.locator('main')).toContainText('+719');
  await page.locator('label:has(input[name="lvStrat"][value="diluir"])').click();
  await expect(page.locator('main')).toContainText('−240 kcal/dia');
  await expect(page.locator('main')).toContainText('Nada de jejum');

  await page.getByRole('link', { name: 'Dicas' }).click();
  await expect(page.locator('details.tip')).toHaveCount(10);
  await page.locator('#dica-medico > summary').click();
  await expect(page.locator('#dica-medico')).toContainText('Pare o treino e procure avaliação');
  expect(errors).toEqual([]);
});

test('perfil de saúde: importar mostra os textos pessoais; remover volta ao genérico', async ({ page }, info) => {
  await open(page, 'mais');
  const file = info.outputPath('perfil.json');
  writeFileSync(file, JSON.stringify({ tipo: 'perfil-saude', versao: 1, nome: 'Fulana',
    remedio: { rotulo: 'Lembrete de teste', sub: 'Texto do lembrete.', hora: '06h00', h: 6 },
    textos: { 'dica.medico.pontos': '<ul><li>Ponto pessoal de teste</li></ul>' },
    dicas: { remedio: { e: '💊', title: 'Dica pessoal de teste', small: 'só com perfil', html: '<p>Conteúdo.</p>' } } }));
  await page.locator('#profileFile').setInputFiles(file);
  await expect(page.locator('main')).toContainText('Perfil importado');
  await page.goto('/index.html#hoje');
  await expect(page.locator('#hojeGreet')).toContainText('Fulana');
  await page.goto('/index.html#comida/dia');
  await expect(page.locator('#diaMeals')).toContainText('Lembrete de teste');
  await page.goto('/index.html#comida/dicas');
  await expect(page.locator('details.tip')).toHaveCount(11);
  await expect(page.locator('#dica-medico')).toContainText('Ponto pessoal de teste');

  await page.goto('/index.html#mais');
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Remover perfil' }).click();
  await expect(page.locator('main')).toContainText('Nenhum perfil importado');
  await page.goto('/index.html#comida/dia');
  await expect(page.locator('#diaMeals')).not.toContainText('Lembrete de teste');

  // arquivo errado é recusado
  const bad = info.outputPath('backup.json');
  writeFileSync(bad, JSON.stringify({ app: 'treino-app', version: 2 }));
  await page.goto('/index.html#mais');
  await page.locator('#profileFile').setInputFiles(bad);
  await expect(page.locator('#toast')).toContainText('não é um perfil de saúde');
});

test('semana modelo editável em Mais', async ({ page }) => {
  await open(page, 'mais');
  await page.locator('fieldset[data-i="5"] label:has(input[value="D"])').click();
  await expect(page.getByRole('button', { name: 'Voltar ao modelo da ficha' })).toBeVisible();
  await page.goto('/index.html#comida/semana');
  await expect(page.locator('.wk-row').nth(5).locator('input[value="D"]')).toBeChecked();
  await page.goto('/index.html#mais');
  await page.getByRole('button', { name: 'Voltar ao modelo da ficha' }).click();
  await page.goto('/index.html#comida/semana');
  await expect(page.locator('.wk-row').nth(5).locator('input[value="B"]')).toBeChecked();
});

test('trocar de tela rápido: a última tela aberta é a que fica', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, 'hoje');
  for (const r of ['comida/semana', 'progresso', 'comida/livre', 'hoje', 'progresso/corpo', 'comida/semana', 'mais'])
    await page.evaluate(h => { location.hash = h; }, r);
  await expect(page.locator('#title')).toHaveText('Mais');
  await page.waitForTimeout(800);
  await expect(page.locator('main')).toContainText('Semana modelo');
  await expect(page.locator('main')).not.toContainText('Algo deu errado');
  expect(errors).toEqual([]);
});

test('aviso na tela Hoje para importar o perfil, uma vez só, e o perfil vai no backup', async ({ page }, info) => {
  const errors = watchErrors(page);
  await open(page, 'hoje');
  await expect(page.locator('.notice:has-text("Importe seu perfil")')).toBeVisible();
  const file = info.outputPath('perfil.json');
  writeFileSync(file, JSON.stringify({ tipo: 'perfil-saude', versao: 1, nome: 'Fulana', remedio: { rotulo: 'Lembrete de teste', sub: '', hora: '06h00', h: 6 } }));
  await page.locator('#profileFileHoje').setInputFiles(file);
  await expect(page.locator('#hojeGreet')).toContainText('Fulana');
  await expect(page.locator('.notice:has-text("Importe seu perfil")')).toHaveCount(0);
  // vai no backup e volta ao restaurar
  const backup = await page.evaluate(async () => { const { db } = await import('/js/db.js'); return db.exportAll(); });
  expect(backup.profile.map(p => p.nome)).toEqual(['Fulana']);
  await page.evaluate(async b => { const { db, STORES } = await import('/js/db.js'); for (const s of STORES) await db.clear(s); await db.importAll(b, 'replace'); }, backup);
  await page.reload();
  await expect(page.locator('#hojeGreet')).toContainText('Fulana');
  expect(errors).toEqual([]);
});

test('"Agora não" esconde o aviso do perfil', async ({ page }) => {
  await open(page, 'hoje');
  await page.getByRole('button', { name: 'Agora não' }).click();
  await expect(page.locator('.notice:has-text("Importe seu perfil")')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.notice:has-text("Importe seu perfil")')).toHaveCount(0);
  await page.goto('/index.html#mais');
  await expect(page.locator('main')).toContainText('Nenhum perfil importado');
});
