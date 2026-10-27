import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

async function open(page, time, seed) {
  await page.clock.install({ time });
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/index.html#hoje');
  await page.getByRole('button', { name: 'Salvar data de início' }).click();
  if (seed) await page.evaluate(seed);
  await page.goto('/index.html#mais');
  await page.goto('/index.html#hoje');
  await page.waitForSelector('#hojeNext h2');
}
const withData = async () => { const { db } = await import('/js/db.js'); await db.add('body', { date: '2026-10-20', weight: 80, waist: null, note: '' }); };
const backupAlert = page => page.locator('.alert:has-text("Backup da semana")');

test('backup: aviso a partir do domingo, fica até exportar e volta só no domingo seguinte', async ({ page }) => {
  // sábado, com backup feito no domingo anterior: sem aviso
  await open(page, new Date('2026-10-31T10:00:00'), async () => {
    const { db } = await import('/js/db.js');
    await db.add('body', { date: '2026-10-20', weight: 80, waist: null, note: '' });
    await db.setSetting('lastBackup', '2026-10-25'); // domingo anterior
  });
  await expect(backupAlert(page)).toHaveCount(0);

  // domingo: aparece
  await page.clock.setFixedTime(new Date('2026-11-01T10:00:00'));
  await page.reload(); await page.waitForSelector('#hojeNext h2');
  await expect(backupAlert(page)).toBeVisible();
  // segunda, sem ter feito: continua
  await page.clock.setFixedTime(new Date('2026-11-02T10:00:00'));
  await page.reload(); await page.waitForSelector('#hojeNext h2');
  await expect(backupAlert(page)).toBeVisible();
  // exportou: some até o próximo domingo
  await page.evaluate(async () => { const { db } = await import('/js/db.js'); await db.setSetting('lastBackup', '2026-11-02'); });
  await page.reload(); await page.waitForSelector('#hojeNext h2');
  await expect(backupAlert(page)).toHaveCount(0);
  await page.clock.setFixedTime(new Date('2026-11-07T10:00:00'));
  await page.reload(); await page.waitForSelector('#hojeNext h2');
  await expect(backupAlert(page)).toHaveCount(0);
  await page.clock.setFixedTime(new Date('2026-11-08T10:00:00'));
  await page.reload(); await page.waitForSelector('#hojeNext h2');
  await expect(backupAlert(page)).toBeVisible();
});

test('Hoje enxuta: sem frase motivacional, hábitos recolhidos e treino livre em dia sem musculação', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, new Date('2026-10-30T10:00:00'), withData); // sexta: só cardio no modelo
  await expect(page.locator('.hoje-top, #hojeMsg, #hojeGreet')).toHaveCount(0);
  await expect(page.locator('#hojeHabits summary')).toContainText('Hábitos do dia');
  await expect(page.locator('#hojeHabits .habits')).toBeHidden();
  await page.locator('#hojeHabits summary').click();
  await expect(page.locator('#hojeHabits .habits')).toBeVisible();
  // marcar água mantém os hábitos abertos
  await page.getByRole('button', { name: /Adicionar um copo de água/ }).click();
  await expect(page.locator('#hojeHabits .habits')).toBeVisible();

  await expect(page.locator('#hojeTreinos')).toContainText('Musculação não prevista');
  await expect(page.locator('#hojeTreinos').getByRole('button', { name: 'Timer' })).toHaveCount(0);
  await page.locator('#hojeTreinos').getByRole('link', { name: 'Treinar mesmo assim' }).click();
  await expect(page).toHaveURL(/#treino$/);
  await expect(page.locator('.wk-name')).toHaveText('Superior A');
  expect(errors).toEqual([]);
});
