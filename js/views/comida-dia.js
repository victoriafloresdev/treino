// Comida › Dia: o plano alimentar completo do dia, para usar refeição por refeição.
import { esc } from '../util.js';
import { app, setBar, on, onChange, openSheet, closeSheet, toast, refreshView } from '../ui.js';
import { OPTS, PROT, CARB, MOLHO, PSY, TARGET_P, FAT_RANGE, FIBER_RANGE } from '../data/nutricao.js';
import { mealOf, included, status, deficit, waterGoalCups, fmt, fmt1, noteOf } from '../nutri.js';
import { dayInfo, chooseOption, chooseBuild, setIncluded, toggleDone, setPsy, setWater } from '../days.js';
import { nextMeal } from '../proximo.js';
import { plateSVG, updatePlate } from '../ui/plate.js';
import { icon } from '../ui/icons.js';
import { dayTagHTML, applyDayColor } from './dia.js';
import { viewDate, isPast, dateNavHTML } from '../ui/dia-ativo.js';

const D = { open: new Set(), date: null, info: null, resumo: false };
const hourNow = () => { const n = new Date(); return n.getHours() + n.getMinutes() / 60; };

export async function renderDia(box) {
  const today = viewDate();
  if (D.date !== today) { D.open = new Set(); D.date = today; D.auto = true; }
  box.innerHTML = `
    ${dateNavHTML()}
    <section id="diaDay" aria-label="Tipo de dia"></section>
    <section class="card dia-panel" aria-label="Resumo do dia">
      <div id="diaQuick"></div>
      <details class="dia-more" id="diaMore" ${D.resumo ? 'open' : ''}><summary>Relógio do dia, macros e psyllium ${icon('caret-down')}</summary>
        <div class="plate-wrap" id="diaPlate">${plateSVG()}</div>
        <div id="diaSummary"></div>
      </details>
    </section>
    <h2 class="section-title">Refeições</h2>
    <ol class="meals" id="diaMeals"></ol>`;
  document.getElementById('diaMore').addEventListener('toggle', e => { D.resumo = e.target.open; });
  app.refresh = refreshDia;
  await refreshDia();
}

// Atualiza no lugar (o donut anima entre os valores).
export async function refreshDia() {
  const tok = app.seq;
  const info = await dayInfo(viewDate());
  if (tok !== app.seq || !document.getElementById('diaMeals')) return;
  D.info = info;
  applyDayColor(info.type);
  // abre a próxima refeição na primeira vez do dia
  if (D.auto) { const n = nextMeal(info, isPast() ? 0 : hourNow()); if (n?.slot) D.open.add(n.slot.id); D.auto = false; }
  setBar('Comida', `<span class="num">${fmt(info.eaten[0])}</span> de ${fmt(info.d.target)} kcal`);
  document.getElementById('diaDay').innerHTML = dayTagHTML(info);
  updatePlate(document.getElementById('diaPlate'), info);
  document.getElementById('diaQuick').innerHTML = quickHTML(info);
  document.getElementById('diaSummary').innerHTML = summaryHTML(info);
  document.getElementById('diaMeals').innerHTML = info.visible.map(s => slotHTML(s, info)).join('');
  if (D.scrollTo) { document.getElementById('meal-' + D.scrollTo)?.scrollIntoView({ block: 'start' }); D.scrollTo = null; }
}

/* ---------- resumo ---------- */
function bar(label, color, val, max, right, goal) {
  const pct = Math.min(100, val / max * 100);
  const g = goal == null ? '' : Array.isArray(goal)
    ? `<i class="band" style="left:${goal[0] / max * 100}%;width:${(goal[1] - goal[0]) / max * 100}%"></i>`
    : `<i class="goal" style="left:${Math.min(100, goal / max * 100)}%"></i>`;
  return `<div class="mbar"><div class="bl"><span><i class="sw" style="background:${color}"></i>${label}</span><span class="num">${right}</span></div>
    <div class="track" role="img" aria-label="${label}: ${right}"><div class="fill" style="width:${pct}%;background:${color}"></div>${g}</div></div>`;
}
// sempre à vista: o que foi comido, proteína e água
function quickHTML(info) {
  const { d, planned: t, eaten } = info, goal = waterGoalCups(d);
  return `<div class="quick">
      <div class="q-k"><span><b class="num">${fmt(eaten[0])}</b> de ${fmt(t[0])} kcal planejadas</span><span class="muted">meta ${fmt(d.target)}</span></div>
      <div class="track" role="img" aria-label="Comido: ${fmt(eaten[0])} de ${fmt(t[0])} kcal"><div class="fill" style="width:${Math.min(100, eaten[0] / (t[0] || 1) * 100)}%;background:var(--day)"></div></div>
      <div class="q-k"><span>Proteína <b class="num">${fmt(eaten[1])}</b> de ${TARGET_P} g</span></div>
      <div class="track" role="img" aria-label="Proteína: ${fmt(eaten[1])} de ${TARGET_P} g"><div class="fill" style="width:${Math.min(100, eaten[1] / TARGET_P * 100)}%;background:var(--p)"></div></div>
    </div>
    <div class="water">
      <div class="water-t"><b>Água</b><span class="small muted num">${info.water} de ${goal} copos · ${fmt1(info.water * 0.25)} de ${fmt1(d.water)} L</span></div>
      <div class="stepper"><button class="icon-btn" type="button" data-act="water" data-v="-1" aria-label="Tirar um copo">${icon('minus')}</button>
        <button class="icon-btn solid" type="button" data-act="water" data-v="1" aria-label="Adicionar um copo de 250 ml">${icon('plus')}</button></div>
    </div>`;
}
function summaryHTML(info) {
  const { d, planned: t, eaten } = info;
  const s = status(t[0], d), df = deficit(t[0], d);
  const kc = t[0] || 1;
  return `
    <p class="status ${s.on ? 'on' : ''}" role="status">${s.on ? icon('check-circle-fill') : ''}${s.text} <span class="muted">${isPast() ? 'no plano desse dia' : 'no plano de hoje'}</span></p>
    <dl class="facts">
      <div><dt>Feito</dt><dd class="num">${fmt(eaten[0])} <small>kcal</small></dd></div>
      <div><dt>Gasto estimado</dt><dd class="num">~${fmt(d.burn)} <small>kcal</small></dd></div>
      <div><dt>Déficit estimado</dt><dd class="num">~${fmt(df.def)} <small>(${df.pct}%)</small></dd></div>
    </dl>
    <div class="mbars">
      ${bar('Proteína', 'var(--p)', t[1], 160, `${fmt(t[1])} / ${TARGET_P} g`, TARGET_P)}
      ${bar('Carboidrato', 'var(--c)', t[2], 230, `${fmt(t[2])} g · ${Math.round(t[2] * 4 / kc * 100)}%`)}
      ${bar('Gordura', 'var(--g)', t[3], 75, `${fmt(t[3])} g · meta ${FAT_RANGE.join('–')}`, FAT_RANGE)}
      ${bar('Fibra', 'var(--f)', t[4], 35, `${fmt(t[4])} / ${FIBER_RANGE.join('–')} g`, FIBER_RANGE)}
    </div>
    <p class="small muted">Estimativas, com margem de cerca de ±200 kcal. As calorias do relógio não entram na meta.</p>
    <div class="switch-row"><span>${esc(PSY.name)}</span>
      <button class="switch" type="button" role="switch" aria-checked="${!!info.st.psy}" data-act="psy" aria-label="Incluir psyllium"></button></div>
`;
}

/* ---------- refeições ---------- */
const MARK_ICON = { remedio: 'pill', cardio: 'sneaker-move', musc: 'barbell', sono: 'moon' };
function slotHTML(s, info) {
  const d = info.d;
  if (s.id === 'remedio') {
    const r = info.profile.remedio;
    return `<li class="mark"><span class="time num">${esc(r.hora || '')}</span>${icon('pill')}<span><b>${esc(r.rotulo)}</b> ${esc(r.sub || '')}</span></li>`;
  }
  if (s.kind !== 'meal') {
    const label = s.id === 'musc' ? 'Musculação' : s.id === 'cardio' ? 'Cardio' : s.label;
    return `<li class="mark"><span class="time num">${s.time(d)}</span>${icon(MARK_ICON[s.id] || 'clock')}<span><b>${esc(label)}</b>${s.id === 'sono' ? ' ' + esc(s.sub) : ''}</span></li>`;
  }
  return mealHTML(s, info);
}
function optName(s, mm) {
  if (mm.builder) return `${mm.prot.name} + ${mm.carb.name}`;
  return mm.name;
}
function chips(name, on, list, sel, extra, legend) {
  return `<fieldset class="chipset" data-on="${on}" ${extra}><legend>${legend}</legend><div class="opts scroll-x">${list.map(o =>
    `<label class="chip"><input type="radio" name="${name}" value="${o.id}" ${o.id === sel ? 'checked' : ''}><span><span aria-hidden="true">${o.e}</span>${esc(o.name)}</span></label>`).join('')}</div></fieldset>`;
}
function mealHTML(s, info) {
  const { d, st, profile } = info;
  const inc = included(s, st), mm = mealOf(s.id, d, st), done = !!info.done[s.id];
  const open = D.open.has(s.id);
  const m = mm.m, kc = (m[1] * 4 + m[2] * 4 + m[3] * 9) || 1;
  const isBuilder = s.id === 'almoco' || (s.id === 'jantar' && mm.builder);
  const note = noteOf(mm, profile);
  const time = s.time(d);
  return `<li class="meal ${inc ? '' : 'is-off'} ${done ? 'is-done' : ''} ${open ? 'open' : ''}" id="meal-${s.id}">
    <div class="meal-h">
      ${inc ? `<button class="meal-check" type="button" data-act="mealDone" data-slot="${s.id}" aria-pressed="${done}" aria-label="${done ? 'Desmarcar' : 'Marcar como feito'}: ${esc(s.title)}">${icon(done ? 'check-circle-fill' : 'circle')}</button>`
        : `<span class="meal-check off" aria-hidden="true">${icon('circle')}</span>`}
      <button class="meal-head" type="button" data-act="mealToggle" data-slot="${s.id}" aria-expanded="${open}" aria-controls="mb-${s.id}">
        <span class="disc" aria-hidden="true">${mm.e}</span>
        <span class="meal-t"><b>${esc(s.title)}</b><small>${time === 'livre' ? 'quando quiser' : time} · ${inc ? esc(optName(s, mm)) : 'fora do dia'}</small></span>
        <span class="meal-k"><b class="num">${fmt(inc ? m[0] : 0)}</b><small>kcal</small></span>
        <span class="chev" aria-hidden="true">${icon('caret-down')}</span>
      </button>
    </div>
    <div class="meal-in" id="mb-${s.id}" ${open ? '' : 'hidden'}>
      ${s.optional ? `<div class="switch-row"><span>${inc ? 'Incluído no dia' : 'Fora do dia de hoje'}</span>
        <button class="switch" type="button" role="switch" aria-checked="${inc}" data-act="mealInclude" data-slot="${s.id}" aria-label="Incluir ${esc(s.title.toLowerCase())}"></button></div>` : ''}
      ${inc ? `
      ${s.id === 'almoco' ? '' : `<button class="pick-btn" type="button" data-act="mealPick" data-slot="${s.id}">
        <span><small>Opção</small><b>${esc(mm.builder ? 'Prato montado' : mm.name)}</b></span><span class="pick-go">Trocar</span></button>`}
      ${isBuilder ? ['prot', 'carb', 'molho'].map(k => chips(`${s.id}-${k}`, 'mealBuild', { prot: PROT, carb: CARB, molho: MOLHO }[k], st.build[s.id][k],
        `data-meal="${s.id}" data-key="${k}"`, { prot: 'Proteína', carb: 'Carboidrato', molho: 'Molho' }[k])).join('') : ''}
      <ul class="items">${mm.items.map(it => `<li><span>${esc(it[0])}</span><span class="q">${esc(it[1])}</span></li>`).join('')}</ul>
      ${note ? `<p class="note">${esc(note)}</p>` : ''}
      <div class="stack" aria-hidden="true"><i style="width:${m[1] * 4 / kc * 100}%;background:var(--p)"></i><i style="width:${m[2] * 4 / kc * 100}%;background:var(--c)"></i><i style="width:${m[3] * 9 / kc * 100}%;background:var(--g)"></i></div>
      <div class="macro-strip">
        <span><i class="sw" style="background:var(--p)"></i>Proteína <b class="num">${fmt(m[1])} g</b></span>
        <span><i class="sw" style="background:var(--c)"></i>Carbo <b class="num">${fmt(m[2])} g</b></span>
        <span><i class="sw" style="background:var(--g)"></i>Gordura <b class="num">${fmt(m[3])} g</b></span>
        <span><i class="sw" style="background:var(--f)"></i>Fibra <b class="num">${fmt(m[4])} g</b></span>
      </div>
      <button class="btn ${done ? '' : 'solid'} block" type="button" data-act="mealDone" data-slot="${s.id}" aria-pressed="${done}">${done ? 'Desmarcar' : 'Marcar como feito'}</button>` : ''}
    </div></li>`;
}

// sheet com as opções da refeição: nome, kcal e proteína
function pickSheet(slot) {
  const info = D.info, s = info.visible.find(x => x.id === slot);
  const cur = OPTS[slot].find(o => o.id === info.st.sel[slot])?.id || OPTS[slot][0].id;
  openSheet(`<h2>${esc(s.title)}</h2>
    <fieldset class="pick" data-on="mealPickOpt" data-slot="${slot}"><legend class="sr">Opções de ${esc(s.title.toLowerCase())}</legend>
    ${OPTS[slot].map(o => {
      const mm = o.builder ? mealOf('jantar', info.d, { ...info.st, sel: { ...info.st.sel, jantar: 'prato' } }) : o;
      return `<label class="pick-row"><input type="radio" name="pick-${slot}" value="${o.id}" ${o.id === cur ? 'checked' : ''}>
        <span class="disc" aria-hidden="true">${o.e}</span>
        <span class="pick-t"><b>${esc(o.name)}${o.tag ? `<span class="pick-tag">${o.tag}</span>` : ''}</b><small>${o.builder ? 'Proteína, carboidrato e molho à sua escolha' : esc(o.items.map(i => i[0]).join(', '))}</small></span>
        <span class="pick-k"><b class="num">${fmt(mm.m[0])}</b> kcal<br><span class="num">${fmt(mm.m[1])}</span> g prot.</span></label>`;
    }).join('')}</fieldset>`);
}

/* ---------- ações (refreshView atualiza a tela em que você está) ---------- */
on({
  async psy() { const info = await dayInfo(viewDate()); await setPsy(viewDate(), !info.st.psy); await refreshView(); },
  async water(el) { const info = await dayInfo(viewDate()); await setWater(viewDate(), info.water + Number(el.dataset.v)); await refreshView(); },
  async mealInclude(el) {
    const info = await dayInfo(viewDate()), s = info.visible.find(x => x.id === el.dataset.slot);
    await setIncluded(viewDate(), s.id, !included(s, info.st)); await refreshView();
  },
  async mealDone(el) {
    const now = await toggleDone(viewDate(), el.dataset.slot);
    if (now) D.open.delete(el.dataset.slot);
    await refreshView();
    toast(now ? 'Refeição marcada como feita.' : 'Desmarcada.');
  },
  mealToggle(el) {
    const id = el.dataset.slot, li = document.getElementById('meal-' + id), body = document.getElementById('mb-' + id);
    const open = !D.open.has(id);
    open ? D.open.add(id) : D.open.delete(id);
    li.classList.toggle('open', open); body.hidden = !open; el.setAttribute('aria-expanded', open);
  },
  mealPick(el) { pickSheet(el.dataset.slot); },
  // da tela Hoje: abre Comida › Dia já na refeição
  openMeal(el) {
    if (D.date !== viewDate()) { D.open = new Set(); D.date = viewDate(); }
    D.auto = false; D.open.add(el.dataset.slot); D.scrollTo = el.dataset.slot;
    location.hash = 'comida/dia';
  }
});
onChange({
  async mealPickOpt(el, e) { await chooseOption(viewDate(), el.dataset.slot, e.target.value); closeSheet(); await refreshView(); },
  async mealBuild(el, e) { await chooseBuild(viewDate(), el.dataset.meal, el.dataset.key, e.target.value); await refreshView(); }
});
