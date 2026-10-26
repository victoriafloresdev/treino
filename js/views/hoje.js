// Tela Hoje: a linha do tempo do dia (remédio, cardio, refeições, musculação, sono) com o prato-relógio.
import { esc, todayStr, parseDate, fmtLong, fmtN } from '../util.js';
import { planById, program, phaseLabel, cardioPlan, loadAll, doneThisWeek, nextInSequence, avg7 } from '../training.js';
import { app, main, setBar, on, onChange, openSheet, closeSheet, toast } from '../ui.js';
import { cardioForm } from './mais.js';
import { db } from '../db.js';
import { WEEK } from '../plan.js';
import { DAYS, DAY_IDS, OPTS, PROT, CARB, MOLHO, PSY, TARGET_P, FAT_RANGE, FIBER_RANGE } from '../data/nutricao.js';
import { mealOf, included, status, deficit, waterGoalCups, fmt, fmt1, noteOf } from '../nutri.js';
import { SOURCES } from '../daytype.js';
import { dayInfo, chooseOption, chooseBuild, setIncluded, toggleDone, setPsy, setWater, setOverride, setSkip } from '../days.js';
import { habitsOf } from '../habitos.js';
import { plateSVG, updatePlate } from '../ui/plate.js';

const H = { open: new Set(), date: null, info: null, ctx: null };

const hourNow = () => { const n = new Date(); return n.getHours() + n.getMinutes() / 60; };
// texto puro (vai em textContent)
const greet = name => { const h = new Date().getHours(); return `${h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite'}${name ? ', ' + name : ''}.`; };
export function applyDayColor(type) {
  document.documentElement.dataset.day = type;
  // lembra o último tipo para a próxima abertura já começar com a cor certa
  try { localStorage.setItem('dayType', type); } catch (e) { /* sem armazenamento */ }
}

export async function viewHoje() {
  // descarta o desenho se outra tela foi aberta enquanto este esperava o banco
  const tok = app.seq;
  const p = await program();
  if (tok !== app.seq) return;
  setBar('Hoje', phaseLabel(p));
  const today = todayStr();
  if (H.date !== today) { H.open = new Set(); H.date = today; }
  const lastBackup = await db.setting('lastBackup');
  const all = await loadAll();
  const needBackup = all.sets.length > 0 && (!lastBackup || (parseDate(today) - parseDate(lastBackup)) / 864e5 > 14);
  H.ctx = { p, all };

  if (tok !== app.seq) return;
  main.innerHTML = `
    <p class="hero-day" id="hojeGreet">${fmtLong(today)}</p>
    ${!p.start ? `<div class="card"><h2>Quando o programa começa?</h2>
       <p class="muted small">A data define a semana atual, a fase (adaptação nas semanas 1–2) e o cardio do dia.</p>
       <div class="row"><label class="f" style="flex:1">Data de início<input type="date" id="startDate" value="${today}"></label></div>
       <div class="form-actions"><button class="btn solid block" data-act="setStart">Salvar data de início</button></div></div>` : ''}
    ${p.week >= 8 ? `<div class="banner"><b>Semana ${p.week}:</b> hora de revisar a ficha. Veja aderência e progressão na aba Progresso.</div>` : ''}
    ${needBackup ? `<div class="banner"><b>Faça um backup.</b> Seus dados ficam só neste celular. <a href="#mais">Exportar agora</a></div>` : ''}
    <div class="hoje-grid">
      <section class="h-day" id="hojeDay" aria-label="Tipo de dia"></section>
      <section class="h-now" id="hojeNow" aria-label="Agora"></section>
      <section class="h-panel card" aria-label="Resumo do dia">
        <div class="plate-wrap" id="hojePlate">${plateSVG()}</div>
        <div id="hojeSummary"></div>
      </section>
      <section class="h-habits card" id="hojeHabits" aria-label="Hábitos do dia"></section>
      <section class="h-timeline" aria-label="Linha do tempo"><ol class="timeline" id="hojeTimeline"></ol></section>
      <section class="h-peso card" id="hojePeso" aria-label="Peso"></section>
    </div>`;
  await refresh();
}

// Recalcula o dia e atualiza as partes da tela, sem redesenhar o prato (para o donut animar).
async function refresh() {
  const tok = app.seq;
  const today = todayStr();
  const info = await dayInfo(today);
  H.info = info;
  applyDayColor(info.type);
  const body = await db.byIndex('body', 'date', today);
  const weighed = body.find(b => b.weight != null);
  const allBody = H.ctx.all.body.concat(body.filter(b => !H.ctx.all.body.some(x => x.id === b.id)));
  // outra tela foi aberta enquanto o dia carregava
  if (tok !== app.seq || !document.getElementById('hojeTimeline')) return;

  document.getElementById('hojeGreet').textContent = `${fmtLong(today)}. ${greet(info.profile?.nome)}`;
  document.getElementById('hojeDay').innerHTML = dayHTML(info);
  updatePlate(document.getElementById('hojePlate'), info);
  document.getElementById('hojeSummary').innerHTML = summaryHTML(info);
  const hb = habitsOf(info, weighed);
  document.getElementById('hojeHabits').innerHTML = `<div class="spread"><h3>Hábitos do dia</h3><span class="count">${hb.done} de ${hb.total}</span></div>
    <ul class="habits">${hb.list.map(h => `<li class="${h.done ? 'ok' : ''}"><span class="ck" aria-hidden="true">${h.done ? '✓' : ''}</span>${esc(h.label)}<span class="sr">${h.done ? ': feito' : ': ainda não'}</span></li>`).join('')}</ul>`;
  document.getElementById('hojeNow').innerHTML = nowHTML(info);
  document.getElementById('hojeTimeline').innerHTML = info.visible.map(s => slotHTML(s, info)).join('');
  const w7 = avg7(allBody, today);
  document.getElementById('hojePeso').innerHTML = `
    <div class="spread"><h3>Peso</h3><span class="small muted">Média de 7 dias: <b>${w7 ? fmtN(w7) + ' kg' : '–'}</b></span></div>
    ${weighed ? `<p class="small okline">✓ Hoje: ${fmtN(weighed.weight)} kg</p>` :
    `<div class="row" style="margin-top:6px"><label class="f" style="flex:1">Peso de hoje (kg)<input id="wQuick" inputmode="decimal" placeholder="0,0"></label>
       <button class="btn solid" style="align-self:flex-end" data-act="saveWeight">Salvar peso</button></div>
     <p class="small muted" style="margin:8px 0 0">Pese-se de manhã, depois do banheiro e antes de comer. A média semanal é o que importa.</p>`}`;
}

/* ---------- tipo de dia ---------- */
function dayHTML(info) {
  const d = info.d;
  return `<div class="daybox">
    <div class="day-tag"><span class="em" aria-hidden="true">${d.e}</span><span><b>${esc(d.name)}</b><small>${SOURCES[info.source]}</small></span></div>
    <p class="small muted">${esc(d.desc)}</p>
    <button class="btn sm" type="button" data-act="daySheet">Mudar o dia</button>
  </div>`;
}
function daySheet() {
  const info = H.info, p = DAYS[info.plannedType];
  openSheet(`<h2>Mudar o dia</h2>
    <p class="muted small">Pela ficha, hoje é <b>${esc(p.name)}</b>. Registrar um treino ou cardio já ajusta o dia sozinho.</p>
    <fieldset class="chipset" data-on="dayOverride"><legend>Tipo de hoje</legend><div class="segr">
      ${DAY_IDS.map(k => `<label><input type="radio" name="dayOverride" value="${k}" ${info.manual && info.type === k ? 'checked' : ''}><span><span aria-hidden="true">${DAYS[k].e}</span>${esc(DAYS[k].short)}</span></label>`).join('')}
    </div></fieldset>
    ${info.manual ? `<button class="btn block" type="button" data-act="dayAuto">Voltar ao previsto pela ficha</button>` : ''}
    <div class="sheet-actions">
      ${p.musc && !info.reg.musc ? (info.skip?.musc ? `<button class="btn block" type="button" data-act="skip" data-kind="musc" data-v="0">Vou treinar hoje</button>`
        : `<button class="btn block" type="button" data-act="skip" data-kind="musc" data-v="1">Hoje não vou treinar</button>`) : ''}
      ${p.cardio && !info.reg.cardio ? (info.skip?.cardio ? `<button class="btn block" type="button" data-act="skip" data-kind="cardio" data-v="0">Vou fazer o cardio</button>`
        : `<button class="btn block" type="button" data-act="skip" data-kind="cardio" data-v="1">Pular cardio de hoje</button>`) : ''}
    </div>
    <p class="small muted">A escolha vale só para hoje. O modelo da semana fica em Mais.</p>`);
}

/* ---------- resumo ---------- */
function bar(label, color, val, max, right, goal) {
  const pct = Math.min(100, val / max * 100);
  const g = goal == null ? '' : Array.isArray(goal)
    ? `<i class="band" style="left:${goal[0] / max * 100}%;width:${(goal[1] - goal[0]) / max * 100}%"></i>`
    : `<i class="goal" style="left:${Math.min(100, goal / max * 100)}%"></i>`;
  return `<div class="mbar"><div class="bl"><span><i class="sw" style="background:${color}"></i>${label}</span><span>${right}</span></div>
    <div class="track" role="img" aria-label="${label}: ${right}"><div class="fill" style="width:${pct}%;background:${color}"></div>${g}</div></div>`;
}
function summaryHTML(info) {
  const { d, planned: t, eaten } = info;
  const s = status(t[0], d), df = deficit(t[0], d);
  const kc = t[0] || 1, goal = waterGoalCups(d);
  return `
    <div class="status ${s.on ? 'on' : ''}" role="status">${s.on ? '✓ ' : ''}${s.text} <span class="muted">(planejado)</span></div>
    <div class="kpis k3">
      <div class="kpi"><div class="v">${fmt(eaten[0])}</div><div class="l">kcal feitas de ${fmt(d.target)}</div></div>
      <div class="kpi"><div class="v">~${fmt(d.burn)}</div><div class="l">gasto estimado</div></div>
      <div class="kpi"><div class="v">~${fmt(df.def)}</div><div class="l">déficit estimado (${df.pct}%)</div></div>
    </div>
    <p class="small muted est">Estimativas com margem de cerca de ±200 kcal. Não some as calorias do relógio à meta.</p>
    <div class="mbars">
      ${bar('Proteína', 'var(--p)', t[1], 160, `${fmt(t[1])} / ${TARGET_P} g`, TARGET_P)}
      ${bar('Carboidrato', 'var(--c)', t[2], 230, `${fmt(t[2])} g (${Math.round(t[2] * 4 / kc * 100)}%)`)}
      ${bar('Gordura', 'var(--g)', t[3], 75, `${fmt(t[3])} g (meta ${FAT_RANGE.join('–')})`, FAT_RANGE)}
      ${bar('Fibra', 'var(--f)', t[4], 35, `${fmt(t[4])} / ${FIBER_RANGE.join('–')} g`, FIBER_RANGE)}
    </div>
    <p class="small muted">Feito até agora: ${fmt(eaten[0])} kcal e ${fmt(eaten[1])} g de proteína · ${info.doneCount} de ${info.mealCount} refeições.</p>
    <div class="switch-row"><span>${esc(PSY.name)}</span>
      <button class="switch" type="button" role="switch" aria-checked="${!!info.st.psy}" data-act="psy" aria-label="Incluir psyllium"></button></div>
    <div class="water">
      <div class="spread"><div><h3>Água de hoje</h3><span class="small muted">${info.water} de ${goal} copos de 250 ml (${fmt1(info.water * 0.25)} de ${fmt1(d.water)} L)</span></div>
        <div class="stepper"><button class="icon-btn" type="button" data-act="water" data-v="-1" aria-label="Tirar um copo">−</button>
          <button class="icon-btn" type="button" data-act="water" data-v="1" aria-label="Adicionar um copo de 250 ml">+</button></div></div>
      <div class="drops" aria-hidden="true">${Array.from({ length: Math.max(goal, info.water) }, (_, i) => `<i class="${i < info.water ? 'on' : ''}"></i>`).join('')}</div>
    </div>`;
}

/* ---------- agora ---------- */
function workoutToday() {
  const { all, p } = H.ctx;
  const dow = new Date().getDay();
  const done = doneThisWeek(all);
  const wk = WEEK.find(w => w.dow === dow);
  const todayPlan = wk.plan ? planById(wk.plan) : null;
  const plan = todayPlan && !done[todayPlan.id] ? todayPlan : nextInSequence(done);
  const sess = plan && all.sessions.find(s => s.date === todayStr() && s.planId === plan.id && (all.setsBySession[s.id] || []).length);
  return { plan, started: !!sess, phase: p.phase };
}
function nowHTML(info) {
  const now = hourNow();
  const items = info.visible.filter(s => s.kind !== 'marker' || s.id === 'remedio');
  const pending = s => {
    if (s.kind === 'meal') return included(s, info.st) && !info.done[s.id] && !(s.id === 'preCardio' && mealOf(s.id, info.d, info.st).m[0] === 0);
    if (s.id === 'cardio') return !info.reg.cardio;
    if (s.id === 'musc') return !info.reg.musc;
    return false;
  };
  const h = s => (s.id === 'remedio' ? info.profile.remedio.h : s.h(info.d));
  // próximo item pendente a partir de 1 h atrás; se não houver, o primeiro pendente do dia
  const next = items.find(s => pending(s) && h(s) >= now - 1) || items.find(pending);
  if (!next) return `<div class="now done"><span class="k">Agora</span><h2>Dia completo</h2><p>Tudo marcado. Bom descanso.</p></div>`;
  const time = next.time ? next.time(info.d) : '';
  if (next.kind === 'meal') {
    const mm = mealOf(next.id, info.d, info.st);
    return `<div class="now"><span class="k">${time === 'livre' ? 'Quando quiser' : `Próximo · ${time}`}</span>
      <h2><span aria-hidden="true">${mm.e}</span> ${esc(next.title)}</h2>
      <p>${esc(mm.name || [mm.prot.name, mm.carb.name].join(' + '))} · ${fmt(mm.m[0])} kcal · ${fmt(mm.m[1])} g de proteína</p>
      <div class="row"><button class="btn solid" type="button" data-act="mealDone" data-slot="${next.id}">Marcar como feito</button>
        <button class="btn" type="button" data-act="openMeal" data-slot="${next.id}">Ver opções</button></div></div>`;
  }
  if (next.id === 'cardio') {
    return `<div class="now"><span class="k">Próximo · ${time}</span><h2><span aria-hidden="true">🏃‍♀️</span> Cardio</h2>
      <p>${esc(cardioPlan(Math.max(H.ctx.p.week, 1), new Date().getDay()))}</p>
      <div class="row"><button class="btn solid" type="button" data-act="cardioForm">Registrar cardio</button></div></div>`;
  }
  const w = workoutToday();
  return `<div class="now"><span class="k">Próximo · ${time}</span><h2><span aria-hidden="true">🏋️‍♀️</span> ${w.plan ? esc(w.plan.name) : 'Musculação'}</h2>
    ${w.plan ? `<p>${esc(w.plan.focus)} · ${w.plan.items.length} exercícios · ${w.plan.time[w.phase]}</p>
    <div class="row"><a class="btn solid" href="#treino/${w.plan.id}">${w.started ? 'Continuar treino' : 'Começar treino'}</a></div>` : '<p>Os quatro treinos da semana estão feitos.</p>'}</div>`;
}

/* ---------- linha do tempo ---------- */
function slotHTML(s, info) {
  const d = info.d;
  if (s.id === 'remedio') {
    const r = info.profile.remedio;
    return `<li class="tl marker"><div class="time">${esc(r.hora || '')}</div><div class="marker-box"><span class="em" aria-hidden="true">${r.e || '💊'}</span>
      <div><b>${esc(r.rotulo)}</b><br>${esc(r.sub || '')}</div></div></li>`;
  }
  if (s.kind === 'marker') return `<li class="tl marker"><div class="time">${s.time(d)}</div><div class="marker-box"><span class="em" aria-hidden="true">${s.e}</span><div><b>${s.label}</b><br>${s.sub}</div></div></li>`;
  if (s.id === 'cardio') {
    const c = H.ctx.all.cardio.filter(x => x.date === info.date);
    return `<li class="tl activity"><div class="time">${s.time(d)}</div><div class="marker-box"><span class="em" aria-hidden="true">${s.e}</span>
      <div><b>Cardio</b><br>${esc(cardioPlan(Math.max(H.ctx.p.week, 1), new Date().getDay()))}
      ${info.reg.cardio ? `<p class="okline">✓ Registrado${c.length ? ': ' + c.map(x => `${x.minutes} min de ${esc(x.type)}`).join(', ') : ''}</p>`
        : `<div class="row" style="margin-top:8px"><button class="btn sm" type="button" data-act="cardioForm">Registrar cardio</button></div>`}</div></div></li>`;
  }
  if (s.id === 'musc') {
    const w = workoutToday();
    return `<li class="tl activity"><div class="time">${s.time(d)}</div><div class="marker-box"><span class="em" aria-hidden="true">${s.e}</span>
      <div><b>Musculação${w.plan && !info.reg.musc ? ': ' + esc(w.plan.name) : ''}</b><br>${esc(s.sub)}
      ${info.reg.musc ? `<p class="okline">✓ Treino registrado</p>` : w.plan ? `<div class="row" style="margin-top:8px"><a class="btn sm" href="#treino/${w.plan.id}">${w.started ? 'Continuar treino' : 'Começar treino'}</a></div>` : ''}</div></div></li>`;
  }
  return `<li class="tl"><div class="time">${s.time(d)}</div>${mealCard(s, info)}</li>`;
}
function chips(name, on, list, sel, extra = '', legend = 'Opções') {
  return `<fieldset class="chipset" data-on="${on}" ${extra}><legend>${legend}</legend><div class="opts scroll-x">${list.map(o =>
    `<label class="chip"><input type="radio" name="${name}" value="${o.id}" ${o.id === sel ? 'checked' : ''}><span><span aria-hidden="true">${o.e}</span>${esc(o.name)}${o.tag ? ` <i class="tag">${o.tag}</i>` : ''}</span></label>`).join('')}</div></fieldset>`;
}
function mealCard(s, info) {
  const { d, st, profile } = info;
  const inc = included(s, st), mm = mealOf(s.id, d, st), done = !!info.done[s.id];
  const open = H.open.has(s.id);
  const m = mm.m, kc = (m[1] * 4 + m[2] * 4 + m[3] * 9) || 1;
  const isBuilder = s.id === 'almoco' || (s.id === 'jantar' && mm.builder);
  const note = noteOf(mm, profile);
  return `<details class="meal ${inc ? '' : 'is-off'} ${done ? 'is-done' : ''}" id="meal-${s.id}" ${open ? 'open' : ''} data-slot="${s.id}">
    <summary><span class="disc" aria-hidden="true">${mm.e}</span>
      <span class="meal-t"><b>${esc(s.title)}</b>${s.sub ? `<small>${esc(s.sub)}</small>` : ''}</span>
      <span class="meal-k">${done ? '<span class="donechip">✓ feito</span>' : ''}<b>${fmt(inc ? m[0] : 0)}</b><small>kcal</small></span></summary>
    <div class="meal-in">
      ${s.optional ? `<div class="switch-row"><span>${inc ? 'Incluído no dia' : 'Fora do dia de hoje'}</span>
        <button class="switch" type="button" role="switch" aria-checked="${inc}" data-act="mealInclude" data-slot="${s.id}" aria-label="Incluir ${esc(s.title.toLowerCase())}"></button></div>` : ''}
      ${inc ? `
      ${s.id === 'almoco' ? '' : chips(`opt-${s.id}`, 'mealOpt', OPTS[s.id], OPTS[s.id].find(o => o.id === st.sel[s.id])?.id || OPTS[s.id][0].id, `data-slot="${s.id}"`)}
      ${isBuilder ? ['prot', 'carb', 'molho'].map(k => chips(`${s.id}-${k}`, 'mealBuild', { prot: PROT, carb: CARB, molho: MOLHO }[k], st.build[s.id][k],
        `data-meal="${s.id}" data-key="${k}"`, { prot: 'Proteína', carb: 'Carboidrato', molho: 'Molho' }[k])).join('') : ''}
      <ul class="items">${mm.items.map(it => `<li><span>${esc(it[0])}</span><span class="q">${esc(it[1])}</span></li>`).join('')}</ul>
      ${note ? `<p class="note">${esc(note)}</p>` : ''}
      <div class="stack" aria-hidden="true"><i style="width:${m[1] * 4 / kc * 100}%;background:var(--p)"></i><i style="width:${m[2] * 4 / kc * 100}%;background:var(--c)"></i><i style="width:${m[3] * 9 / kc * 100}%;background:var(--g)"></i></div>
      <div class="macro-strip">
        <span><i class="sw" style="background:var(--p)"></i>Proteína <b>${fmt(m[1])} g</b></span>
        <span><i class="sw" style="background:var(--c)"></i>Carbo <b>${fmt(m[2])} g</b></span>
        <span><i class="sw" style="background:var(--g)"></i>Gordura <b>${fmt(m[3])} g</b></span>
        <span><i class="sw" style="background:var(--f)"></i>Fibra <b>${fmt(m[4])} g</b></span>
      </div>
      <button class="btn ${done ? '' : 'solid'} block done-btn" type="button" data-act="mealDone" data-slot="${s.id}" aria-pressed="${done}">${done ? '✓ Feito (desfazer)' : 'Marcar como feito'}</button>` : ''}
    </div></details>`;
}

/* ---------- ações ---------- */
// lembra quais cards estão abertos para não fechá-los ao atualizar
document.addEventListener('toggle', e => {
  const el = e.target;
  if (el.matches?.('details.meal')) el.open ? H.open.add(el.dataset.slot) : H.open.delete(el.dataset.slot);
}, true);

on({
  daySheet,
  async dayAuto() { await setOverride(todayStr(), null); closeSheet(); await refresh(); },
  async skip(el) { await setSkip(todayStr(), el.dataset.kind, el.dataset.v === '1'); closeSheet(); await refresh(); toast(el.dataset.v === '1' ? 'Dia ajustado.' : 'Desfeito.'); },
  async psy() { await setPsy(todayStr(), !H.info.st.psy); await refresh(); },
  async water(el) { await setWater(todayStr(), H.info.water + Number(el.dataset.v)); await refresh(); },
  async mealInclude(el) { const s = H.info.visible.find(x => x.id === el.dataset.slot); await setIncluded(todayStr(), s.id, !included(s, H.info.st)); await refresh(); },
  async mealDone(el) {
    const now = await toggleDone(todayStr(), el.dataset.slot);
    if (now) H.open.delete(el.dataset.slot);
    await refresh();
    toast(now ? 'Refeição marcada como feita.' : 'Desmarcada.');
  },
  openMeal(el) { H.open.add(el.dataset.slot); const c = document.getElementById('meal-' + el.dataset.slot); if (c) { c.open = true; c.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }
});
onChange({
  async mealOpt(el, e) { await chooseOption(todayStr(), el.dataset.slot, e.target.value); await refresh(); },
  async mealBuild(el, e) { await chooseBuild(todayStr(), el.dataset.meal, el.dataset.key, e.target.value); await refresh(); },
  async dayOverride(el, e) { await setOverride(todayStr(), e.target.value); closeSheet(); await refresh(); toast('Tipo de hoje alterado.'); }
});
export { refresh as refreshHoje };
