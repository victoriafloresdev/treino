// Sessão de treino: uma carga e uma dificuldade por exercício, valendo para todas as séries do dia.
import { $, esc, fmtShort, fmtLong, num, fmtN, todayStr } from '../util.js';
import { planById, EFFORT, isTimed, rirFor, program, phaseLabel, loadAll, historyFor, entryOf, suggestion, workoutOrder, suggestedWorkout } from '../training.js';
import { app, main, setBar, toast, openSheet, announceAchievements, on, onChange } from '../ui.js';
import { icon } from '../ui/icons.js';
import { viewDate, dateNavHTML } from '../ui/dia-ativo.js';
import { db } from '../db.js';
import { exSessions, trendOf } from '../progress.js';
import { MUSCLES } from '../plan.js';
import { bodyMap } from '../bodymap.js';

/* ================= tela: sessão de treino ================= */
export const S = { plan: null, session: null, sets: [], hist: {}, open: new Set(), phase: 0, pick: null };

// Sub-abas da aba Treino (também usadas pelo Cardio)
export function treinoNav(cur) {
  return `<nav class="subtabs" aria-label="Partes do treino">
    <a href="#treino" ${cur === 'musc' ? 'aria-current="page"' : ''}>Musculação</a>
    <a href="#treino/cardio" ${cur === 'cardio' ? 'aria-current="page"' : ''}>Cardio</a></nav>`;
}
// Seletor dos 4 treinos (radio nativo), na ordem da sequência; marca o sugerido e o já feito nesse dia
function pickerHTML(planId, order, sugId, doneIds) {
  return `<fieldset class="wpick" data-on="pickWorkout"><legend class="sr">Treino</legend>
    ${order.map(id => planById(id)).map(p => `<label><input type="radio" name="pickWorkout" value="${p.id}" ${p.id === planId ? 'checked' : ''}>
      <span><b>${esc(p.name)}</b>${doneIds.has(p.id) ? `<small>${icon('check-circle-fill')} registrado</small>` : p.id === sugId ? '<small>sugerido</small>' : ''}</span></label>`).join('')}
  </fieldset>`;
}

export async function viewSessao(planId) {
  // descarta o desenho se outra tela foi aberta enquanto este esperava o banco
  const tok = app.seq;
  const p = await program();
  const all = await loadAll(), order = await workoutOrder(), date = viewDate();
  const sugId = suggestedWorkout(all, order, date);
  const pl = planById(planId || sugId);
  if (!pl) { location.hash = 'treino'; return; }
  S.plan = pl; S.phase = p.phase;
  const sessions = (await db.byIndex('sessions', 'date', date)).filter(s => s.planId === pl.id).sort((a, b) => b.startedAt - a.startedAt);
  S.session = sessions[0] || null;
  S.sets = S.session ? await db.byIndex('sets', 'sessionId', S.session.id) : [];
  S.hist = {}; S.allSets = all.sets;
  for (const it of pl.items) S.hist[it.id] = await historyFor(it.id, S.session?.id);
  if (!S.open.size || ![...S.open].some(id => pl.items.some(i => i.id === id))) {
    S.open = new Set();
    const firstPending = pl.items.find(it => !savedOf(it.id));
    if (firstPending) S.open.add(firstPending.id);
  }
  const doneIds = new Set(all.realSessions.filter(s => s.date === date).map(s => s.planId));
  if (tok !== app.seq) return;
  setBar('Treino', phaseLabel(p));
  main.innerHTML = treinoNav('musc') + dateNavHTML() + pickerHTML(pl.id, order, sugId, doneIds) + '<div id="sessao"></div>';
  renderSessao();
}
const setsOf = exId => S.sets.filter(s => s.exId === exId);
// o registro do exercício nesta sessão (carga, dificuldade, nº de séries), ou null
const savedOf = exId => { const ss = setsOf(exId); return ss.length ? entryOf(ss) : null; };

export function renderSessao() {
  const pl = S.plan, ph = S.phase;
  const total = pl.items.length, done = pl.items.filter(it => savedOf(it.id)).length;
  let html = `
    <div class="wk-head"><div><h2 class="wk-name">${esc(pl.name)}</h2><div class="kind">${esc(pl.focus)} · ${pl.time[ph]}</div></div>
      <div class="wk-count"><span class="num">${done}</span>/<span class="num">${total}</span><small>exercícios</small></div></div>
    <div class="progressbar"><i style="width:${total ? (100 * done / total) : 0}%"></i></div>
    <details class="warm"><summary>Aquecimento (5–8 min)</summary>
      <p>3–5 min de bicicleta ou elíptico leve. No primeiro exercício, 2 séries leves: ~50% da carga × 10 e ~75% × 5. Aquecimento não conta como série, então não registre.</p></details>`;
  pl.items.forEach(it => {
    html += `<div class="ex ${S.open.has(it.id) ? 'open' : ''} ${savedOf(it.id) ? 'done' : ''}" id="ex-${it.id}">${exCardInner(it)}</div>`;
  });
  html += `<div class="sess-end"><button class="btn solid block" type="button" data-act="finish" ${S.sets.length ? '' : 'disabled'}>${S.session?.finishedAt ? 'Ver resumo do treino' : 'Finalizar treino'}</button></div>`;
  (document.getElementById('sessao') || main).innerHTML = html;
}

const kgTxt = e => `${fmtN(e.kg)} kg`;
export function exCardInner(it) {
  const ph = S.phase, target = it.sets[ph], timed = isTimed(it);
  const saved = savedOf(it.id), hist = S.hist[it.id] || [], last = hist[0];
  const val = saved ? (timed ? saved.secs : saved.kg) : last ? (timed ? last.secs : last.kg) : '';
  const right = saved ? (timed ? `${saved.secs} s` : kgTxt(saved)) : '';
  const lastTxt = last ? `Última vez (${fmtShort(last.date)}): ${timed ? `${last.secs} s` : kgTxt(last)}${last.effort ? `, ${EFFORT[last.effort].l.toLowerCase()}` : ''}.`
    : timed ? 'Primeira vez: segure o quanto conseguir com boa postura.' : 'Primeira vez: escolha uma carga em que sobrariam 3–4 repetições.';
  const sug = suggestion(it, hist, ph);
  return `
    <button class="ex-top" type="button" data-toggle="${it.id}" aria-expanded="${S.open.has(it.id)}">
      <span class="n">${saved ? icon('check-circle-fill') : it.n}</span>
      <span><span class="t">${esc(it.name)}</span><span class="s">${target} × ${esc(it.reps)} · RIR ${esc(rirFor(it, ph))}</span></span>
      <span class="c">${right}</span>
    </button>
    <div class="ex-body">
      <p class="ex-hint">${esc(lastTxt)}${sug ? ` <b>${esc(sug)}</b>` : ''}</p>
      <div class="ex-form" data-exform="${it.id}">
        <div class="kg-field"><label for="v-${it.id}">${timed ? 'Segundos' : 'Carga (kg)'}</label>
          <div class="kg-step"><button type="button" data-act="kgStep" data-ex="${it.id}" data-v="${timed ? -5 : -2.5}" aria-label="${timed ? 'Menos 5 segundos' : 'Menos 2,5 kg'}">${icon('minus')}</button>
            <input id="v-${it.id}" name="v" inputmode="${timed ? 'numeric' : 'decimal'}" value="${val === '' ? '' : String(val).replace('.', ',')}" placeholder="${timed ? 's' : 'kg'}" autocomplete="off">
            <button type="button" data-act="kgStep" data-ex="${it.id}" data-v="${timed ? 5 : 2.5}" aria-label="${timed ? 'Mais 5 segundos' : 'Mais 2,5 kg'}">${icon('plus')}</button></div></div>
        <fieldset class="effort"><legend>Como foi?</legend>
          ${['facil', 'medio', 'dificil'].map(e => `<label class="e-${e}"><input type="radio" name="eff-${it.id}" value="${e}" ${saved?.effort === e ? 'checked' : ''}><span>${EFFORT[e].l}</span></label>`).join('')}
        </fieldset>
        <button class="btn solid block" type="button" data-act="exSave" data-ex="${it.id}">${saved ? 'Atualizar' : 'Salvar'} · ${target} ${target === 1 ? 'série' : 'séries'}</button>
      </div>
      <div class="ex-links">
        <button class="linkbtn" type="button" data-how="${it.id}">Detalhes e como fazer</button>
        ${saved ? `<button class="linkbtn muted" type="button" data-act="exDel" data-ex="${it.id}">Apagar registro</button>` : ''}
      </div>
    </div>`;
}

async function saveExercise(exId) {
  const it = S.plan.items.find(i => i.id === exId);
  const form = $(`[data-exform="${exId}"]`);
  const timed = isTimed(it);
  const v = num($('[name=v]', form).value);
  const effort = form.querySelector(`input[name="eff-${exId}"]:checked`)?.value || null;
  if (v == null || (timed && !v)) { toast(timed ? 'Informe os segundos.' : 'Informe a carga em kg (0 se for só o peso do corpo).'); return; }
  if (!effort) { toast('Escolha como foi: Fácil, Médio ou Difícil.'); return; }
  if (!S.session) {
    // num dia que passou, a sessão fica com a data dele
    const s = { date: viewDate(), planId: S.plan.id, startedAt: Date.now(), finishedAt: null };
    s.id = await db.add('sessions', s); S.session = s;
    if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  }
  // o registro vale para todas as séries previstas: uma linha por série, como antes, sem repetições
  for (const s of setsOf(exId)) await db.del('sets', s.id);
  S.sets = S.sets.filter(s => s.exId !== exId);
  const n = it.sets[S.phase], ts = Date.now();
  for (let i = 0; i < n; i++) {
    const row = { sessionId: S.session.id, date: S.session.date, planId: S.plan.id, exId, setIndex: i,
      kg: timed ? null : v, reps: null, secs: timed ? v : null, effort, rir: EFFORT[effort].rir, perExercise: true, ts: ts + i };
    row.id = await db.add('sets', row);
    S.sets.push(row);
  }
  S.open.delete(exId);
  const nxt = S.plan.items.find(i => !savedOf(i.id));
  if (nxt) S.open.add(nxt.id);
  const y = window.scrollY;
  renderSessao();
  window.scrollTo(0, y);
  if (nxt) $(`#ex-${nxt.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export async function finishSession() {
  if (!S.session) return;
  if (!S.session.finishedAt) { S.session.finishedAt = Date.now(); await db.put('sessions', S.session); }
  const all = await loadAll();
  const dur = Math.max(1, Math.round((S.session.finishedAt - S.session.startedAt) / 60000));
  const entries = S.plan.items.map(it => ({ it, e: savedOf(it.id) })).filter(x => x.e);
  // recorde de carga: maior que qualquer carga anterior do exercício
  const prs = entries.filter(({ it, e }) => {
    if (isTimed(it) || !e.kg) return false;
    const before = Math.max(0, ...all.sets.filter(s => s.exId === it.id && s.sessionId !== S.session.id).map(s => s.kg || 0));
    return before > 0 && e.kg > before + 0.01;
  }).map(({ it, e }) => `${it.name}: ${fmtN(e.kg)} kg`);
  const hard = entries.filter(x => x.e.effort === 'dificil').length;
  openSheet(`
    <h2>Treino registrado</h2>
    <p class="muted">${esc(S.plan.name)} · ${fmtLong(S.session.date)}</p>
    <div class="kpis">
      <div class="kpi"><div class="v">${entries.length}</div><div class="l">de ${S.plan.items.length} exercícios</div></div>
      <div class="kpi"><div class="v">${hard}</div><div class="l">${hard === 1 ? 'foi difícil' : 'foram difíceis'}</div></div>
    </div>
    ${S.session.date === todayStr() ? `<p class="small muted">Cerca de ${dur} min entre o primeiro registro e o fim.</p>` : ''}
    ${prs.length ? `<h4>Maior carga até hoje</h4><ul>${prs.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : `<p class="muted">Manter a carga com boa técnica também é progresso.</p>`}
    <div class="form-actions"><a class="btn solid block" href="#hoje" data-close>Voltar para Hoje</a></div>`);
  renderSessao();
  S.allSets = (await loadAll()).sets;
  announceAchievements();
}

// Detalhes do exercício: prescrição, histórico, foto, músculos e execução
export function howSheet(it) {
  const fr = it.frames || [0, 1], ph = S.phase;
  const hist = S.hist[it.id] || [];
  const t = trendOf(exSessions(S.allSets || [], it.id), isTimed(it));
  openSheet(`
    <h2>${esc(it.name)}</h2>
    <dl class="ex-meta">
      <div><dt>Séries</dt><dd>${it.sets[ph]}</dd></div><div><dt>Reps</dt><dd>${esc(it.reps)}</dd></div>
      <div><dt>RIR</dt><dd>${esc(rirFor(it, ph).replace('Pare ao perder o alinhamento', 'técnica'))}</dd></div><div><dt>Descanso</dt><dd>${esc(it.rest.replace('90 s–2 min', '1,5–2 min'))}</dd></div>
    </dl>
    ${hist.length ? `<h4>Últimas vezes</h4><ul class="hist">${hist.slice(0, 4).map(h => `<li><span>${fmtShort(h.date)}</span><b class="num">${isTimed(it) ? `${h.secs} s` : kgTxt(h)}</b><span class="muted">${h.effort ? EFFORT[h.effort].l : ''}</span></li>`).join('')}</ul>
      ${t ? `<p class="small muted"><span aria-hidden="true">${t.arrow}</span> Tendência: ${t.label}</p>` : ''}` : ''}
    <div class="media"><img src="img/ex/${it.img}-${fr[0]}.jpg" alt="${esc(it.name)}">${fr[0] !== fr[1] ? `<img class="f2" src="img/ex/${it.img}-${fr[1]}.jpg" alt="">` : ''}</div>
    ${it.imgNote ? `<p class="small muted">${esc(it.imgNote)}</p>` : ''}
    <div class="ex-map">${bodyMap(it.prim, it.sec, 'Músculos: ' + it.prim.map(m => MUSCLES[m]).join(', '))}
      <p><b>Principal:</b> ${esc(it.prim.map(m => MUSCLES[m]).join(', '))}${it.sec.length ? `<br><span class="muted"><b>Ajudam:</b> ${esc(it.sec.map(m => MUSCLES[m]).join(', '))}</span>` : ''}</p></div>
    <div class="foco"><small>Onde sentir</small>${esc(it.foco)}</div>
    <h4>Execução</h4><ul>${it.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    ${it.postura ? `<div class="postura"><b>Postura:</b> ${esc(it.postura)}</div>` : ''}
    <h4>Evite</h4><ul>${it.evite.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <p><b>Aparelho ocupado?</b> ${esc(it.alt)}</p>
    <a class="btn block" href="https://www.youtube.com/results?search_query=${encodeURIComponent(it.q)}" target="_blank" rel="noopener">Ver vídeos da execução no YouTube</a>`);
}

on({
  // ± 2,5 kg (ou ± 5 s) no campo do exercício
  kgStep(el) {
    const inp = document.getElementById('v-' + el.dataset.ex);
    const v = Math.max(0, (num(inp.value) || 0) + Number(el.dataset.v));
    inp.value = String(Math.round(v * 100) / 100).replace('.', ',');
  },
  async exSave(el) { el.disabled = true; try { await saveExercise(el.dataset.ex); } finally { el.disabled = false; } },
  async exDel(el) {
    for (const s of setsOf(el.dataset.ex)) await db.del('sets', s.id);
    S.sets = S.sets.filter(s => s.exId !== el.dataset.ex);
    renderSessao(); toast('Registro apagado.');
  }
});
onChange({
  pickWorkout(el, e) { S.pick = e.target.value; S.open = new Set(); location.hash = 'treino/' + e.target.value; }
});
