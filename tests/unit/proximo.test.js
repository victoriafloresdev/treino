// Próxima refeição e mensagem do dia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DAYS } from '../../js/data/nutricao.js';
import { nextMeal, mensagemDoDia } from '../../js/proximo.js';
import { MENSAGENS } from '../../js/data/mensagens.js';

const info = (type, done = {}, st = {}) => ({ d: DAYS[type], st: { sel: {}, build: {}, included: {}, ...st }, done, profile: null });
const id = r => r?.slot?.id ?? null;

test('nada marcado: pela hora do dia', () => {
  assert.equal(id(nextMeal(info('A'), 6)), 'cafe'); // pré-cardio em jejum não conta como refeição
  assert.equal(id(nextMeal(info('A'), 11.5)), 'almoco');
  assert.equal(id(nextMeal(info('A'), 16)), 'lanche');
  assert.equal(id(nextMeal(info('A'), 23)), 'cafe'); // tarde da noite, sem nada marcado: a primeira do dia
});

test('depois da última marcada, mesmo fora de hora', () => {
  assert.equal(id(nextMeal(info('A', { cafe: true }), 8)), 'almoco');
  assert.equal(id(nextMeal(info('A', { cafe: true, almoco: true }), 12.5)), 'doce');
  // marcou o lanche sem marcar o almoço: segue a partir do lanche e lembra o que ficou
  const r = nextMeal(info('A', { cafe: true, lanche: true }), 17);
  assert.equal(id(r), 'preTreino');
  assert.deepEqual(r.skipped.map(s => s.id), ['almoco', 'doce']);
});

test('opcionais desligados e tipo do dia', () => {
  const st = { included: { doce: false } };
  assert.equal(id(nextMeal(info('A', { almoco: true }, st), 12.5)), 'lanche');
  // dia sem musculação: sem pré-treino
  assert.equal(id(nextMeal(info('B', { lanche: true }), 17)), 'jantar');
  // pré-cardio com comida entra na fila
  assert.equal(id(nextMeal(info('A', {}, { sel: { preCardio: 'banana' } }), 6)), 'preCardio');
});

test('dia completo', () => {
  const all = { preCardio: true, cafe: true, almoco: true, doce: true, lanche: true, preTreino: true, jantar: true };
  const r = nextMeal(info('A', all), 21);
  assert.equal(r.slot, null); assert.equal(r.done, true);
  // última marcada foi o jantar mas faltou o lanche: não há "próxima", e o lanche aparece como pulado
  const r2 = nextMeal(info('B', { cafe: true, almoco: true, doce: true, jantar: true }), 20);
  assert.equal(r2.slot, null); assert.equal(r2.done, false); assert.deepEqual(r2.skipped.map(s => s.id), ['lanche']);
});

test('mensagem do dia muda com o contexto e fica estável no dia', () => {
  const base = { hour: 9, cardio: true, musc: true, cardioDone: false, muscDone: false, weekPct: 60, weekday: 2 };
  assert.equal(mensagemDoDia({ ...base, hour: 7 }, '2026-10-27').key, 'manhaCardio');
  assert.equal(mensagemDoDia({ ...base, hour: 12 }, '2026-10-27').key, 'diaTreino');
  assert.equal(mensagemDoDia({ ...base, hour: 12, muscDone: true }, '2026-10-27').key, 'treinoFeito');
  assert.equal(mensagemDoDia({ ...base, hour: 12, cardio: false, musc: false }, '2026-10-27').key, 'descanso');
  assert.equal(mensagemDoDia({ ...base, hour: 12, weekday: 5, weekPct: 30 }, '2026-10-30').key, 'semanaCorrida');
  assert.equal(mensagemDoDia({ ...base, hour: 21 }, '2026-10-27').key, 'noite');
  const a = mensagemDoDia({ ...base, hour: 12 }, '2026-10-27').text;
  assert.equal(mensagemDoDia({ ...base, hour: 13 }, '2026-10-27').text, a);
});

test('mensagens sem culpa e sem falar de peso', () => {
  const all = Object.values(MENSAGENS).flat();
  for (const m of all) assert.doesNotMatch(m, /deveria|falhou|culpa|errou|peso|kg|emagre|gordura|proibid/i, m);
  for (const m of all) assert.ok(m.length <= 90, `curta: ${m}`);
});
