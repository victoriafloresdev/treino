// Plano alimentar: cálculos puros (sem DOM e sem banco), portados do Plano da Vic.
// Estado de um dia: { sel: {slot: opção}, build: {almoco, jantar}, included: {slot: bool}, psy: bool }
import {
  DAYS, PROT, CARB, MOLHO, LEG, SAL, OIL, PSY, OPTS, SLOTS, DEFAULT_BUILD, DINNER_PROT_FACTOR,
  ON_TARGET_KCAL, KCAL_PER_KG_FAT, CALC_MIN_PROT_PER_100, CALC_TOLERANCE, LIVRE_SEGUIR_ATE, LIVRE_MAX_CORTE_DIA, WEIGHT_MSGS, WEEK_NOTES
} from './data/nutricao.js';

export const ZERO = [0, 0, 0, 0, 0];
export const add = (a, b) => a.map((v, i) => v + (b[i] || 0));
export const scale = (per, g) => per.map(v => v * g / 100);
export const r5 = g => Math.max(5, Math.round(g / 5) * 5);
export const fmt = n => Math.round(n).toLocaleString('pt-BR');
export const fmt1 = n => (Math.round(n * 10) / 10).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const byId = (list, id) => list.find(x => x.id === id) || list[0];

// Texto com dado pessoal: [[chave|genérico]] vira o texto do perfil, se houver.
export function txt(s, profile) {
  const T = profile?.textos || {};
  return String(s ?? '').replace(/\[\[([\w.]+)\|([\s\S]*?)\]\]/g, (_, k, gen) => (k in T ? T[k] : gen));
}
export const noteOf = (o, profile) => (o.noteKey && profile?.textos?.[o.noteKey]) || o.note || '';

export const getOpt = (slot, st) => byId(OPTS[slot], st?.sel?.[slot]);
export const buildOf = (meal, st) => ({ ...DEFAULT_BUILD, ...(st?.build?.[meal] || {}) });

export function prato(meal, d, st) {
  const b = buildOf(meal, st);
  const p = byId(PROT, b.prot), c = byId(CARB, b.carb), mo = byId(MOLHO, b.molho);
  const pg = meal === 'almoco' ? p.g : r5(p.g * DINNER_PROT_FACTOR);
  const cg = meal === 'almoco' ? c.g : r5(c.g * d.carbDinner);
  const m = [scale(p.per, pg), scale(c.per, cg), LEG.m, SAL.m, OIL.m, mo.m].reduce(add, ZERO);
  let note = '', noteKey = null;
  if (meal === 'jantar') note = d.musc ? 'À noite prefira legumes cozidos: digestão mais leve antes de dormir.' : 'Dia sem musculação: carboidrato do jantar pela metade do almoço.';
  else if (p.red) { note = 'Carne vermelha 3–4x por semana ajuda a manter o ferro.'; noteKey = 'nota.carneVermelha'; }
  return {
    e: p.e, builder: true, prot: p, carb: c, molho: mo, pg, cg,
    items: [[p.name, `${pg} g (${p.cas(pg)})`], [c.name, `${cg} g (${c.cas(cg)})`], [LEG.name, LEG.q], [SAL.name, SAL.q], [OIL.name, OIL.q], ['Molho: ' + mo.name.toLowerCase(), mo.q]],
    m, note, noteKey
  };
}
export function mealOf(slot, d, st) {
  if (slot === 'almoco') return prato('almoco', d, st);
  if (slot === 'jantar') { const o = getOpt('jantar', st); return o.builder ? prato('jantar', d, st) : o; }
  return getOpt(slot, st);
}
export const slotById = id => SLOTS.find(s => s.id === id);
export function included(s, st) {
  if (!s.optional) return true;
  const v = st?.included?.[s.id];
  return v == null ? s.defaultOn : v;
}
// O lembrete do remédio só existe com o perfil de saúde.
export const visible = (d, profile) => SLOTS.filter(s => (s.profile ? !!profile?.remedio : s.show(d)));
// refeições que contam: visíveis, incluídas e com comida (o "em jejum" não conta como refeição)
export const countedMeals = (d, st, profile) => visible(d, profile)
  .filter(s => s.kind === 'meal' && included(s, st) && !(s.id === 'preCardio' && mealOf(s.id, d, st).m[0] === 0));

export function totals(d, st) {
  let t = ZERO;
  for (const s of visible(d)) if (s.kind === 'meal' && included(s, st)) t = add(t, mealOf(s.id, d, st).m);
  if (st?.psy) t = add(t, PSY.m);
  return t;
}
export function status(kcal, d) {
  const diff = kcal - d.target, on = Math.abs(diff) <= ON_TARGET_KCAL;
  const text = on ? `Dentro da meta de ${fmt(d.target)} kcal` : diff > 0 ? `${fmt(diff)} kcal acima da meta` : `${fmt(-diff)} kcal abaixo da meta`;
  return { diff, on, text };
}
export const deficit = (kcal, d) => ({ def: d.burn - kcal, pct: Math.round((d.burn - kcal) / d.burn * 100) });
export const waterGoalCups = d => Math.round(d.water * 4);

/* ---------- semana ---------- */
// days: [{ type, kcal }] (7 dias)
export function weekNumbers(days) {
  let kcal = 0, burn = 0, cardio = 0, musc = 0, rest = 0;
  for (const x of days) {
    const d = DAYS[x.type];
    kcal += x.kcal; burn += d.burn;
    if (d.cardio) cardio++; if (d.musc) musc++; if (!d.cardio && !d.musc) rest++;
  }
  const def = burn - kcal;
  return { kcal, burn, def, cardio, musc, rest, avgKcal: kcal / 7, avgDef: def / 7, fatLo: def / KCAL_PER_KG_FAT * 0.8, fatHi: def / KCAL_PER_KG_FAT * 1.2 };
}
export function weekNote(w) {
  if (w.rest === 0) return WEEK_NOTES.semDescanso;
  if (w.musc > 5) return WEEK_NOTES.muitaMusc(w.musc);
  if (w.cardio + w.musc === 0) return WEEK_NOTES.semTreino;
  return WEEK_NOTES.ok;
}

/* ---------- peso: média de 7 dias vs. os 7 anteriores ---------- */
// weights: { 'AAAA-MM-DD': kg }; today: 'AAAA-MM-DD'
export function weightTrend(weights, today) {
  const t0 = Date.parse(today + 'T00:00:00');
  const range = (a, b) => {
    const v = Object.keys(weights).filter(k => { const diff = (t0 - Date.parse(k + 'T00:00:00')) / 864e5; return diff >= a && diff < b; }).map(k => weights[k]);
    return v.length ? { avg: v.reduce((x, y) => x + y, 0) / v.length, n: v.length } : null;
  };
  const w1 = range(0, 7), w2 = range(7, 14);
  const ch = w1 && w2 ? w1.avg - w2.avg : null;
  // a mensagem só aparece com pelo menos 3 pesagens na semana, como o texto pede
  const msg = ch != null && w1.n >= 3 ? WEIGHT_MSGS.find(([lim]) => ch <= lim)[1] : null;
  return { w1, w2, ch, msg };
}

/* ---------- calculadora de troca ---------- */
// Devolve HTML com o resultado. c: item de CALC; k e p: kcal e proteína por 100 g; d: tipo do dia.
export function calcGoalK(c, d) { return c.dinnerFactor ? r5(c.goalK * d.carbDinner) : c.goalK; }
export function calcTroca(c, k, p, d) {
  if (!(k > 0)) return 'Digite as calorias por 100 g. Ficam na tabela nutricional do rótulo, na coluna “100 g”.';
  if (c.goalP) {
    if (!(p > 0)) return 'Para proteína, digite também os gramas de proteína por 100 g.';
    if (p < CALC_MIN_PROT_PER_100) return `Com ${fmt1(p)} g de proteína por 100 g, esse alimento não funciona como proteína principal. Ele entra melhor como carboidrato ou gordura.`;
    const g = c.goalP / (p / 100), kc = g * k / 100, dif = kc - c.refK;
    let out = `<div class="big">${fmt(r5(g))} g</div>dão ~${c.goalP} g de proteína e ~${fmt(kc)} kcal. `;
    if (dif > CALC_TOLERANCE) out += `Isso é <b>${fmt(dif)} kcal a mais</b> que ${c.ref}. Para compensar, use molho só de temperos ou tire o azeite do preparo.`;
    else if (dif < -CALC_TOLERANCE) out += `Isso é ${fmt(-dif)} kcal a menos que ${c.ref}: sobra espaço para um molho mais cremoso.`;
    else out += `Fica praticamente igual a ${c.ref}.`;
    return out;
  }
  const goalK = calcGoalK(c, d);
  const g2 = goalK / (k / 100), pr = p > 0 ? g2 * p / 100 : null;
  let out = `<div class="big">${fmt(r5(g2))} g</div>cabem nas ~${goalK} kcal desse espaço${pr !== null ? ` e trazem ~${fmt1(pr)} g de proteína` : ''}.`;
  if (c.minP && pr !== null && pr < c.minP) out += ' <b>Pouca proteína para um lanche.</b> Junte um iogurte ou 15 g de whey e reduza a porção para caber.';
  return out;
}

/* ---------- refeição livre ---------- */
// cuts: [[emoji, texto, kcal]] na ordem de preferência
export function refeicaoLivre({ kcal, replK, weekDef, strat, days, cuts }) {
  const extra = kcal - replK;
  if (!(kcal > 0)) return { kind: 'vazio' };
  if (extra <= 0) return { kind: 'cabe', kcal, replK };
  const avgDef = weekDef / 7, newDef = weekDef - extra, delay = extra / avgDef;
  const r = { kind: 'excesso', kcal, replK, extra, delay, before: weekDef, after: newDef, fatG: extra / KCAL_PER_KG_FAT * 1000,
    stillDeficit: newDef > 0, recommended: extra <= LIVRE_SEGUIR_ATE, strat };
  if (strat === 'diluir') {
    const per = Math.min(LIVRE_MAX_CORTE_DIA, extra / days), rem = Math.max(0, extra - per * days);
    let acc = 0; const chosen = [];
    for (const c of cuts) if (c[2] > 0 && acc < per - 10) { chosen.push(c); acc += c[2]; }
    Object.assign(r, { days, per, rem, chosen, acc, remDays: rem / avgDef });
  }
  return r;
}
