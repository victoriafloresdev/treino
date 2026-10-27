// Tipo de dia: previsto na semana, elevado pelo registro, rebaixado só por ação explícita.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weekModelFromPlan, resolveDay, monIdx } from '../../js/daytype.js';

const MODEL = weekModelFromPlan();
// 2026-10-26 é segunda
const SEG = '2026-10-26', QUA = '2026-10-28', SAB = '2026-10-31', DOM = '2026-11-01';

test('modelo semanal: musculação seg–qui, cardio seg–sáb', () => {
  assert.deepEqual(MODEL, ['A', 'A', 'A', 'A', 'B', 'B', 'D']);
  assert.equal(monIdx(SEG), 0); assert.equal(monIdx(DOM), 6);
});

test('previsto na semana', () => {
  assert.deepEqual(resolveDay(SEG, MODEL), { type: 'A', plannedType: 'A', source: 'ficha', manual: false, skip: { cardio: false, musc: false } });
  assert.equal(resolveDay(DOM, MODEL).type, 'D');
});

test('registrar atividade não prevista eleva o tipo', () => {
  const r = resolveDay(DOM, MODEL, { cardio: true });
  assert.equal(r.type, 'B'); assert.equal(r.source, 'registro');
  assert.equal(resolveDay(QUA, MODEL, { musc: true }).type, 'A');
});

test('não registrar não rebaixa; pular rebaixa', () => {
  assert.equal(resolveDay(SEG, MODEL, {}).type, 'A');
  const semTreino = resolveDay(SEG, MODEL, {}, { skip: { musc: true } });
  assert.equal(semTreino.type, 'B'); assert.equal(semTreino.source, 'voce');
  assert.equal(resolveDay(SEG, MODEL, {}, { skip: { musc: true, cardio: true } }).type, 'D');
  assert.equal(resolveDay(SAB, MODEL, {}, { skip: { cardio: true } }).type, 'D');
  // pulou o cardio, mas acabou fazendo: o registro vale
  const fez = resolveDay(SEG, MODEL, { cardio: true }, { skip: { cardio: true } });
  assert.equal(fez.type, 'A'); assert.equal(fez.source, 'ficha');
  assert.equal(resolveDay(SEG, MODEL, { cardio: true }, { skip: { cardio: true, musc: true } }).source, 'voce');
  assert.equal(resolveDay(SAB, MODEL, { cardio: true, musc: true }, { skip: { cardio: true } }).source, 'registro');
});

test('escolha manual sempre vence', () => {
  const r = resolveDay(SEG, MODEL, { cardio: true, musc: true }, { override: 'D' });
  assert.equal(r.type, 'D'); assert.equal(r.source, 'voce'); assert.equal(r.manual, true);
});

test('modelo editado', () => {
  assert.equal(resolveDay(SAB, ['A', 'A', 'B', 'A', 'A', 'D', 'D']).type, 'D');
});
