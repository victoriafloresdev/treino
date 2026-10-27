// Próxima refeição.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAYS } from '../../js/data/nutricao.js';
import { nextMeal } from '../../js/proximo.js';

const info = (type, done = {}, st = {}) => ({ d: DAYS[type], st: { sel: {}, build: {}, included: {}, ...st }, done, profile: null });
const id = r => r?.slot?.id ?? null;

test('nada marcado: sempre o café da manhã, a qualquer hora; só avança marcando', () => {
  assert.equal(id(nextMeal(info('A'))), 'cafe'); // pré-cardio em jejum não conta como refeição
  assert.equal(id(nextMeal(info('B'))), 'cafe');
  assert.equal(id(nextMeal(info('A', { cafe: true }))), 'almoco');
});

test('depois da última marcada', () => {
  assert.equal(id(nextMeal(info('A', { cafe: true }))), 'almoco');
  assert.equal(id(nextMeal(info('A', { cafe: true, almoco: true }))), 'doce');
  // marcou o lanche sem marcar o almoço: segue a partir do lanche e lembra o que ficou
  const r = nextMeal(info('A', { cafe: true, lanche: true }));
  assert.equal(id(r), 'preTreino');
  assert.deepEqual(r.skipped.map(s => s.id), ['almoco', 'doce']);
});

test('opcionais desligados e tipo do dia', () => {
  const st = { included: { doce: false } };
  assert.equal(id(nextMeal(info('A', { almoco: true }, st))), 'lanche');
  // dia sem musculação: sem pré-treino
  assert.equal(id(nextMeal(info('B', { lanche: true }))), 'jantar');
  // pré-cardio com comida entra na fila
  assert.equal(id(nextMeal(info('A', {}, { sel: { preCardio: 'banana' } }))), 'preCardio');
});

test('dia completo', () => {
  const all = { preCardio: true, cafe: true, almoco: true, doce: true, lanche: true, preTreino: true, jantar: true };
  const r = nextMeal(info('A', all));
  assert.equal(r.slot, null); assert.equal(r.done, true);
  // última marcada foi o jantar mas faltou o lanche: não há "próxima", e o lanche aparece como pulado
  const r2 = nextMeal(info('B', { cafe: true, almoco: true, doce: true, jantar: true }));
  assert.equal(r2.slot, null); assert.equal(r2.done, false); assert.deepEqual(r2.skipped.map(s => s.id), ['lanche']);
});
