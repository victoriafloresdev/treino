import { test, expect } from '@playwright/test';
import { watchErrors } from './helpers.js';

// imagem sintética (retângulo colorido), nunca uma foto real
async function fakeImage(page, color, name) {
  const b64 = await page.evaluate(c => { const cv = document.createElement('canvas'); cv.width = 1800; cv.height = 2400;
    const x = cv.getContext('2d'); x.fillStyle = c; x.fillRect(0, 0, 1800, 2400); x.fillStyle = '#fff'; x.fillRect(600, 400, 600, 1600);
    return cv.toDataURL('image/png').split(',')[1]; }, color);
  return { name, mimeType: 'image/png', buffer: Buffer.from(b64, 'base64') };
}
async function open(page, time) {
  await page.clock.install({ time });
  await page.setViewportSize({ width: 402, height: 874 });
  await page.goto('/index.html#hoje');
  await page.getByRole('button', { name: 'Salvar data de início' }).click();
  await expect(page.locator('#ctx')).toContainText('Semana 1');
  await page.goto('/index.html#progresso/fotos');
  await page.waitForSelector('.ph-grid');
}
const photos = page => page.evaluate(async () => { const { db } = await import('/js/db.js'); return (await db.allRaw('photos')).map(p => ({ uid: p.uid, deleted: !!p.deleted, img: p.img ? p.img.slice(0, 23) : null, w: p.w, h: p.h, len: p.img?.length || 0 })); });

test('fotos da semana: 4 ângulos, reduzidas, trocar, apagar, comparar e ir no backup', async ({ page }) => {
  const errors = watchErrors(page);
  await open(page, new Date('2026-10-20T08:00:00')); // semana de 19/10
  await expect(page.locator('.ph-slot')).toHaveCount(4);
  await expect(page.locator('.ph-slot')).toHaveText([/Frente/, /Lado/, /Costas/, /Livre/]);

  await page.getByLabel('Adicionar foto: Frente').setInputFiles(await fakeImage(page, '#c33', 'a.png'));
  await expect(page.locator('.ph-slot.has')).toHaveCount(1);
  await page.getByLabel('Adicionar foto: Costas').setInputFiles(await fakeImage(page, '#36c', 'b.png'));
  await expect(page.locator('.ph-slot.has')).toHaveCount(2);
  let ph = await photos(page);
  expect(ph.map(p => p.uid).sort()).toEqual(['photo:2026-10-19:costas', 'photo:2026-10-19:frente']);
  // reduzida para 1280 px no lado maior, em JPEG
  expect(ph[0].img).toBe('data:image/jpeg;base64,');
  expect(Math.max(ph[0].w, ph[0].h)).toBe(1280);
  expect(ph[0].len).toBeLessThan(400 * 1024);

  // semana seguinte: compara com a anterior, lado a lado
  await page.clock.setFixedTime(new Date('2026-10-27T08:00:00'));
  await page.reload(); await page.waitForSelector('.ph-grid');
  await expect(page.locator('.datenav-pick b')).toHaveText('Esta semana');
  await expect(page.locator('.ph-slot.has')).toHaveCount(0);
  await page.getByLabel('Adicionar foto: Frente').setInputFiles(await fakeImage(page, '#3a3', 'c.png'));
  await expect(page.locator('.ph-cmp figure')).toHaveCount(1);
  await expect(page.locator('.ph-cmp figure')).toContainText('Frente');
  await expect(page.locator('.ph-cmp small')).toHaveText(['19/10', '26/10']);

  // trocar e apagar pela foto aberta
  await page.locator('.ph-slot.has').click();
  await expect(page.locator('#sheet .ph-big')).toBeVisible();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', { name: 'Apagar foto' }).click();
  await expect(page.locator('.ph-slot.has')).toHaveCount(0);
  ph = await photos(page);
  const del = ph.find(p => p.uid === 'photo:2026-10-26:frente');
  expect(del).toMatchObject({ deleted: true, img: null }); // o registro apagado não guarda a imagem

  // semana anterior continua lá
  await page.getByRole('button', { name: 'Semana anterior' }).click();
  await expect(page.locator('.ph-slot.has')).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Próxima semana' })).toBeEnabled();

  // vão no backup e voltam ao restaurar
  const backup = await page.evaluate(async () => { const { db } = await import('/js/db.js'); return db.exportAll(); });
  expect(backup.version).toBe(3);
  expect(backup.photos.filter(p => !p.deleted)).toHaveLength(2);
  await page.evaluate(async b => { const { db, STORES } = await import('/js/db.js'); for (const s of STORES) await db.clear(s); await db.importAll(b, 'replace'); }, backup);
  await page.reload(); await page.waitForSelector('.ph-grid');
  await page.getByRole('button', { name: 'Semana anterior' }).click();
  await expect(page.locator('.ph-slot.has')).toHaveCount(2);

  // salvar no celular: baixa as imagens quando não há folha de compartilhamento
  await page.evaluate(() => { navigator.canShare = () => false; });
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Salvar fotos da semana/ }).click()]);
  expect(dl.suggestedFilename()).toMatch(/^progresso-2026-10-19-(frente|costas)\.jpg$/);
  expect(errors).toEqual([]);
});
