// Itens das refeições: valores por item somam o total da opção, e tirar itens desconta só aquele dia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OPTS, DAYS } from '../../js/data/nutricao.js';
import { ITEM_EST } from '../../js/data/itens.js';
import { itemMacros, canEditItems, mealOf } from '../../js/nutri.js';

const close = (a, b) => Math.abs(a - b) < 0.051;

test('toda opção com 2+ itens (fora o prato montado) tem valores por item, e a soma dá o total da opção', () => {
  for (const [slot, list] of Object.entries(OPTS)) {
    if (!Array.isArray(list)) continue;
    for (const o of list) {
      if (o.builder || (o.items?.length || 0) < 2) continue;
      const key = `${slot}:${o.id}`;
      assert.ok(ITEM_EST[key], `faltam valores para ${key}`);
      assert.equal(ITEM_EST[key].length, o.items.length, `${key}: um valor por item`);
      const im = itemMacros(slot, o);
      for (let j = 0; j < 5; j++) assert.ok(close(im.reduce((a, x) => a + x[j], 0), o.m[j]), `${key}: soma do macro ${j}`);
      assert.ok(im.every(x => x.every(v => v >= 0)), `${key}: sem valor negativo`);
      assert.ok(canEditItems(slot, o));
    }
  }
  // nenhuma chave sobrando
  for (const key of Object.keys(ITEM_EST)) {
    const [slot, id] = key.split(':');
    assert.ok(OPTS[slot]?.some(o => o.id === id), `chave sem opção: ${key}`);
  }
});

test('tirar pão, muçarela e fruta do "Ovos e pão" conta só ovos e leite', () => {
  const d = DAYS.A, base = { sel: { cafe: 'salgado' }, build: {}, included: {} };
  const full = mealOf('cafe', d, base);
  assert.deepEqual(full.m, [405, 27, 38, 16, 4.4]);
  const st = { ...base, skip: { cafe: { opt: 'salgado', idx: [1, 2, 4] } } };
  const m = mealOf('cafe', d, st);
  const im = itemMacros('cafe', full);
  assert.equal(m.m[0], im[0][0] + im[3][0]);
  assert.ok(m.m[0] > 180 && m.m[0] < 250, `ovos + leite ≈ 220 kcal (${m.m[0]})`);
  assert.deepEqual(m.skipped, [1, 2, 4]);
  // trocar de opção ignora o que foi tirado da outra
  assert.deepEqual(mealOf('cafe', d, { ...st, sel: { cafe: 'crepioca' } }).m, OPTS.cafe.find(o => o.id === 'crepioca').m);
  // opção de um item só não tem edição
  assert.equal(canEditItems('preTreino', OPTS.preTreino.find(o => o.id === 'banana')), false);
});
