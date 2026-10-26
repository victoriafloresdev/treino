// O porte do plano alimentar precisa dar os mesmos números da página original.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as N from '../../js/data/nutricao.js';
import * as C from '../../js/nutri.js';

const ORIG = new URL('../../privado/Plano_da_Vic.html', import.meta.url);
const hasOrig = existsSync(ORIG);

// Avalia só os dados e as funções de cálculo da página original, sem DOM.
function loadOriginal() {
  const html = readFileSync(ORIG, 'utf8');
  const js = html.slice(html.lastIndexOf('<script>') + 8, html.lastIndexOf('</script>'));
  const cut = (a, b) => js.slice(js.indexOf(a), js.indexOf(b));
  const src = [
    cut('function fmt(n)', 'function dkey('),
    cut('var DAYS', '/* ================= state: day'),
    cut('function getOpt(slot)', 'function isDone('),
    cut('var CATS', 'var curCat'),
    cut('var CALC', 'var curCalc'),
    cut('var PRESETS', 'var LV'),
    'this.api = { DAYS, PROT, CARB, MOLHO, OPTS, SLOTS, CATS, CALC, PRESETS, PSY, LEG, SAL, OIL, prato, mealOf, totals, included, r5 };'
  ].join('\n');
  const ctx = { S: {}, cur: 'A', console };
  ctx.D = () => ctx.api.DAYS[ctx.cur];
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  return ctx;
}

const close = (a, b, msg) => a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9, `${msg}: ${a} ≠ ${b}`));

test('dados idênticos aos da página original', { skip: !hasOrig && 'página original ausente' }, () => {
  const { api: O } = loadOriginal();
  const plain = o => JSON.parse(JSON.stringify(o));
  for (const k of N.DAY_IDS) {
    const { desc, ...a } = N.DAYS[k]; const { desc: d2, ...b } = O.DAYS[k];
    assert.deepEqual(plain(a), plain(b)); assert.equal(desc, d2);
  }
  const noFn = l => plain(l.map(({ cas, red, ...x }) => x));
  assert.deepEqual(noFn(N.PROT), noFn(O.PROT));
  assert.deepEqual(noFn(N.CARB), noFn(O.CARB));
  for (const [list, orig] of [[N.PROT, O.PROT], [N.CARB, O.CARB]])
    for (const it of list) for (const g of [40, 55, 70, 85, 100, 125, 150, 200, 250])
      assert.equal(it.cas(g), orig.find(o => o.id === it.id).cas(g), `${it.id} ${g} g`);
  assert.deepEqual(plain(N.MOLHO), plain(O.MOLHO));
  assert.deepEqual(plain(N.PSY.m), plain(O.PSY.m));
  for (const x of ['LEG', 'SAL', 'OIL']) assert.deepEqual(plain(N[x]), plain(O[x]));
  // opções: macros, itens e nomes iguais; notas iguais, exceto as que dependem do perfil
  const PERSONAL = ['preCardio.jejum', 'preCardio.cafe', 'jantar.hamb'];
  for (const slot of Object.keys(O.OPTS)) {
    assert.equal(N.OPTS[slot].length, O.OPTS[slot].length, slot);
    O.OPTS[slot].forEach((o, i) => {
      const n = N.OPTS[slot][i];
      for (const k of ['id', 'name', 'e', 'tag', 'items', 'm', 'builder']) assert.deepEqual(plain(n[k] ?? null), plain(o[k] ?? null), `${slot}.${o.id}.${k}`);
      if (!PERSONAL.includes(`${slot}.${o.id}`)) assert.equal(n.note, o.note, `${slot}.${o.id}.note`);
    });
  }
  assert.deepEqual(plain(N.CATS), plain(O.CATS.map(c => c.id === 'doce' ? { ...c, hint: c.hint.replace('use a aba Refeição livre', 'use Refeição livre') } : c)));
  assert.deepEqual(plain(N.PRESETS), plain(O.PRESETS));
  // calculadora: só o carbo do jantar muda (passa a seguir o tipo do dia)
  assert.deepEqual(plain(N.CALC.filter(c => c.id !== 'carbJ')), plain(O.CALC.filter(c => c.id !== 'carbJ')));
});

test('totais do dia idênticos em todas as combinações', { skip: !hasOrig && 'página original ausente' }, () => {
  const ctx = loadOriginal(), O = ctx.api;
  let n = 0;
  for (const type of N.DAY_IDS) for (const prot of N.PROT) for (const carb of N.CARB) for (const molho of N.MOLHO)
    for (const jantar of N.OPTS.jantar) for (const [i, psy] of [[0, false], [1, true]]) {
      const sel = { preCardio: N.OPTS.preCardio[(n + i) % 4].id, cafe: N.OPTS.cafe[n % 7].id, lanche: N.OPTS.lanche[n % 6].id, preTreino: N.OPTS.preTreino[n % 5].id, doce: N.OPTS.doce[n % 6].id, jantar: jantar.id };
      const build = { almoco: { prot: prot.id, carb: carb.id, molho: molho.id }, jantar: { prot: N.PROT[(n + 2) % 6].id, carb: carb.id, molho: N.MOLHO[(n + 1) % 5].id } };
      const offDoce = n % 3 === 0, offPre = n % 4 === 0;
      ctx.cur = type;
      ctx.S = { sel, build, psy, opt: { [`${type}:doce`]: !offDoce, [`${type}:preTreino`]: !offPre } };
      const mine = C.totals(N.DAYS[type], { sel, build, psy, included: { doce: !offDoce, preTreino: !offPre } });
      close(mine, O.totals(O.DAYS[type]), `${type} ${prot.id} ${carb.id} ${molho.id} ${jantar.id}`);
      for (const meal of ['almoco', 'jantar']) {
        const a = C.prato(meal, N.DAYS[type], { build }), b = O.prato(meal, O.DAYS[type]);
        close(a.m, b.m, meal);
        assert.deepEqual(a.items, JSON.parse(JSON.stringify(b.items)));
      }
      n++;
    }
  assert.ok(n > 5000);
});

test('números conhecidos do plano', () => {
  const st = { sel: {}, build: {}, included: {} };
  // almoço padrão: 120 g de frango + 100 g de arroz + fixos + molho de iogurte
  const alm = C.prato('almoco', N.DAYS.A, st);
  assert.deepEqual([alm.pg, alm.cg], [120, 100]);
  assert.equal(Math.round(alm.m[0]), 445);
  // jantar: proteína × 0,84 e carboidrato × fator do dia, em múltiplos de 5 g
  assert.deepEqual([C.prato('jantar', N.DAYS.A, st).pg, C.prato('jantar', N.DAYS.A, st).cg], [100, 75]);
  assert.deepEqual([C.prato('jantar', N.DAYS.D, st).pg, C.prato('jantar', N.DAYS.D, st).cg], [100, 50]);
  assert.equal(C.r5(2), 5);
  // ±60 kcal conta como dentro da meta
  assert.equal(C.status(1760, N.DAYS.A).on, true);
  assert.equal(C.status(1761, N.DAYS.A).on, false);
  assert.equal(C.status(1600, N.DAYS.A).text, '100 kcal abaixo da meta');
  // psyllium soma [15, 0,1, 4, 0, 4]
  const sem = C.totals(N.DAYS.B, st), com = C.totals(N.DAYS.B, { ...st, psy: true });
  assert.deepEqual(com.map((v, i) => +(v - sem[i]).toFixed(6)), [15, 0.1, 4, 0, 4]);
  // pré-treino só em dia de musculação; jejum não conta como refeição
  assert.ok(C.visible(N.DAYS.A).some(s => s.id === 'preTreino'));
  assert.ok(!C.visible(N.DAYS.B).some(s => s.id === 'preTreino'));
  assert.ok(!C.countedMeals(N.DAYS.A, st).some(s => s.id === 'preCardio'));
  // lembrete do remédio só com perfil
  assert.ok(!C.visible(N.DAYS.A).some(s => s.id === 'remedio'));
  assert.ok(C.visible(N.DAYS.A, { remedio: { h: 6 } }).some(s => s.id === 'remedio'));
  assert.equal(C.waterGoalCups(N.DAYS.A), 14);
});

test('calculadora de troca', () => {
  const [protA, , carbA, carbJ, , , lanche] = N.CALC;
  assert.match(C.calcTroca(protA, 0, 0, N.DAYS.A), /Digite as calorias/);
  assert.match(C.calcTroca(protA, 150, 8, N.DAYS.A), /não funciona como proteína principal/);
  // 38 g de proteína com 25 g/100 g = 152 g ≈ 150 g; 228 kcal, 37 a mais que o frango
  assert.match(C.calcTroca(protA, 150, 25, N.DAYS.A), /^<div class="big">150 g<\/div>dão ~38 g de proteína e ~228 kcal\. Fica praticamente igual/);
  assert.match(C.calcTroca(protA, 200, 25, N.DAYS.A), /<b>113 kcal a mais<\/b> que 120 g de frango/);
  assert.match(C.calcTroca(carbA, 130, 0, N.DAYS.A), /^<div class="big">95 g<\/div>cabem nas ~125 kcal/);
  // carbo do jantar segue o tipo do dia: ~95 kcal em A/B e ~65 kcal em C/D
  assert.equal(C.calcGoalK(carbJ, N.DAYS.A), 95);
  assert.equal(C.calcGoalK(carbJ, N.DAYS.B), 95);
  assert.equal(C.calcGoalK(carbJ, N.DAYS.C), 65);
  assert.equal(C.calcGoalK(carbJ, N.DAYS.D), 65);
  assert.match(C.calcTroca(lanche, 400, 3, N.DAYS.A), /Pouca proteína para um lanche/);
  assert.doesNotMatch(C.calcTroca(lanche, 400, 30, N.DAYS.A), /Pouca proteína/);
});

test('refeição livre', () => {
  const cuts = [['🍫', 'Tirar o docinho', 115], ['🍌', 'Pular o pré-treino', 78], ['🍚', 'Jantar com metade do carboidrato', 50], ['🥤', 'Lanche: shake no lugar do bowl', 78], ['🌿', 'Molho só de temperos', 20]];
  assert.equal(C.refeicaoLivre({ kcal: 300, replK: 400, weekDef: 4400, strat: 'seguir', days: 3, cuts }).kind, 'cabe');
  const s = C.refeicaoLivre({ kcal: 800, replK: 380, weekDef: 4410, strat: 'seguir', days: 3, cuts });
  assert.equal(s.extra, 420); assert.equal(s.recommended, true); assert.equal(s.delay, 420 / 630); assert.equal(s.after, 3990);
  const d = C.refeicaoLivre({ kcal: 1400, replK: 380, weekDef: 4410, strat: 'diluir', days: 3, cuts });
  // no máximo 250 kcal por dia; o resto só adia
  assert.equal(d.per, 250); assert.equal(d.rem, 1020 - 750);
  assert.deepEqual(d.chosen.map(c => c[2]), [115, 78, 50]);
  const d2 = C.refeicaoLivre({ kcal: 900, replK: 380, weekDef: 4410, strat: 'diluir', days: 4, cuts });
  assert.equal(d2.per, 130); assert.deepEqual(d2.chosen.map(c => c[2]), [115, 78]);
});

test('tendência de peso', () => {
  const w = { '2026-10-26': 80.0, '2026-10-24': 80.2, '2026-10-22': 80.4, '2026-10-18': 80.9, '2026-10-16': 81.1 };
  const r = C.weightTrend(w, '2026-10-26');
  assert.equal(r.w1.n, 3); assert.ok(Math.abs(r.ch - (-0.8)) < 1e-9);
  assert.equal(r.msg, 'Dentro do ritmo esperado (0,5–0,8 kg por semana).');
  // com menos de 3 pesagens na semana, sem mensagem
  assert.equal(C.weightTrend({ '2026-10-26': 80, '2026-10-18': 81 }, '2026-10-26').msg, null);
  const msg = ch => C.weightTrend({ '2026-10-26': 80 + ch, '2026-10-25': 80 + ch, '2026-10-24': 80 + ch, '2026-10-18': 80 }, '2026-10-26').msg;
  assert.match(msg(-1), /^Queda forte/); assert.match(msg(-0.5), /^Dentro do ritmo/); assert.match(msg(-0.1), /^Queda lenta/); assert.match(msg(0), /^Média subiu ou ficou igual/);
});

test('textos pessoais vêm do perfil', () => {
  assert.equal(C.txt('a [[k|genérico]] b'), 'a genérico b');
  assert.equal(C.txt('a [[k|genérico]] b', { textos: { k: 'pessoal' } }), 'a pessoal b');
  const red = C.prato('almoco', N.DAYS.A, { build: { almoco: { prot: 'moida' } } });
  assert.equal(C.noteOf(red), 'Carne vermelha 3–4x por semana ajuda a manter o ferro.');
  assert.equal(C.noteOf(red, { textos: { 'nota.carneVermelha': 'pessoal' } }), 'pessoal');
});

test('semana', () => {
  const w = C.weekNumbers(['A', 'A', 'B', 'A', 'A', 'B', 'D'].map(type => ({ type, kcal: N.DAYS[type].target })));
  assert.equal(w.kcal, 1700 * 4 + 1600 * 2 + 1550);
  assert.equal(w.burn, 2420 * 4 + 2220 * 2 + 2000);
  assert.deepEqual([w.cardio, w.musc, w.rest], [6, 4, 1]);
  assert.equal(C.weekNote(w), N.WEEK_NOTES.ok);
  assert.equal(C.weekNote(C.weekNumbers(Array(7).fill({ type: 'A', kcal: 0 }))), N.WEEK_NOTES.semDescanso);
});
