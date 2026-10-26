// Sessão de treino: registro série por série.
import { $, esc, todayStr, fmtShort, fmtLong, num, fmtN } from '../util.js';
import { e1rm, planById, EFFORT, isTimed, range, rirFor, program, phaseLabel, loadAll, lastSetsFor, suggestion } from '../training.js';
import { main, setBar, toast, openSheet, unlockAudio, startTimer } from '../ui.js';
import { db } from '../db.js';
import { MUSCLES } from '../plan.js';
import { bodyMap } from '../bodymap.js';

/* ================= tela: sessão de treino ================= */
export const S = { plan: null, session: null, sets: [], last: {}, open: new Set(), phase: 0 };

export async function viewSessao(planId) {
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
export const setsOf = exId => S.sets.filter(s => s.exId === exId).sort((a, b) => a.setIndex - b.setIndex);
export const doneCount = it => setsOf(it.id).length;
export function openWithPartner(id) {
  const it = S.plan.items.find(i => i.id === id); S.open.add(id);
  if (it && it.group) S.plan.items.filter(i => i.group === it.group).forEach(i => S.open.add(i.id));
}

export function renderSessao() {
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

export function exCardInner(it) {
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

export async function saveSet(exId) {
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

export async function finishSession() {
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

export function howSheet(it) {
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
