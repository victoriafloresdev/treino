// Cardio: etapas, timer e regra de progressão da corrida.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, cardioOfDay, totalSecs, timerAt, weekStage, progression, pendingPainCheck } from '../../js/cardio.js';
import { cardioPlan } from '../../js/training.js';

test('cada etapa soma 30 minutos e bate com o texto do Guia', () => {
  for (const s of STAGES) assert.equal(totalSecs(s.segs), 30 * 60, s.label);
  // o texto é o mesmo da prescrição por semana
  assert.equal(STAGES[0].text, cardioPlan(1, 3));
  assert.equal(STAGES[1].text, cardioPlan(3, 3));
  assert.equal(STAGES[2].text, cardioPlan(5, 6));
  assert.equal(STAGES[3].text, cardioPlan(7, 6));
  assert.equal(STAGES[1].segs.filter(s => s.kind === 'trote').length, 7);
});

test('cardio do dia', () => {
  assert.equal(cardioOfDay(0, 2).kind, 'descanso');
  assert.equal(cardioOfDay(3, 2).text, STAGES[2].text);
  assert.equal(cardioOfDay(1, 2).text, cardioPlan(5, 1));
  assert.equal(cardioOfDay(2, 2).text, cardioPlan(5, 2));
});

test('timer por tempo decorrido', () => {
  const segs = STAGES[1].segs;
  assert.deepEqual([timerAt(segs, 0).idx, timerAt(segs, 0).segLeft], [0, 300]);
  const t = timerAt(segs, 300 + 30);
  assert.equal(t.seg.kind, 'trote'); assert.equal(t.segLeft, 30); assert.equal(t.next.kind, 'caminhada');
  assert.equal(timerAt(segs, 1800).done, true);
  assert.equal(timerAt(segs, 1799).totalLeft, 1);
});

test('etapa liberada pela semana do programa', () => {
  assert.deepEqual([1, 2, 3, 4, 5, 6, 7, 12].map(weekStage), [0, 0, 1, 1, 2, 2, 3, 3]);
});

const run = (date, stage, completed, painNextDay, updatedAt = 0) => ({ date, stage, completed, painNextDay, updatedAt });

test('progressão: 2 sessões completas sem dor e semana liberada', () => {
  assert.equal(progression([], 1, 5).state, 'seguir');
  assert.deepEqual(progression([run('2026-10-21', 1, 'sim', 'nenhuma')], 1, 5), { state: 'seguir', streak: 1 });
  const ok = [run('2026-10-21', 1, 'sim', 'nenhuma'), run('2026-10-24', 1, 'sim', 'nenhuma')];
  assert.deepEqual(progression(ok, 1, 5), { state: 'avancar', streak: 2, next: 2 });
  // semana ainda não chegou na próxima etapa: espera
  assert.equal(progression(ok, 1, 4).state, 'aguardar');
  assert.equal(progression(ok, 1, 4).fromWeek, 5);
  // sessão parcial quebra a sequência
  assert.equal(progression([...ok, run('2026-10-28', 1, 'parcial', 'nenhuma')], 1, 5).streak, 0);
  // sessão ainda sem resposta não conta nem quebra
  assert.equal(progression([...ok, run('2026-10-28', 1, 'sim', null)], 1, 5).state, 'avancar');
  // só conta a etapa atual
  assert.equal(progression([run('2026-10-14', 0, 'sim', 'nenhuma'), run('2026-10-21', 1, 'sim', 'nenhuma')], 1, 5).streak, 1);
  assert.equal(progression(ok.map(r => ({ ...r, stage: 3 })), 3, 9).state, 'final');
});

test('progressão: dor no dia seguinte oferece repetir ou voltar', () => {
  const p = progression([run('2026-10-21', 2, 'sim', 'nenhuma'), run('2026-10-24', 2, 'sim', 'canela')], 2, 7);
  assert.deepEqual(p, { state: 'dor', pain: 'canela', date: '2026-10-24', streak: 0, canBack: true });
  assert.equal(progression([run('2026-10-24', 0, 'sim', 'joelho')], 0, 1).canBack, false);
  // depois da dor, duas sessões boas voltam a liberar
  const again = [run('2026-10-24', 2, 'sim', 'canela'), run('2026-10-28', 2, 'sim', 'nenhuma'), run('2026-10-31', 2, 'sim', 'nenhuma')];
  assert.equal(progression(again, 2, 7).state, 'avancar');
});

test('pergunta sobre dor: corrida recente e ainda sem resposta', () => {
  const recs = [run('2026-10-24', 1, 'sim', null), { date: '2026-10-25', type: 'caminhada' }, run('2026-10-20', 1, 'sim', null)];
  assert.equal(pendingPainCheck(recs, '2026-10-25').date, '2026-10-24');
  assert.equal(pendingPainCheck(recs, '2026-10-24'), null); // no mesmo dia ainda não pergunta
  assert.equal(pendingPainCheck([run('2026-10-24', 1, 'sim', 'nenhuma')], '2026-10-25'), null);
  assert.equal(pendingPainCheck([run('2026-10-20', 1, 'sim', null)], '2026-10-25'), null); // mais de 3 dias
});
