import { db } from './db.js';
import { PLAN, MUSCLES, WEEK } from './plan.js';
import { bodyMap } from './bodymap.js';

const VERSION = '1.0.0';

/* ================= utilidades ================= */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad2 = n => String(n).padStart(2, '0');
const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return todayStr(d); };
const weekStart = s => { const d = parseDate(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return todayStr(d); };
const fmtShort = s => { const d = parseDate(s); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`; };
const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const cap = s => s[0].toUpperCase() + s.slice(1);
const fmtLong = s => { const d = parseDate(s); return `${cap(DIAS[d.getDay()])}, ${d.getDate()} de ${MESES[d.getMonth()]}`; };
const num = v => { if (v == null || String(v).trim() === '') return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const fmtN = (n, d = 1) => n == null ? '–' : (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('pt-BR');
const e1rm = (kg, reps) => (kg > 0 && reps > 0 && reps <= 15) ? kg * (1 + reps / 30) : null;
const ITEMS = PLAN.flatMap(p => p.items.map(it => ({ ...it, planId: p.id })));
const itemById = id => ITEMS.find(i => i.id === id);
const planById = id => PLAN.find(p => p.id === id);

const EFFORT = { facil: { l: 'Fácil', rir: 4 }, medio: { l: 'Médio', rir: 2.5 }, dificil: { l: 'Difícil', rir: 0.5 } };
const isTimed = it => /s$/.test(it.reps);
function range(it) {
  const m = it.reps.match(/(\d+)–(\d+)/);
  return m ? { lo: +m[1], hi: +m[2] } : { lo: 0, hi: 0 };
}
const rirFor = (it, phase) => (phase === 0 && !/Pare/.test(it.rir)) ? '3–4' : it.rir;

/* ================= programa ================= */
async function program() {
  const start = await db.setting('startDate');
  if (!start) return { start: null, week: 0, phase: 0 };
  const days = Math.round((parseDate(todayStr()) - parseDate(start)) / 864e5);
  if (days < 0) return { start, week: 0, phase: 0, future: true };
  const week = Math.floor(days / 7) + 1;
  return { start, week, phase: week <= 2 ? 0 : 1 };
}
const phaseLabel = p => p.week === 0 ? 'Programa não iniciado' : `Semana ${p.week} · ${p.phase === 0 ? 'adaptação' : 'fase principal'}`;

function cardioPlan(week, dow) {
  if (dow === 0) return 'Descanso completo';
  const run = dow === 3 || dow === 6;
  if (!run) return (dow === 1 || dow === 4) ? 'Caminhada moderada, 25–30 min' : 'Caminhada leve, 25–30 min';
  if (week <= 2) return 'Caminhada rápida com inclinação de 3–6%, cerca de 30 min';
  if (week <= 4) return '5 min caminhando + 7 × (1 min trote leve + 2 min caminhada) + 4 min caminhando';
  if (week <= 6) return '5 min caminhando + 6 × (2 min trote + 2 min caminhada) + 1 min caminhando';
  return '5 min caminhando + 5 × (3 min trote + 1,5 min caminhada) + 2,5 min caminhando';
}

/* ================= dados derivados ================= */
async function loadAll() {
  const [sessions, sets, body, comps, cardio] = await Promise.all(['sessions', 'sets', 'body', 'comps', 'cardio'].map(s => db.all(s)));
  const setsBySession = {};
  sets.forEach(s => (setsBySession[s.sessionId] = setsBySession[s.sessionId] || []).push(s));
  const realSessions = sessions.filter(s => (setsBySession[s.id] || []).length > 0);
  return { sessions, realSessions, sets, setsBySession, body, comps, cardio };
}
function doneThisWeek(all) {
  const ws = weekStart(todayStr());
  const done = {};
  all.realSessions.filter(s => weekStart(s.date) === ws).forEach(s => { done[s.planId] = s; });
  return done;
}
function nextInSequence(done) {
  return PLAN.find(p => !done[p.id]) || null;
}
async function lastSetsFor(exId, excludeSessionId) {
  const rows = (await db.byIndex('sets', 'exId', exId)).filter(s => s.sessionId !== excludeSessionId);
  if (!rows.length) return { date: null, sets: [] };
  rows.sort((a, b) => (a.date === b.date ? a.ts - b.ts : a.date < b.date ? -1 : 1));
  const lastSid = rows[rows.length - 1].sessionId;
  const sets = rows.filter(s => s.sessionId === lastSid).sort((a, b) => a.setIndex - b.setIndex);
  return { date: sets[0].date, sets };
}
function suggestion(it, sets, phase) {
  if (!sets.length) return '';
  if (isTimed(it)) {
    const ok = sets.every(s => (s.secs || 0) >= 40);
    return ok ? 'Segurou 40 s em todas: mantenha 40 s ou passe para o Pallof press.' : 'Some cerca de 5 s por série na próxima.';
  }
  const { lo, hi } = range(it);
  const target = it.sets[phase];
  const reps = sets.map(s => s.reps || 0);
  const lastKg = sets[sets.length - 1].kg;
  const anyHard = sets.some(s => s.effort === 'dificil');
  const allEasy = sets.every(s => s.effort === 'facil');
  if (sets.length >= target && reps.every(r => r >= hi))
    return anyHard ? `Topo da faixa em todas, mas foi difícil: suba só o menor incremento (estava ${fmtN(lastKg)} kg).`
      : `Topo da faixa em todas as séries: suba a carga (estava ${fmtN(lastKg)} kg).`;
  if (reps.some(r => r < lo)) return `Alguma série ficou abaixo de ${lo} repetições: mantenha a carga ou reduza 5–10%.`;
  if (allEasy && phase === 0) return 'Fácil é o esperado nas semanas 1–2. Mantenha a carga e busque +1 repetição.';
  if (allEasy) return 'Tudo marcado como fácil: busque +2 repetições por série ou suba a carga.';
  return 'Dentro da faixa: mantenha a carga e tente +1 repetição em alguma série.';
}
function weeklyMuscleSets(all, phase) {
  const ws = weekStart(todayStr());
  const done = {}, target = {};
  Object.keys(MUSCLES).forEach(m => { done[m] = 0; target[m] = 0; });
  ITEMS.forEach(it => { const n = it.sets[phase]; it.prim.forEach(m => target[m] += n); it.sec.forEach(m => target[m] += n / 2); });
  all.sets.filter(s => weekStart(s.date) === ws).forEach(s => {
    const it = itemById(s.exId); if (!it) return;
    it.prim.forEach(m => done[m] += 1); it.sec.forEach(m => done[m] += 0.5);
  });
  return Object.keys(MUSCLES).filter(m => target[m] > 0).map(m => ({ m, done: done[m], target: target[m] }))
    .sort((a, b) => b.target - a.target);
}
function avg7(body, upTo) {
  const from = addDays(upTo, -6);
  const w = body.filter(b => b.weight != null && b.date >= from && b.date <= upTo).map(b => b.weight);
  return w.length ? w.reduce((a, b) => a + b, 0) / w.length : null;
}

/* ================= UI básica ================= */
const main = $('#main');
let charts = [];
function setBar(title, ctx = '', back = null) {
  $('#title').textContent = title;
  $('#ctx').innerHTML = ctx;
  const b = $('#back');
  b.hidden = !back;
  b.onclick = back ? () => { location.hash = back; } : null;
}
function toast(msg, ms = 2400) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms);
}
function openSheet(html) {
  const sh = $('#sheet');
  sh.innerHTML = `<button class="close" type="button" aria-label="Fechar" data-close>✕</button><div class="grab"></div>${html}`;
  sh.classList.add('on'); $('#sheetBg').classList.add('on'); sh.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function closeSheet() {
  $('#sheet').classList.remove('on'); $('#sheetBg').classList.remove('on');
  document.body.style.overflow = '';
}
$('#sheetBg').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
window.addEventListener('scroll', () => $('#appbar').classList.toggle('scrolled', window.scrollY > 4), { passive: true });

function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
function destroyCharts() { charts.forEach(c => c.destroy()); charts = []; }
function mkChart(canvas, cfg) {
  if (!window.Chart) return;
  const ink = cssVar('--muted'), line = cssVar('--line');
  Chart.defaults.font.family = 'Archivo, system-ui, sans-serif';
  Chart.defaults.color = ink;
  cfg.options = Object.assign({
    responsive: true, maintainAspectRatio: false, animation: false, locale: 'pt-BR',
    plugins: { legend: { labels: { boxWidth: 12, boxHeight: 12 } }, tooltip: { intersect: false, mode: 'index' } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: line }, beginAtZero: false } }
  }, cfg.options || {});
  charts.push(new Chart(canvas, cfg));
}

/* ================= cronômetro de descanso ================= */
const timer = { end: 0, int: null, ctx: null };
function beep() {
  try {
    const c = timer.ctx; if (!c) return;
    [0, 0.25].forEach(t => {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = 880; o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, c.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, c.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + 0.18);
      o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.2);
    });
  } catch (e) { /* sem som */ }
}
function unlockAudio() {
  try {
    if (!timer.ctx) timer.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (timer.ctx.state === 'suspended') timer.ctx.resume();
  } catch (e) { /* ignora */ }
}
function startTimer(sec, label) {
  const el = $('#timer');
  timer.end = Date.now() + sec * 1000;
  $('#timerLabel').textContent = label;
  el.classList.add('on'); el.classList.remove('end');
  clearInterval(timer.int);
  const tick = () => {
    const left = Math.max(0, Math.round((timer.end - Date.now()) / 1000));
    $('#timerVal').textContent = `${Math.floor(left / 60)}:${pad2(left % 60)}`;
    if (left <= 0) {
      clearInterval(timer.int);
      el.classList.add('end'); $('#timerLabel').textContent = 'Descanso terminado: próxima série';
      beep(); if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setTimeout(() => { if (el.classList.contains('end')) el.classList.remove('on'); }, 8000);
    }
  };
  tick(); timer.int = setInterval(tick, 250);
}
$('#timerPlus').onclick = () => {
  const left = Math.max(0, Math.round((timer.end - Date.now()) / 1000));
  const label = $('#timer').classList.contains('end') ? 'Descanso extra' : $('#timerLabel').textContent;
  startTimer(left + 15, label);
};
$('#timerSkip').onclick = () => { clearInterval(timer.int); $('#timer').classList.remove('on', 'end'); };

/* ================= tela: Hoje ================= */
async function viewHoje() {
  const p = await program();
  setBar('Hoje', phaseLabel(p));
  const all = await loadAll();
  const today = todayStr(), dow = new Date().getDay();
  const done = doneThisWeek(all);
  const wk = WEEK.find(w => w.dow === dow);
  const todayPlan = wk.plan ? planById(wk.plan) : null;
  const next = nextInSequence(done);
  const lastBackup = await db.setting('lastBackup');
  const needBackup = all.sets.length > 0 && (!lastBackup || (parseDate(today) - parseDate(lastBackup)) / 864e5 > 14);

  let workout;
  if (todayPlan && !done[todayPlan.id]) workout = { plan: todayPlan, k: 'Treino de hoje' };
  else if (next) workout = { plan: next, k: todayPlan ? 'Treino de hoje feito. Próximo da sequência' : 'Próximo da sequência' };
  const todaySession = workout && all.sessions.find(s => s.date === today && s.planId === workout.plan.id && !s.finishedAt && (all.setsBySession[s.id] || []).length);

  const cardioToday = all.cardio.filter(c => c.date === today);
  const w7 = avg7(all.body, today);
  const weighedToday = all.body.find(b => b.date === today && b.weight != null);
  const cardioWeek = all.cardio.filter(c => weekStart(c.date) === weekStart(today)).length;

  main.innerHTML = `
    <p class="hero-day">${fmtLong(today)}</p>
    ${!p.start ? `<div class="card"><h2>Quando o programa começa?</h2>
       <p class="muted small">A data define a semana atual, a fase (adaptação nas semanas 1–2) e o cardio do dia.</p>
       <div class="row"><label class="f" style="flex:1">Data de início<input type="date" id="startDate" value="${today}"></label></div>
       <div class="form-actions"><button class="btn solid block" data-act="setStart">Salvar data de início</button></div></div>` : ''}
    ${p.week >= 8 ? `<div class="banner"><b>Semana ${p.week}:</b> hora de revisar a ficha. Veja aderência e progressão na aba Progresso.</div>` : ''}
    ${needBackup ? `<div class="banner"><b>Faça um backup.</b> Seus dados ficam só neste celular. <a href="#mais">Exportar agora</a></div>` : ''}

    ${workout ? `<div class="big-workout ${workout.plan.kind}">
        <div class="k">${workout.k}</div>
        <h2>${workout.plan.name}</h2>
        <p>${workout.plan.focus} · ${workout.plan.items.length} exercícios · ${workout.plan.time[p.phase]}</p>
        <a class="btn" href="#treino/${workout.plan.id}">${todaySession ? 'Continuar treino' : 'Começar treino'}</a>
      </div>` : `<div class="card"><h2>Os quatro treinos da semana estão feitos</h2><p class="muted">Bom trabalho. Hoje é dia de recuperar.</p></div>`}

    <div class="chips" aria-label="Treinos desta semana">
      ${PLAN.map(pl => `<a class="chip ${done[pl.id] ? 'done' : (next && next.id === pl.id ? 'next' : '')}" href="#treino/${pl.id}">${done[pl.id] ? '✓ ' : ''}${pl.name}</a>`).join('')}
    </div>

    <div class="card">
      <div class="spread"><h3>Cardio da manhã</h3><span class="small muted">${cardioWeek} de 6 na semana</span></div>
      <p style="margin:0 0 10px">${esc(cardioPlan(Math.max(p.week, 1), dow))}</p>
      ${cardioToday.length ? `<p class="small" style="color:var(--ok);font-weight:700;margin:0 0 10px">✓ Registrado: ${cardioToday.map(c => `${c.minutes} min de ${c.type}`).join(', ')}</p>` : ''}
      <button class="btn sm" data-act="cardioForm">Registrar cardio</button>
    </div>

    <div class="card">
      <div class="spread"><h3>Peso</h3><span class="small muted">Média de 7 dias: <b>${w7 ? fmtN(w7) + ' kg' : '–'}</b></span></div>
      ${weighedToday ? `<p class="small" style="color:var(--ok);font-weight:700;margin:4px 0 0">✓ Hoje: ${fmtN(weighedToday.weight)} kg</p>` :
      `<div class="row" style="margin-top:6px"><label class="f" style="flex:1">Peso de hoje (kg)<input id="wQuick" inputmode="decimal" placeholder="75,0"></label>
         <button class="btn solid" style="align-self:flex-end" data-act="saveWeight">Salvar</button></div>
       <p class="small muted" style="margin:8px 0 0">Pese-se de manhã, depois do banheiro e antes de comer. A média semanal é o que importa.</p>`}
    </div>`;
}

/* ================= tela: lista de treinos ================= */
async function viewTreinoLista() {
  const p = await program();
  setBar('Treinos', phaseLabel(p));
  const all = await loadAll();
  const done = doneThisWeek(all);
  const lastDate = id => { const s = all.realSessions.filter(x => x.planId === id).sort((a, b) => a.date < b.date ? 1 : -1)[0]; return s ? fmtShort(s.date) : null; };
  main.innerHTML = PLAN.map(pl => `
    <a class="card" href="#treino/${pl.id}" style="display:block;text-decoration:none;color:inherit">
      <div class="spread"><span class="kind ${pl.kind}" style="font-weight:700;font-size:14px">${pl.day}</span>
        <span class="small ${done[pl.id] ? '' : 'muted'}" style="${done[pl.id] ? 'color:var(--ok);font-weight:700' : ''}">${done[pl.id] ? '✓ Feito nesta semana' : (lastDate(pl.id) ? 'Último: ' + lastDate(pl.id) : 'Ainda não feito')}</span></div>
      <h2 style="font-size:28px;margin-top:4px">${pl.name}</h2>
      <p class="muted" style="margin:2px 0 0">${pl.focus} · ${pl.sets[p.phase]} séries · ${pl.time[p.phase]}</p>
    </a>`).join('') + `<p class="small muted">Perdeu um treino? Faça o próximo da sequência no próximo dia livre, sem treinar perna em dias seguidos.</p>`;
}

/* ================= tela: sessão de treino ================= */
const S = { plan: null, session: null, sets: [], last: {}, open: new Set(), phase: 0 };

async function viewSessao(planId) {
  const pl = planById(planId);
  if (!pl) { location.hash = 'treino'; return; }
  const p = await program();
  S.plan = pl; S.phase = p.phase;
  const today = todayStr();
  const sessions = (await db.byIndex('sessions', 'date', today)).filter(s => s.planId === planId).sort((a, b) => b.startedAt - a.startedAt);
  S.session = sessions[0] || null;
  S.sets = S.session ? await db.byIndex('sets', 'sessionId', S.session.id) : [];
  S.last = {};
  for (const it of pl.items) S.last[it.id] = await lastSetsFor(it.id, S.session?.id);
  if (!S.open.size || ![...S.open].some(id => pl.items.some(i => i.id === id))) {
    S.open = new Set();
    const firstPending = pl.items.find(it => doneCount(it) < it.sets[S.phase]);
    if (firstPending) openWithPartner(firstPending.id);
  }
  setBar(pl.name, phaseLabel(p), 'treino');
  renderSessao();
}
const setsOf = exId => S.sets.filter(s => s.exId === exId).sort((a, b) => a.setIndex - b.setIndex);
const doneCount = it => setsOf(it.id).length;
function openWithPartner(id) {
  const it = S.plan.items.find(i => i.id === id); S.open.add(id);
  if (it && it.group) S.plan.items.filter(i => i.group === it.group).forEach(i => S.open.add(i.id));
}

function renderSessao() {
  const pl = S.plan, ph = S.phase;
  const total = pl.items.reduce((a, it) => a + it.sets[ph], 0);
  const doneSets = pl.items.reduce((a, it) => a + Math.min(doneCount(it), it.sets[ph]), 0);
  let html = `
    <div class="wk-head"><div><div class="kind ${pl.kind}">${pl.focus}</div></div>
      <div class="small muted">${doneSets} de ${total} séries</div></div>
    <div class="progressbar"><i style="width:${total ? (100 * doneSets / total) : 0}%"></i></div>
    ${S.session?.finishedAt ? `<p class="small" style="color:var(--ok);font-weight:700">✓ Finalizado às ${new Date(S.session.finishedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}. Você ainda pode adicionar séries.</p>` : ''}
    <details class="warm"><summary>Aquecimento (5–8 min)</summary>
      <p>3–5 min de bicicleta ou elíptico leve. No primeiro exercício, 2 séries leves: ~50% da carga × 10 e ~75% × 5. Aquecimento não conta como série, então não registre.</p></details>`;
  let lastGroup = null;
  pl.items.forEach(it => {
    if (it.group && it.group !== lastGroup) html += `<div class="ss-label">Superset: alterne ${pl.items.filter(i => i.group === it.group).map(i => i.n).join(' e ')}, descanse depois do par</div>`;
    lastGroup = it.group || null;
    html += `<div class="ex ${S.open.has(it.id) ? 'open' : ''} ${doneCount(it) >= it.sets[ph] ? 'done' : ''}" id="ex-${it.id}">${exCardInner(it)}</div>`;
  });
  html += `<div style="margin:22px 0 8px"><button class="btn solid block" data-act="finish" ${S.sets.length ? '' : 'disabled style="opacity:.5"'}>${S.session?.finishedAt ? 'Atualizar e ver resumo' : 'Finalizar treino'}</button></div>`;
  main.innerHTML = html;
}

function exCardInner(it) {
  const ph = S.phase, target = it.sets[ph], saved = setsOf(it.id), last = S.last[it.id] || { sets: [] };
  const timed = isTimed(it);
  const lastTxt = last.sets.length ? `<p class="last">Última vez (${fmtShort(last.date)}): <b>${timed
      ? last.sets.map(s => `${s.secs || 0} s`).join(', ')
      : `${fmtN(last.sets[0].kg)} kg × ${last.sets.map(s => s.reps).join(', ')}`}</b></p>` : `<p class="last">Primeira vez: comece com uma carga em que você faria 3–4 repetições a mais.</p>`;
  const sug = suggestion(it, last.sets, ph);
  const nextIdx = saved.length;
  const prevKg = saved.length ? saved[saved.length - 1].kg : (last.sets[nextIdx]?.kg ?? last.sets[0]?.kg ?? '');
  const repHint = timed ? (last.sets[nextIdx]?.secs ?? 20) : (last.sets[nextIdx]?.reps ?? range(it).hi);
  const fr = it.frames || [0, 1];
  return `
    <button class="ex-top" type="button" data-toggle="${it.id}" aria-expanded="${S.open.has(it.id)}">
      <span class="n">${it.n}</span>
      <span><span class="t">${esc(it.name)}</span><span class="s" style="display:block">${target} × ${esc(it.reps)} · RIR ${esc(rirFor(it, ph))}</span></span>
      <span class="c">${saved.length}/${target}</span>
    </button>
    <div class="ex-body">
      <div class="media"><img src="img/ex/${it.img}-${fr[0]}.jpg" alt="${esc(it.name)}: posição inicial" loading="lazy">
        ${fr[0] !== fr[1] ? `<img class="f2" src="img/ex/${it.img}-${fr[1]}.jpg" alt="" loading="lazy">` : ''}</div>
      <dl class="ex-meta">
        <div><dt>Séries</dt><dd>${target}</dd></div><div><dt>Reps</dt><dd>${esc(it.reps)}</dd></div>
        <div><dt>RIR</dt><dd>${esc(rirFor(it, ph).replace('Pare ao perder o alinhamento', 'técnica'))}</dd></div><div><dt>Descanso</dt><dd>${it.restSec === 0 ? 'vá ao par' : esc(/depois do par/.test(it.rest) ? it.rest.replace(' depois do par', '') : it.rest.replace('90 s–2 min', '1,5–2 min'))}</dd></div>
      </dl>
      ${lastTxt}
      ${sug ? `<div class="suggest">${esc(sug)}</div>` : ''}
      <button class="btn sm how" type="button" data-how="${it.id}">Como fazer</button>
      ${saved.map(s => `
        <div class="set saved">
          <span class="small muted">Série ${s.setIndex + 1}</span>
          <span class="sv">${timed ? `${s.secs} s` : `${fmtN(s.kg)} kg × ${s.reps}`}</span>
          <span class="tag ${s.effort || 'none'}">${s.effort ? EFFORT[s.effort].l : 'sem nota'}</span>
          <button class="x" type="button" data-delset="${s.id}">apagar</button>
        </div>`).join('')}
      ${nextIdx < target || S.extra === it.id ? `
        <div class="set" data-setform="${it.id}">
          <div class="set-h"><span>Série ${nextIdx + 1}${nextIdx >= target ? ' (extra)' : ` de ${target}`}</span><span>${timed ? 'segure em posição' : 'como foi?'}</span></div>
          <div class="set-in ${timed ? 'single' : ''}">
            ${timed ? `<label>Segundos<input name="secs" inputmode="numeric" placeholder="${repHint}"></label>` :
            `<label>Carga (kg)<input name="kg" inputmode="decimal" value="${prevKg === '' ? '' : String(prevKg).replace('.', ',')}" placeholder="kg"></label>
             <label>Repetições<input name="reps" inputmode="numeric" placeholder="${repHint}"></label>`}
          </div>
          <div class="effort" role="group" aria-label="Dificuldade da série">
            <button type="button" data-e="facil" aria-pressed="false">Fácil</button>
            <button type="button" data-e="medio" aria-pressed="false">Médio</button>
            <button type="button" data-e="dificil" aria-pressed="false">Difícil</button>
            <button type="button" class="save" data-save="${it.id}" aria-label="Salvar série">✓</button>
          </div>
          <p class="small muted" style="margin:6px 0 0">Fácil = sobrariam 4+ reps · Médio = 2–3 · Difícil = 0–1</p>
        </div>` : `<button class="add-set" type="button" data-extra="${it.id}">+ Série extra</button>`}
    </div>`;
}

async function saveSet(exId) {
  const it = S.plan.items.find(i => i.id === exId);
  const form = $(`[data-setform="${exId}"]`);
  const timed = isTimed(it);
  const effort = $('.effort [aria-pressed="true"]', form)?.dataset.e || null;
  let kg = null, reps = null, secs = null;
  if (timed) {
    secs = num($('[name=secs]', form).value) ?? num($('[name=secs]', form).placeholder);
    if (!secs) { toast('Informe os segundos.'); return; }
  } else {
    kg = num($('[name=kg]', form).value);
    reps = num($('[name=reps]', form).value) ?? num($('[name=reps]', form).placeholder);
    if (kg == null) { toast('Informe a carga em kg (0 se for só o peso do corpo).'); return; }
    if (!reps) { toast('Informe as repetições.'); return; }
  }
  unlockAudio();
  if (!S.session) {
    const s = { date: todayStr(), planId: S.plan.id, startedAt: Date.now(), finishedAt: null };
    s.id = await db.add('sessions', s); S.session = s;
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  }
  const row = { sessionId: S.session.id, date: S.session.date, planId: S.plan.id, exId, setIndex: setsOf(exId).length,
    kg, reps, secs, effort, rir: effort ? EFFORT[effort].rir : null, ts: Date.now() };
  row.id = await db.add('sets', row);
  S.sets.push(row);
  if (S.extra === exId) S.extra = null;

  // próximo passo: descanso ou parceiro do superset
  const partner = it.group ? S.plan.items.find(i => i.group === it.group && i.id !== it.id) : null;
  const target = it.sets[S.phase];
  if (doneCount(it) >= target && !it.group) {
    S.open.delete(it.id);
    const nxt = S.plan.items.find(i => doneCount(i) < i.sets[S.phase]);
    if (nxt) openWithPartner(nxt.id);
  }
  if (it.group && partner && it.restSec === 0) {
    toast(`Agora: ${partner.n} ${partner.name}`);
  } else if (it.restSec) {
    const nxtLabel = doneCount(it) < target ? `${it.name}, série ${doneCount(it) + 1}` :
      (S.plan.items.find(i => doneCount(i) < i.sets[S.phase])?.name || 'fim do treino');
    startTimer(it.restSec, `Descanso · próximo: ${nxtLabel}`);
  }
  if (it.group && doneCount(it) >= target && partner && doneCount(partner) >= partner.sets[S.phase]) {
    S.open.delete(it.id); S.open.delete(partner.id);
    const nxt = S.plan.items.find(i => doneCount(i) < i.sets[S.phase]);
    if (nxt) openWithPartner(nxt.id);
  }
  const y = window.scrollY;
  renderSessao();
  window.scrollTo(0, y);
  const card = $(`#ex-${[...S.open].pop()}`);
  if (card && doneCount(it) >= target) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function finishSession() {
  if (!S.session) return;
  S.session.finishedAt = Date.now();
  await db.put('sessions', S.session);
  const all = await loadAll();
  const mine = S.sets;
  const dur = Math.max(1, Math.round((S.session.finishedAt - S.session.startedAt) / 60000));
  const vol = mine.reduce((a, s) => a + (s.kg || 0) * (s.reps || 0), 0);
  const prs = [];
  for (const it of S.plan.items) {
    const now = Math.max(0, ...setsOf(it.id).map(s => e1rm(s.kg, s.reps) || 0));
    if (!now) continue;
    const before = Math.max(0, ...all.sets.filter(s => s.exId === it.id && s.sessionId !== S.session.id).map(s => e1rm(s.kg, s.reps) || 0));
    if (before && now > before + 0.01) prs.push(`${it.name}: força estimada ${fmtN(now)} kg (antes ${fmtN(before)})`);
  }
  const efforts = { facil: 0, medio: 0, dificil: 0 };
  mine.forEach(s => s.effort && efforts[s.effort]++);
  openSheet(`
    <h2>Treino registrado</h2>
    <p class="muted">${S.plan.name} · ${fmtLong(S.session.date)}</p>
    <div class="kpis">
      <div class="kpi"><div class="v">${dur}</div><div class="l">min de treino</div></div>
      <div class="kpi"><div class="v">${mine.length}</div><div class="l">séries</div></div>
      <div class="kpi"><div class="v">${fmtN(vol / 1000, 1)}</div><div class="l">toneladas levantadas</div></div>
      <div class="kpi"><div class="v">${efforts.dificil}</div><div class="l">séries difíceis</div></div>
    </div>
    ${prs.length ? `<h4>Novos recordes</h4><ul>${prs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="muted">Sem recordes hoje. Manter a carga com boa técnica também é progresso.</p>`}
    <p class="small muted">Força estimada usa a fórmula de Epley (carga × (1 + reps/30)). É uma estimativa para acompanhar tendência, não um teste de carga máxima.</p>
    <div class="form-actions"><a class="btn solid block" href="#hoje" data-close>Voltar para Hoje</a></div>`);
  renderSessao();
}

function howSheet(it) {
  const fr = it.frames || [0, 1];
  openSheet(`
    <h2>${esc(it.name)}</h2>
    <div class="media"><img src="img/ex/${it.img}-${fr[0]}.jpg" alt="${esc(it.name)}">${fr[0] !== fr[1] ? `<img class="f2" src="img/ex/${it.img}-${fr[1]}.jpg" alt="">` : ''}</div>
    ${it.imgNote ? `<p class="small muted">${esc(it.imgNote)}</p>` : ''}
    <div class="mapbox">${bodyMap(it.prim, it.sec, 'Músculos: ' + it.prim.map(m => MUSCLES[m]).join(', '))}</div>
    <div class="legend" style="justify-content:center"><span><i style="background:var(--prim)"></i>Principal</span><span><i style="background:var(--sec)"></i>Ajudam</span></div>
    <p class="small"><b>Principal:</b> ${it.prim.map(m => MUSCLES[m]).join(', ')}${it.sec.length ? `<br><b>Ajudam:</b> ${it.sec.map(m => MUSCLES[m]).join(', ')}` : ''}</p>
    <div class="foco"><small>Onde sentir</small>${esc(it.foco)}</div>
    <h4>Execução</h4><ul>${it.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    ${it.postura ? `<div class="postura"><b>Postura:</b> ${esc(it.postura)}</div>` : ''}
    <h4>Evite</h4><ul>${it.evite.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
    <p><b>Aparelho ocupado?</b> ${esc(it.alt)}</p>
    <a class="btn block" href="https://www.youtube.com/results?search_query=${encodeURIComponent(it.q)}" target="_blank" rel="noopener">Ver vídeos da execução no YouTube</a>`);
}

/* ================= tela: Progresso ================= */
async function viewProgresso() {
  const p = await program();
  setBar('Progresso', phaseLabel(p));
  const all = await loadAll();
  const today = todayStr(), ws = weekStart(today);
  const weeks = Array.from({ length: 8 }, (_, i) => addDays(ws, -7 * (7 - i)));
  const perWeek = weeks.map(w => all.realSessions.filter(s => weekStart(s.date) === w).length);
  const last4 = perWeek.slice(-4).reduce((a, b) => a + b, 0);
  const setsWeek = all.sets.filter(s => weekStart(s.date) === ws).length;
  const w7 = avg7(all.body, today), w7old = avg7(all.body, addDays(today, -28));
  const cardioMin = weeks.map(w => all.cardio.filter(c => weekStart(c.date) === w).reduce((a, c) => a + (c.minutes || 0), 0));
  const muscles = weeklyMuscleSets(all, p.phase);
  const exWithData = ITEMS.filter((it, i, arr) => arr.findIndex(x => x.id === it.id) === i && all.sets.some(s => s.exId === it.id));
  const selEx = S.progEx && exWithData.some(i => i.id === S.progEx) ? S.progEx : exWithData[0]?.id;

  main.innerHTML = `
    <div class="kpis">
      <div class="kpi"><div class="v">${perWeek[7]}<span style="font-size:20px">/4</span></div><div class="l">treinos nesta semana</div></div>
      <div class="kpi"><div class="v">${Math.round(100 * last4 / 16)}%</div><div class="l">aderência em 4 semanas</div></div>
      <div class="kpi"><div class="v">${w7 ? fmtN(w7) : '–'}</div><div class="l">peso, média 7 dias (kg)</div>
        ${w7 && w7old ? `<div class="d" style="color:var(--muted)">${w7 - w7old > 0 ? '+' : ''}${fmtN(w7 - w7old)} kg em 4 semanas</div>` : ''}</div>
      <div class="kpi"><div class="v">${cardioMin[7]}</div><div class="l">min de cardio na semana</div></div>
    </div>

    <h2 class="section-title">Treinos por semana</h2>
    <div class="card"><div class="chart-wrap"><canvas id="cWeeks"></canvas></div></div>

    <h2 class="section-title">Séries por músculo nesta semana</h2>
    <div class="card">
      <p class="small muted" style="margin:0">Feitas / meta da fase atual. Exercícios auxiliares contam meia série.</p>
      <div class="bars">${muscles.map(m => `
        <div class="bar"><span>${esc(MUSCLES[m.m].replace(/ \(.*\)/, ''))}</span>
          <span class="track"><span class="fill ${m.done >= m.target ? 'full' : ''}" style="width:${Math.min(100, 100 * m.done / m.target)}%"></span></span>
          <span class="num">${fmtN(m.done)}/${fmtN(m.target)}</span></div>`).join('')}</div>
    </div>

    <h2 class="section-title">Evolução por exercício</h2>
    <div class="card">
      ${exWithData.length ? `<label class="f">Exercício<select id="exSel">${exWithData.map(it => `<option value="${it.id}" ${it.id === selEx ? 'selected' : ''}>${esc(planById(it.planId).name)}: ${esc(it.name)}</option>`).join('')}</select></label>
        <div class="chart-wrap" style="margin-top:12px"><canvas id="cEx"></canvas></div>
        <div id="exTable" style="margin-top:10px"></div>` : `<p class="empty">Registre séries nos treinos para ver a evolução das cargas aqui.</p>`}
    </div>

    <h2 class="section-title">Peso</h2>
    <div class="card">${all.body.some(b => b.weight != null) ? `<div class="chart-wrap"><canvas id="cWeight"></canvas></div>
      <p class="small muted" style="margin:8px 0 0">A linha da média de 7 dias é a que vale: o peso diário oscila 1–2 kg com água e sal.</p>` : `<p class="empty">Registre seu peso na aba Hoje ou em Corpo.</p>`}</div>

    <h2 class="section-title">Composição corporal</h2>
    <div class="card">${all.comps.length ? `<div class="chart-wrap"><canvas id="cComp"></canvas></div>
      <p class="small muted" style="margin:8px 0 0">Compare apenas avaliações do mesmo método. Dobras e bioimpedância dão números diferentes para o mesmo corpo.</p>` : `<p class="empty">Adicione avaliações (dobras ou bioimpedância) na aba Corpo.</p>`}</div>

    <h2 class="section-title">Cardio</h2>
    <div class="card"><div class="chart-wrap"><canvas id="cCardio"></canvas></div></div>`;

  destroyCharts();
  const accent = cssVar('--accent'), prim = cssVar('--prim'), ok = cssVar('--ok'), muted = cssVar('--muted');
  const wl = weeks.map(fmtShort);
  mkChart($('#cWeeks'), { type: 'bar', data: { labels: wl, datasets: [
    { label: 'Treinos', data: perWeek, backgroundColor: accent, borderRadius: 6 },
    { label: 'Meta', type: 'line', data: weeks.map(() => 4), borderColor: prim, borderDash: [5, 4], pointRadius: 0, borderWidth: 2 }] },
    options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, suggestedMax: 4, ticks: { stepSize: 1 } } } } });
  mkChart($('#cCardio'), { type: 'bar', data: { labels: wl, datasets: [{ label: 'Minutos de cardio', data: cardioMin, backgroundColor: ok, borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } } });

  if (selEx) drawEx(selEx, all);
  const sel = $('#exSel'); if (sel) sel.onchange = () => { S.progEx = sel.value; destroyChartOn('cEx'); drawEx(sel.value, all); };

  const bw = all.body.filter(b => b.weight != null).sort((a, b) => a.date < b.date ? -1 : 1).slice(-150);
  if (bw.length) {
    const dayN = s => Math.round(parseDate(s).getTime() / 864e5);
    const avgPts = [];
    const longSpan = dayN(bw[bw.length - 1].date) - dayN(bw[0].date) > 200;
    bw.forEach((b, i) => {
      if (i && dayN(b.date) - dayN(bw[i - 1].date) > 14) avgPts.push({ x: dayN(b.date) - 1, y: null });
      avgPts.push({ x: dayN(b.date), y: avg7(all.body, b.date) });
    });
    mkChart($('#cWeight'), { type: 'line', data: { datasets: [
      { label: 'Peso', data: bw.map(b => ({ x: dayN(b.date), y: b.weight })), borderColor: muted, backgroundColor: muted, pointRadius: 2.5, showLine: false },
      { label: 'Média 7 dias', data: avgPts, borderColor: accent, backgroundColor: accent, borderWidth: 3, pointRadius: 0, tension: .3, spanGaps: false }] },
      options: { scales: { x: { type: 'linear', grid: { display: false }, ticks: { maxTicksLimit: 6, callback: v => { const d = new Date(v * 864e5); return longSpan ? pad2(d.getUTCMonth() + 1) + '/' + String(d.getUTCFullYear()).slice(2) : pad2(d.getUTCDate()) + '/' + pad2(d.getUTCMonth() + 1); } } }, y: { grid: { color: cssVar('--line') } } },
        plugins: { tooltip: { mode: 'nearest', intersect: false, callbacks: { title: it => { const d = new Date(it[0].parsed.x * 864e5); return pad2(d.getUTCDate()) + '/' + pad2(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear(); } } } } } });
  }

  const comps = [...all.comps].sort((a, b) => a.date < b.date ? -1 : 1);
  if (comps.length) {
    const methods = [...new Set(comps.map(c => c.method))];
    const colors = [prim, accent, ok, muted];
    mkChart($('#cComp'), { type: 'line', data: { labels: comps.map(c => fmtShort(c.date) + '/' + c.date.slice(2, 4)), datasets: methods.map((m, i) => ({
      label: `% gordura (${m})`, data: comps.map(c => c.method === m ? c.fatPct : null), borderColor: colors[i % 4], backgroundColor: colors[i % 4], spanGaps: true, pointRadius: 4 })) } });
  }
}
function destroyChartOn(id) { charts = charts.filter(c => { if (c.canvas.id === id) { c.destroy(); return false; } return true; }); }
function drawEx(exId, all) {
  const it = itemById(exId);
  const rows = all.sets.filter(s => s.exId === exId);
  const bySess = {};
  rows.forEach(s => (bySess[s.sessionId] = bySess[s.sessionId] || []).push(s));
  const pts = Object.values(bySess).map(ss => ({
    date: ss[0].date,
    maxKg: Math.max(...ss.map(s => s.kg || 0)),
    e1: Math.max(0, ...ss.map(s => e1rm(s.kg, s.reps) || 0)) || null,
    secs: Math.max(0, ...ss.map(s => s.secs || 0)),
    reps: ss.sort((a, b) => a.setIndex - b.setIndex).map(s => isTimed(it) ? `${s.secs}s` : s.reps).join(', '),
    eff: ss.map(s => s.effort ? EFFORT[s.effort].l[0] : '–').join(' ')
  })).sort((a, b) => a.date < b.date ? -1 : 1);
  const accent = cssVar('--accent'), prim = cssVar('--prim');
  const ds = isTimed(it) ? [{ label: 'Maior tempo (s)', data: pts.map(p => p.secs), borderColor: accent, backgroundColor: accent, tension: .25 }]
    : [{ label: 'Maior carga (kg)', data: pts.map(p => p.maxKg), borderColor: accent, backgroundColor: accent, tension: .25 },
       { label: 'Força estimada, 1RM (kg)', data: pts.map(p => p.e1), borderColor: prim, backgroundColor: prim, borderDash: [5, 4], tension: .25 }];
  mkChart($('#cEx'), { type: 'line', data: { labels: pts.map(p => fmtShort(p.date)), datasets: ds } });
  $('#exTable').innerHTML = `<table class="t"><thead><tr><th>Data</th><th>${isTimed(it) ? 'Tempo' : 'Carga'}</th><th>Reps por série</th><th>Dificuldade</th></tr></thead><tbody>
    ${pts.slice(-6).reverse().map(p => `<tr><td>${fmtShort(p.date)}</td><td>${isTimed(it) ? p.secs + ' s' : fmtN(p.maxKg) + ' kg'}</td><td>${esc(p.reps)}</td><td>${esc(p.eff)}</td></tr>`).join('')}</tbody></table>
    <p class="small muted">Dificuldade: F = fácil, M = médio, D = difícil.</p>`;
}

/* ================= tela: Corpo ================= */
async function viewCorpo() {
  const p = await program();
  setBar('Corpo', phaseLabel(p));
  const all = await loadAll();
  const today = todayStr();
  const body = [...all.body].sort((a, b) => a.date < b.date ? 1 : -1);
  const comps = [...all.comps].sort((a, b) => a.date < b.date ? 1 : -1);
  main.innerHTML = `
    <div class="card"><h2>Peso e cintura</h2>
      <div class="grid2" style="margin-top:10px">
        <label class="f">Data<input type="date" id="bDate" value="${today}"></label>
        <label class="f">Peso (kg)<input id="bW" inputmode="decimal" placeholder="75,0"></label>
        <label class="f">Cintura (cm)<input id="bWaist" inputmode="decimal" placeholder="opcional"></label>
        <label class="f">Observação<input id="bNote" placeholder="opcional"></label>
      </div>
      <div class="form-actions"><button class="btn solid block" data-act="saveBody">Salvar medida</button></div>
      <p class="small muted" style="margin:10px 0 0">Cintura: meça na altura do umbigo, de manhã, a cada 2 semanas.</p>
    </div>

    <div class="card"><h2>Avaliação de composição</h2>
      <p class="small muted" style="margin:0 0 10px">Bioimpedância, dobras cutâneas ou outro método. Preencha o que o laudo trouxer.</p>
      <label class="f">Método<select id="cMethod"><option>Dobras cutâneas</option><option>Bioimpedância</option><option>Outro</option></select></label>
      <div class="grid2" style="margin-top:10px">
        <label class="f">Data<input type="date" id="cDate" value="${today}"></label>
        <label class="f">Peso (kg)<input id="cW" inputmode="decimal"></label>
        <label class="f">% de gordura<input id="cFat" inputmode="decimal"></label>
        <label class="f">Massa de gordura (kg)<input id="cFatKg" inputmode="decimal" placeholder="calcula sozinho"></label>
        <label class="f">Massa livre de gordura (kg)<input id="cLean" inputmode="decimal" placeholder="calcula sozinho"></label>
        <label class="f">Massa muscular (kg)<input id="cMus" inputmode="decimal" placeholder="bioimpedância"></label>
        <label class="f">Gordura visceral<input id="cVis" inputmode="decimal" placeholder="bioimpedância"></label>
        <label class="f">Observação<input id="cNote" placeholder="local, aparelho"></label>
      </div>
      <div class="form-actions"><button class="btn solid block" data-act="saveComp">Salvar avaliação</button></div>
    </div>

    <h2 class="section-title">Avaliações</h2>
    <div class="card">${comps.length ? `<div class="tbl" style="margin:0"><table class="t"><thead><tr><th>Data</th><th>Método</th><th>Peso</th><th>% gord.</th><th>MLG</th><th></th></tr></thead><tbody>
      ${comps.map(c => `<tr><td>${fmtShort(c.date)}/${c.date.slice(2, 4)}</td><td>${esc(c.method)}</td><td>${fmtN(c.weight)}</td><td>${fmtN(c.fatPct)}</td><td>${fmtN(c.leanKg)}</td><td><button class="del" data-del="comps:${c.id}">apagar</button></td></tr>`).join('')}
      </tbody></table></div><p class="small muted">MLG = massa livre de gordura (kg).</p>` : `<p class="empty">Nenhuma avaliação ainda.</p>`}</div>

    <h2 class="section-title">Histórico de peso</h2>
    <div class="card">${body.length ? `<table class="t"><thead><tr><th>Data</th><th>Peso</th><th>Cintura</th><th></th></tr></thead><tbody>
      ${body.slice(0, 40).map(b => `<tr><td>${fmtShort(b.date)}</td><td>${fmtN(b.weight)} kg</td><td>${b.waist ? fmtN(b.waist) + ' cm' : '–'}</td><td><button class="del" data-del="body:${b.id}">apagar</button></td></tr>`).join('')}
      </tbody></table>` : `<p class="empty">Nenhuma medida ainda.</p>`}</div>`;
}

/* ================= tela: Mais / Guia ================= */
async function viewMais() {
  const p = await program();
  setBar('Mais', phaseLabel(p));
  const lastBackup = await db.setting('lastBackup');
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  main.innerHTML = `
    <div class="card"><h2>Programa</h2>
      <label class="f" style="margin-top:8px">Data de início<input type="date" id="startDate" value="${p.start || todayStr()}"></label>
      <div class="form-actions"><button class="btn block" data-act="setStart">Salvar data de início</button></div>
      <p class="small muted" style="margin:10px 0 0">${p.start ? `Você está na semana ${p.week}. Semanas 1–2: 2 séries por exercício e RIR 3–4.` : 'Defina a data para o app calcular a semana e a fase.'}</p>
    </div>
    <a class="card" href="#guia" style="display:block;text-decoration:none;color:inherit"><h2>Guia rápido ›</h2><p class="muted" style="margin:0">RIR, quando subir a carga, cardio e quando parar.</p></a>
    <div class="card"><h2>Backup</h2>
      <p class="muted" style="margin:4px 0 12px">Os dados ficam só neste celular. Exporte de tempos em tempos e guarde o arquivo no iCloud Drive ou no Google Drive. Último backup: <b>${lastBackup ? fmtShort(lastBackup) : 'nunca'}</b>.</p>
      <div class="row"><button class="btn solid" data-act="export">Exportar dados</button>
        <label class="btn" style="cursor:pointer">Importar arquivo<input type="file" id="importFile" accept="application/json,.json" hidden></label></div>
    </div>
    ${standalone ? '' : `<div class="card"><h2>Instalar no iPhone</h2>
      <ol style="margin:6px 0 0;padding-left:20px"><li>Abra este endereço no Safari.</li><li>Toque em Compartilhar (quadrado com seta).</li><li>Escolha “Adicionar à Tela de Início”.</li><li>Use sempre o ícone da tela inicial: os dados do app instalado ficam separados dos dados da aba do navegador.</li></ol></div>`}
    <div class="card"><h2>Sobre</h2>
      <p class="small muted" style="margin:4px 0 0">Versão ${VERSION}. Fotos dos exercícios: Free Exercise DB (domínio público). Gráficos: Chart.js (MIT). Fonte: Archivo (OFL). Este app organiza o treino; não substitui avaliação profissional. Dor articular, tontura, dor no peito ou falta de ar fora do normal: pare e procure avaliação médica.</p>
    </div>
    <div class="card"><h2>Apagar dados</h2>
      <p class="small muted" style="margin:4px 0 12px">Remove treinos, medidas e ajustes deste aparelho. Exporte antes.</p>
      <button class="btn danger" data-act="wipe">Apagar todos os dados</button></div>`;
  $('#importFile').onchange = e => importFile(e.target.files[0]);
}

function viewGuia() {
  setBar('Guia', '', 'mais');
  main.innerHTML = `<div class="guide">
  <h3>Quanto esforço: RIR</h3>
  <p>RIR é quantas repetições boas ainda sobrariam ao terminar a série. No app: <b>Fácil</b> = sobrariam 4 ou mais, <b>Médio</b> = 2–3, <b>Difícil</b> = 0–1.</p>
  <div class="tbl"><table><thead><tr><th>Semanas</th><th>Compostos</th><th>Isoladores</th></tr></thead><tbody>
   <tr><td>1–2</td><td>RIR 3–4 (fácil)</td><td>RIR 3–4 (fácil)</td></tr>
   <tr><td>3–4</td><td>RIR 2–3 (médio)</td><td>RIR 2 (médio)</td></tr>
   <tr><td>5–8</td><td>RIR 1–3 (médio a difícil)</td><td>RIR 1–2; a última série pode ir a 0–1</td></tr></tbody></table></div>
  <h3>Quando subir a carga</h3>
  <div class="tbl"><table><thead><tr><th>Situação</th><th>O que fazer</th></tr></thead><tbody>
   <tr><td>Todas as séries no topo da faixa, sem marcar difícil</td><td>Subir carga no menor salto do aparelho</td></tr>
   <tr><td>Dentro da faixa, repetições subindo</td><td>Manter a carga</td></tr>
   <tr><td>Alguma série abaixo do mínimo ou técnica quebrando</td><td>Reduzir 5–10%</td></tr>
   <tr><td>Duas sessões sem progresso, com sono e alimentação normais</td><td>Manter mais uma sessão; se seguir travado, reduzir 5–10%</td></tr></tbody></table></div>
  <h3>Cardio da manhã</h3>
  <div class="tbl"><table><thead><tr><th>Semanas</th><th>Quarta e sábado (~30 min)</th><th>Outros dias</th></tr></thead><tbody>
   <tr><td>1–2</td><td>Caminhada rápida com inclinação de 3–6%</td><td>Caminhada 25–30 min</td></tr>
   <tr><td>3–4</td><td>5 min caminhando, 7 × (1 min trote + 2 min caminhada), 4 min</td><td>Caminhada 30 min</td></tr>
   <tr><td>5–6</td><td>5 min caminhando, 6 × (2 min trote + 2 min caminhada), 1 min</td><td>Caminhada 30 min</td></tr>
   <tr><td>7–8</td><td>5 min caminhando, 5 × (3 min trote + 1,5 min caminhada), 2,5 min</td><td>Caminhada 30 min</td></tr></tbody></table></div>
  <p>Só avance de etapa se, no dia seguinte, não houver dor em canela, joelho ou tendão de Aquiles. Se o sono cair abaixo de 7 h, corte primeiro as caminhadas de terça e sexta.</p>
  <h3>Pare a série quando</h3>
  <ul><li>a técnica mudar (lombar descolando, tronco balançando, amplitude encurtando);</li>
   <li>houver dor articular aguda ou pontada;</li>
   <li>houver tontura, visão turva, dor no peito ou falta de ar fora do normal. Encerre o treino e procure avaliação médica.</li></ul>
  <p><b>Respiração:</b> solte o ar no esforço e não prenda a respiração por várias repetições seguidas.</p>
  <h3>Semana apertada</h3>
  <p>Corte nesta ordem: uma caminhada leve, a corrida de sábado, um treino superior. Os dois inferiores e um superior são o mínimo que mantém o progresso.</p>
  </div>`;
}

/* ================= formulários ================= */
function cardioForm() {
  openSheet(`<h2>Registrar cardio</h2>
    <label class="f" style="margin-top:8px">Data<input type="date" id="kDate" value="${todayStr()}"></label>
    <p class="small muted" style="margin:12px 0 4px">Tipo</p>
    <div class="seg" id="kType"><button type="button" data-v="caminhada" aria-pressed="true">Caminhada</button><button type="button" data-v="intervalado" aria-pressed="false">Intercalado</button><button type="button" data-v="corrida" aria-pressed="false">Corrida</button></div>
    <label class="f" style="margin-top:12px">Minutos<input id="kMin" inputmode="numeric" value="30"></label>
    <p class="small muted" style="margin:12px 0 4px">Como foi</p>
    <div class="seg" id="kEff"><button type="button" data-v="leve" aria-pressed="false">Leve</button><button type="button" data-v="moderado" aria-pressed="true">Moderado</button><button type="button" data-v="forte" aria-pressed="false">Forte</button></div>
    <label class="f" style="margin-top:12px">Observação<input id="kNote" placeholder="ex.: canela ok, inclinação 5%"></label>
    <div class="form-actions"><button class="btn solid block" data-act="saveCardio">Salvar cardio</button></div>`);
}
const segVal = id => $(`#${id} [aria-pressed="true"]`)?.dataset.v;

async function exportData() {
  const data = await db.exportAll();
  const name = `treino-backup-${todayStr()}.json`;
  const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
  const file = new File([blob], name, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Backup do treino' });
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    }
    await db.setSetting('lastBackup', todayStr());
    toast('Backup exportado.');
    route();
  } catch (e) { if (e.name !== 'AbortError') toast('Não foi possível exportar: ' + e.message); }
}
async function importFile(f) {
  if (!f) return;
  let data;
  try { data = JSON.parse(await f.text()); } catch (e) { toast('Arquivo inválido: não é um JSON.'); return; }
  openSheet(`<h2>Importar dados</h2>
    <p>Arquivo: <b>${esc(f.name)}</b></p>
    <p class="muted">Substituir apaga o que está neste aparelho e coloca o backup no lugar. Juntar acrescenta os registros do arquivo aos atuais.</p>
    <div class="form-actions" style="display:grid;gap:10px">
      <button class="btn solid" data-imp="replace">Substituir tudo</button>
      <button class="btn" data-imp="merge">Juntar com os dados atuais</button></div>`);
  importFile.pending = data;
}

/* ================= eventos ================= */
document.addEventListener('click', async e => {
  const t = e.target;
  if (t.closest('[data-close]')) { closeSheet(); if (!t.closest('a')) return; }

  const tg = t.closest('[data-toggle]');
  if (tg) { const id = tg.dataset.toggle; S.open.has(id) ? S.open.delete(id) : S.open.add(id);
    const el = $(`#ex-${id}`); el.classList.toggle('open'); tg.setAttribute('aria-expanded', el.classList.contains('open')); return; }

  const eff = t.closest('.effort [data-e]');
  if (eff) { $$('[data-e]', eff.parentElement).forEach(b => b.setAttribute('aria-pressed', String(b === eff))); return; }

  const sv = t.closest('[data-save]'); if (sv) { sv.disabled = true; try { await saveSet(sv.dataset.save); } finally { sv.disabled = false; } return; }

  const ds = t.closest('[data-delset]');
  if (ds) { const id = Number(ds.dataset.delset); await db.del('sets', id); S.sets = S.sets.filter(s => s.id !== id);
    // renumera as séries restantes do exercício
    const exId = ds.closest('.ex').id.slice(3);
    const rest = setsOf(exId); for (let i = 0; i < rest.length; i++) if (rest[i].setIndex !== i) { rest[i].setIndex = i; await db.put('sets', rest[i]); }
    renderSessao(); toast('Série apagada.'); return; }

  const ex = t.closest('[data-extra]'); if (ex) { S.extra = ex.dataset.extra; renderSessao(); return; }
  const how = t.closest('[data-how]'); if (how) { howSheet(itemById(how.dataset.how)); return; }

  const sg = t.closest('.seg [data-v]');
  if (sg) { $$('[data-v]', sg.parentElement).forEach(b => b.setAttribute('aria-pressed', String(b === sg))); return; }

  const del = t.closest('[data-del]');
  if (del) { const [store, id] = del.dataset.del.split(':'); if (confirm('Apagar este registro?')) { await db.del(store, Number(id)); route(); } return; }

  const imp = t.closest('[data-imp]');
  if (imp) { try { await db.importAll(importFile.pending, imp.dataset.imp); closeSheet(); toast('Dados importados.'); route(); }
    catch (err) { toast(err.message, 4000); } return; }

  const act = t.closest('[data-act]')?.dataset.act;
  if (!act) return;
  if (act === 'setStart') { const v = $('#startDate').value; if (!v) return; await db.setSetting('startDate', v); toast('Data de início salva.'); route(); }
  if (act === 'saveWeight') { const w = num($('#wQuick').value); if (!w) { toast('Informe o peso.'); return; }
    await db.add('body', { date: todayStr(), weight: w, waist: null, note: '' }); toast('Peso salvo.'); route(); }
  if (act === 'cardioForm') cardioForm();
  if (act === 'saveCardio') { const m = num($('#kMin').value); if (!m) { toast('Informe os minutos.'); return; }
    await db.add('cardio', { date: $('#kDate').value || todayStr(), type: segVal('kType'), minutes: m, effort: segVal('kEff'), note: $('#kNote').value.trim() });
    closeSheet(); toast('Cardio salvo.'); route(); }
  if (act === 'saveBody') { const w = num($('#bW').value), waist = num($('#bWaist').value);
    if (w == null && waist == null) { toast('Informe o peso ou a cintura.'); return; }
    await db.add('body', { date: $('#bDate').value || todayStr(), weight: w, waist, note: $('#bNote').value.trim() }); toast('Medida salva.'); route(); }
  if (act === 'saveComp') {
    const w = num($('#cW').value), fat = num($('#cFat').value);
    let fatKg = num($('#cFatKg').value), lean = num($('#cLean').value);
    if (fat == null && fatKg == null) { toast('Informe ao menos o % de gordura.'); return; }
    if (fatKg == null && w && fat != null) fatKg = Math.round(w * fat) / 100;
    if (lean == null && w && fatKg != null) lean = Math.round((w - fatKg) * 100) / 100;
    const method = $('#cMethod').value;
    await db.add('comps', { date: $('#cDate').value || todayStr(), method, weight: w, fatPct: fat, fatKg, leanKg: lean,
      muscleKg: num($('#cMus').value), visceral: num($('#cVis').value), note: $('#cNote').value.trim() });
    if (w) await db.add('body', { date: $('#cDate').value || todayStr(), weight: w, waist: null, note: `avaliação (${method})` });
    toast('Avaliação salva.'); route(); }
  if (act === 'finish') finishSession();
  if (act === 'export') exportData();
  if (act === 'wipe') {
    if (!confirm('Apagar TODOS os dados deste aparelho?')) return;
    if (!confirm('Tem certeza? Isso não pode ser desfeito.')) return;
    for (const s of ['sessions', 'sets', 'body', 'comps', 'cardio', 'settings']) await db.clear(s);
    toast('Dados apagados.'); location.hash = 'hoje'; route();
  }
});

/* ================= rotas ================= */
async function route() {
  closeSheet(); destroyCharts();
  const [r, arg] = (location.hash.slice(1) || 'hoje').split('/');
  $$('.nav a').forEach(a => a.setAttribute('aria-current', a.dataset.r === (r === 'guia' ? 'mais' : r) ? 'page' : 'false'));
  try {
    if (r === 'treino' && arg) await viewSessao(arg);
    else if (r === 'treino') await viewTreinoLista();
    else if (r === 'progresso') await viewProgresso();
    else if (r === 'corpo') await viewCorpo();
    else if (r === 'mais') await viewMais();
    else if (r === 'guia') viewGuia();
    else await viewHoje();
  } catch (err) {
    console.error(err);
    main.innerHTML = `<div class="card"><h2>Algo deu errado</h2><p class="muted">${esc(err.message)}</p><p class="small muted">Recarregue o app. Se persistir, exporte um backup em Mais.</p></div>`;
  }
}
let lastRoute = null;
window.addEventListener('hashchange', () => {
  const r = location.hash; if (r !== lastRoute) { lastRoute = r; window.scrollTo(0, 0); route(); }
});
lastRoute = location.hash; route();

/* ================= service worker (offline e atualização) ================= */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      nw?.addEventListener('statechange', () => {
        if (nw.state === 'installed' && navigator.serviceWorker.controller) {
          const t = $('#toast'); t.innerHTML = 'Nova versão disponível. <u>Toque para atualizar</u>'; t.classList.add('on');
          t.onclick = () => { nw.postMessage('skipWaiting'); };
        }
      });
    });
  }).catch(() => {});
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (!reloaded) { reloaded = true; location.reload(); } });
}
