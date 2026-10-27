// Aba Comida: Semana, Trocas, Refeição livre e Dicas (porte do Plano da Vic).
import { esc, todayStr, fmtShort, addDays, weekStart, isoWeek } from '../util.js';
import { app, main, setBar, on, onChange, subTabs } from '../ui.js';
import { db } from '../db.js';
import { DAYS, DAY_IDS, OPTS, CATS, CALC, PRESETS, TROCA_REGRAS, DICAS, RODAPE, LIVRE_CALLOUT, LIVRE_DEFAULT_KCAL } from '../data/nutricao.js';
import { fmt, fmt1, mealOf, getOpt, weekNumbers, weekNote, weightTrend, calcTroca, calcGoalK, refeicaoLivre, txt } from '../nutri.js';
import { WD, SOURCES } from '../daytype.js';
import { weekInfo, dayInfo, setOverride } from '../days.js';
import { applyDayColor, DAY_ICON } from './dia.js';
import { icon } from '../ui/icons.js';
// ícone de cada dica (o emoji fica só na comida)
const TIP_ICON = { agua: 'drop', remedio: 'pill', cardio: 'sneaker-move', pretreino: 'barbell', fibra: 'leaf', temperos: 'bowl-food', molhos: 'bowl-food', receitas: 'book-open', fora: 'fork-knife', funcionando: 'chart-line-up', medico: 'heartbeat' };
import { renderDia } from './comida-dia.js';

const TABS = [['dia', 'Dia'], ['semana', 'Semana'], ['trocas', 'Trocas'], ['livre', 'Livre'], ['dicas', 'Dicas']];
const C = { weekOf: null, cat: 'prot', calc: 'protA', k: '', p: '', lv: { repl: 'jantar', strat: 'seguir', days: 3, kcal: LIVRE_DEFAULT_KCAL, preset: null } };

export async function viewComida(sub) {
  // descarta o desenho se outra tela foi aberta enquanto este esperava o banco
  const tok = app.seq;
  if (!TABS.some(t => t[0] === sub)) sub = 'dia';
  if (tok !== app.seq) return;
  setBar('Comida', '');
  const today = await dayInfo(todayStr());
  applyDayColor(today.type);
  if (tok !== app.seq) return;
  main.innerHTML = subTabs('comida', TABS, sub) + `<div id="comidaBody"></div>`;
  if (sub === 'dia') await renderDia(document.getElementById('comidaBody'));
  if (sub === 'semana') await renderSemana();
  if (sub === 'trocas') renderTrocas(today);
  if (sub === 'livre') await renderLivre();
  if (sub === 'dicas') renderDicas(today.profile);
}

/* ---------- Semana ---------- */
async function renderSemana() {
  const tok = app.seq;
  const today = todayStr();
  const ws = C.weekOf || weekStart(today), thisWeek = ws === weekStart(today);
  const days = await weekInfo(ws);
  const w = weekNumbers(days.map(x => ({ type: x.type, kcal: x.planned[0] })));
  const body = (await db.all('body')).filter(b => b.weight != null).sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.updatedAt || 0) - (b.updatedAt || 0)));
  const weights = {}; body.forEach(b => { weights[b.date] = b.weight; });
  const tr = weightTrend(weights, today);
  const box = document.getElementById('comidaBody');
  if (tok !== app.seq || !box) return;
  box.innerHTML = `
    <div class="datenav">
      <button class="icon-btn" type="button" data-act="weekPrev" aria-label="Semana anterior">${icon('caret-right', 'flip')}</button>
      <div class="datenav-pick"><span><b>${thisWeek ? 'Esta semana' : `${fmtShort(ws)} a ${fmtShort(addDays(ws, 6))}`}</b><small>${thisWeek ? `${fmtShort(ws)} a ${fmtShort(addDays(ws, 6))}` : `semana ${isoWeek(ws).week}`}</small></span></div>
      <button class="icon-btn" type="button" data-act="weekNext" aria-label="Próxima semana">${icon('caret-right')}</button>
    </div>
    ${thisWeek ? '' : '<p class="past-note"><span>Vendo outra semana.</span><button class="linkbtn" type="button" data-act="weekNow">Voltar para esta semana</button></p>'}
    <p class="lead">O tipo de cada dia vem da ficha de treino e muda sozinho quando você registra um treino ou cardio. Toque em outro tipo para trocar só aquela data.</p>
    <div class="legend">${DAY_IDS.map(k => `<span style="color:var(--day-${k})">${icon(DAY_ICON[k])}<span style="color:var(--muted)">${esc(DAYS[k].name)}</span></span>`).join('')}</div>
    <div class="week">${days.map((x, i) => `
      <div class="wk-row ${x.date === today ? 'today' : ''}">
        <div class="wk-d"><b>${WD[i]}</b><small>${x.date === today ? 'hoje' : fmtShort(x.date)}</small></div>
        <fieldset class="wk-opts" data-on="weekOverride" data-date="${x.date}"><legend class="sr">Tipo de ${WD[i]}, ${fmtShort(x.date)}</legend>
          ${DAY_IDS.map(t => `<label style="--wk:var(--day-${t})"><input type="radio" name="wk-${x.date}" value="${t}" ${t === x.type ? 'checked' : ''} aria-label="${esc(DAYS[t].name)}"><span aria-hidden="true">${icon(DAY_ICON[t])}</span></label>`).join('')}
        </fieldset>
        <div class="wk-k"><b>${fmt(x.planned[0])}</b><small>kcal</small></div>
        <div class="wk-src">${SOURCES[x.source]}${x.manual ? ` · <button class="linkbtn" type="button" data-act="weekAuto" data-date="${x.date}">voltar ao previsto</button>` : ''}</div>
      </div>`).join('')}
    </div>
    <div class="callout">${weekNote(w)}</div>
    <div class="kpis">
      <div class="kpi"><div class="v">${fmt(w.avgKcal)}</div><div class="l">kcal por dia, em média</div></div>
      <div class="kpi"><div class="v">~${fmt(w.avgDef)}</div><div class="l">déficit médio por dia</div></div>
      <div class="kpi"><div class="v">${fmt1(w.fatLo)}–${fmt1(w.fatHi)}</div><div class="l">kg de gordura por semana (estimativa)</div></div>
      <div class="kpi"><div class="v">${w.cardio} + ${w.musc}</div><div class="l">cardios e musculações</div></div>
    </div>
    <p class="small muted">Contas com as refeições escolhidas em cada dia. Calorias e gasto são estimativas (cerca de ±200 kcal).</p>
    <div class="card"><h3>Peso da semana</h3>
      <p class="small muted">Pese de manhã, depois do banheiro. Compare médias de 7 dias, nunca um dia com o outro. Registre na tela Hoje.</p>
      ${!tr.w1 ? '<p class="note">Registre pelo menos 3 pesagens nesta semana para a média ficar confiável.</p>' : `
      <div class="kpis">
        <div class="kpi"><div class="v">${fmt1(tr.w1.avg)} kg</div><div class="l">média dos últimos 7 dias (${tr.w1.n} ${tr.w1.n === 1 ? 'pesagem' : 'pesagens'})</div></div>
        <div class="kpi"><div class="v">${tr.ch == null ? '–' : (tr.ch > 0 ? '+' : '') + fmt1(tr.ch) + ' kg'}</div><div class="l">${tr.ch == null ? 'a comparação aparece na próxima semana' : 'vs. semana anterior'}</div></div>
      </div>
      ${tr.msg ? `<p class="note">${tr.msg}</p>` : tr.w1.n < 3 ? '<p class="note">Com pelo menos 3 pesagens na semana, aparece a leitura da tendência.</p>' : ''}`}
    </div>`;
}

/* ---------- Trocas ---------- */
function renderTrocas(today) {
  const tok = app.seq;
  const c = CATS.find(x => x.id === C.cat);
  let rows = c.rows;
  if (!rows) {
    rows = OPTS[c.from].map(o => [o.e, o.name + (o.tag ? ` (${o.tag})` : ''), o.items.map(i => i[0]).join(', '), o.m[0], o.m[1]]);
    if (c.extra) rows = rows.concat(c.extra);
  }
  const calc = CALC.find(x => x.id === C.calc);
  const box = document.getElementById('comidaBody');
  if (tok !== app.seq || !box) return;
  box.innerHTML = `
    <p class="lead">Cada lista mostra porções equivalentes. Trocou um item por outro da mesma lista, o dia continua batendo.</p>
    <fieldset class="chipset" data-on="trocaCat"><legend class="sr">Categoria</legend><div class="opts scroll-x">
      ${CATS.map(x => `<label class="chip"><input type="radio" name="cat" value="${x.id}" ${x.id === C.cat ? 'checked' : ''}><span><span aria-hidden="true">${x.e}</span>${x.name}</span></label>`).join('')}
    </div></fieldset>
    <p class="small muted">${esc(c.hint)}</p>
    <ul class="rows trocas">${rows.map(r => `<li><span class="disc" aria-hidden="true">${r[0]}</span><div><b>${esc(r[1])}</b><span class="small muted">${esc(r[2])}</span></div>
      <div class="kc"><b>${fmt(r[3])}</b> kcal<br><span class="small muted">${fmt(r[4])} g de proteína</span></div></li>`).join('')}</ul>
    <div class="card">
      <h3>Não achou? Calcule a troca</h3>
      <p class="small muted">Pegue o rótulo (ou a tabela TACO) e digite os valores por 100 g. A conta diz quanto usar para caber no lugar do item original.</p>
      <fieldset class="chipset" data-on="trocaCalc"><legend>No lugar de quê?</legend><div class="opts wrap">
        ${CALC.map(x => `<label class="chip"><input type="radio" name="calc" value="${x.id}" ${x.id === C.calc ? 'checked' : ''}><span><span aria-hidden="true">${x.e}</span>${x.name}</span></label>`).join('')}
      </div></fieldset>
      <div class="grid2">
        <label class="f">kcal por 100 g<input id="cK" inputmode="decimal" placeholder="ex.: 150" value="${esc(C.k)}"></label>
        <label class="f">Proteína por 100 g<input id="cP" inputmode="decimal" placeholder="ex.: 20" value="${esc(C.p)}"></label>
      </div>
      ${calc.dinnerFactor ? `<p class="small muted">Hoje (${esc(today.d.name)}): o carboidrato do jantar é ~${calcGoalK(calc, today.d)} kcal.</p>` : ''}
      <div class="calc-out" id="calcOut" aria-live="polite"></div>
      <ul class="rules">${TROCA_REGRAS.map(r => `<li>${r}</li>`).join('')}</ul>
    </div>`;
  const out = () => {
    const n = v => parseFloat(String(v).replace(',', '.'));
    document.getElementById('calcOut').innerHTML = calcTroca(calc, n(C.k), n(C.p), today.d);
  };
  for (const id of ['cK', 'cP']) document.getElementById(id).addEventListener('input', e => { C[id === 'cK' ? 'k' : 'p'] = e.target.value; out(); });
  out();
  C.today = today;
}

/* ---------- Refeição livre ---------- */
async function renderLivre() {
  const tok = app.seq;
  const today = await dayInfo(todayStr());
  const days = await weekInfo(todayStr());
  const w = weekNumbers(days.map(x => ({ type: x.type, kcal: x.planned[0] })));
  const { d, st } = today;
  const replOpts = [['almoco', 'Almoço'], ['jantar', 'Jantar'], ['lanche', 'Lanche'], ['nenhuma', 'Nenhuma, é extra']]
    .map(([id, l]) => [id, l, id === 'nenhuma' ? 0 : mealOf(id, d, st).m[0]]);
  const replK = replOpts.find(o => o[0] === C.lv.repl)[2];
  const cuts = [['🍫', 'Tirar o docinho', getOpt('doce', st).m[0]], ['🍌', 'Pular o pré-treino se não estiver com fome', d.musc ? getOpt('preTreino', st).m[0] : 0],
    ['🍚', 'Jantar com metade do carboidrato', 50], ['🥤', 'Lanche: shake no lugar do bowl', 78], ['🌿', 'Molho só de temperos', 20]];
  const r = refeicaoLivre({ kcal: C.lv.kcal, replK, weekDef: w.def, strat: C.lv.strat, days: C.lv.days, cuts });
  const radio = (name, on, list, sel) => `<fieldset class="chipset" data-on="${on}"><legend>${name}</legend><div class="opts wrap">${list.map(o =>
    `<label class="chip"><input type="radio" name="${on}" value="${o[0]}" ${String(o[0]) === String(sel) ? 'checked' : ''}><span>${o[1]}</span></label>`).join('')}</div></fieldset>`;
  let out = '<h3>Impacto na semana</h3>';
  if (r.kind === 'vazio') out += '<p class="note">Escolha uma estimativa ou digite as calorias.</p>';
  else if (r.kind === 'cabe') out += `<div class="calc-out"><div class="big">Cabe no plano</div>Ela tem ${fmt(r.kcal)} kcal, igual ou menos que ${fmt(r.replK)} kcal da refeição que substitui. É só seguir o resto do dia normalmente.</div>`;
  else {
    out += `<div class="kpis">
      <div class="kpi"><div class="v">+${fmt(r.extra)}</div><div class="l">kcal além da refeição que ela substitui</div></div>
      <div class="kpi"><div class="v">${fmt1(r.delay)} dia${r.delay >= 1.95 ? 's' : ''}</div><div class="l">de déficit que “adia”, na sua média</div></div>
      <div class="kpi"><div class="v">${fmt(r.before)}</div><div class="l">déficit da semana, antes</div></div>
      <div class="kpi"><div class="v">${fmt(r.after)}</div><div class="l">déficit da semana, depois</div></div></div>`;
    out += r.stillDeficit ? `<p class="note">A semana continua em déficit. Em gordura, a diferença é de cerca de ${fmt(r.fatG)} g, menos do que a balança oscila de um dia para o outro.</p>`
      : '<p class="note">Com essa refeição a semana fica perto do equilíbrio. Tudo bem de vez em quando; se for frequente, vale planejar a semana com ela já dentro.</p>';
    if (r.strat === 'seguir') out += `<p>${r.recommended ? '<b>Recomendado para esse tamanho.</b> ' : ''}Volte ao plano na próxima refeição, sem compensar. A diferença se dilui sozinha na semana.</p>`;
    else {
      out += `<div class="calc-out"><div class="big">−${fmt(r.per)} kcal/dia</div>nos próximos ${r.days} dias. Nada de jejum: escolha cortes como estes, que somam ~${fmt(r.acc)} kcal:</div>
        <ul class="cuts">${r.chosen.map(c => `<li><span aria-hidden="true">${c[0]}</span><span>${esc(c[1])} <b>(−${fmt(c[2])})</b></span></li>`).join('')}</ul>`;
      if (r.rem > 0) out += `<p class="note">Limitei a 250 kcal por dia para não afetar treino e fome. Os ${fmt(r.rem)} kcal restantes simplesmente adiam a meta em ~${fmt1(r.remDays)} dia(s), e está tudo bem.</p>`;
    }
  }
  const box = document.getElementById('comidaBody');
  if (tok !== app.seq || !box) return;
  box.innerHTML = `
    <p class="lead">Pizza, aniversário, rodízio: faz parte. Aqui você vê quanto aquilo pesa na semana e escolhe se segue normal ou dilui um pouco nos próximos dias.</p>
    <div class="two-col">
      <div class="card"><h3>O que vai ser?</h3>
        ${radio('Estimativas prontas', 'lvPreset', PRESETS.map((p, i) => [i, `<span aria-hidden="true">${p[0]}</span>${esc(p[1])} <i class="tag">~${fmt(p[2])}</i>`]), C.lv.preset)}
        <label class="f">Calorias estimadas<input id="lvK" inputmode="numeric" value="${C.lv.kcal}"></label>
        ${radio('Ela substitui qual refeição de hoje?', 'lvRepl', replOpts.map(o => [o[0], `${o[1]}${o[2] ? ` <i class="tag">${fmt(o[2])}</i>` : ''}`]), C.lv.repl)}
        ${radio('Como você quer lidar?', 'lvStrat', [['seguir', 'Sigo o plano normal'], ['diluir', 'Diluo nos próximos dias']], C.lv.strat)}
        ${C.lv.strat === 'diluir' ? radio('Diluir em quantos dias?', 'lvDays', [[2, '2 dias'], [3, '3 dias'], [4, '4 dias']], C.lv.days) : ''}
      </div>
      <div><div class="card" aria-live="polite">${out}</div><div class="callout">${LIVRE_CALLOUT}</div></div>
    </div>`;
  document.getElementById('lvK').addEventListener('change', e => { C.lv.kcal = Math.max(0, parseFloat(String(e.target.value).replace(',', '.')) || 0); C.lv.preset = null; renderLivre(); });
}

/* ---------- Dicas ---------- */
function renderDicas(profile) {
  const tok = app.seq;
  const tips = DICAS.map(t => (t.perfil ? profile?.dicas?.[t.perfil] && { id: t.id, ...profile.dicas[t.perfil] } : t)).filter(Boolean);
  const box = document.getElementById('comidaBody');
  if (tok !== app.seq || !box) return;
  box.innerHTML = `
    <p class="lead">Tudo que não cabe numa refeição: água, horários, molhos, receitinhas e como saber se o plano está funcionando.</p>
    <div class="tips">${tips.map(t => `<details class="tip" id="dica-${t.id}"><summary><span class="disc tip-ic" aria-hidden="true">${icon(TIP_ICON[t.id] || 'lightbulb')}</span><span><b>${esc(t.title)}</b><small>${txt(t.small, profile)}</small></span></summary>
      <div class="tip-b">${txt(t.html, profile)}</div></details>`).join('')}</div>
    <p class="small muted foot">${txt(RODAPE, profile)}</p>`;
}

/* ---------- ações ---------- */
on({
  async weekAuto(el) { await setOverride(el.dataset.date, null); await renderSemana(); },
  weekPrev() { C.weekOf = addDays(C.weekOf || weekStart(todayStr()), -7); renderSemana(); },
  weekNext() { C.weekOf = addDays(C.weekOf || weekStart(todayStr()), 7); renderSemana(); },
  weekNow() { C.weekOf = null; renderSemana(); }
});
onChange({
  async weekOverride(el, e) {
    await setOverride(el.dataset.date, e.target.value);
    if (el.dataset.date === todayStr()) applyDayColor(e.target.value);
    await renderSemana();
  },
  trocaCat(el, e) { C.cat = e.target.value; renderTrocas(C.today); },
  trocaCalc(el, e) { C.calc = e.target.value; renderTrocas(C.today); },
  lvPreset(el, e) { C.lv.preset = Number(e.target.value); C.lv.kcal = PRESETS[C.lv.preset][2]; renderLivre(); },
  lvRepl(el, e) { C.lv.repl = e.target.value; renderLivre(); },
  lvStrat(el, e) { C.lv.strat = e.target.value; renderLivre(); },
  lvDays(el, e) { C.lv.days = Number(e.target.value); renderLivre(); }
});
