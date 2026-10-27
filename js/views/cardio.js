// Cardio da manhã: timer de intervalos, registro, pergunta sobre dor e progressão da corrida.
import { $, esc, todayStr, fmtShort, num, pad2, DIAS, parseDate, addDays } from '../util.js';
import { program, phaseLabel } from '../training.js';
import { app, main, setBar, on, onChange, openSheet, closeSheet, toast, beep, unlockAudio, announceAchievements } from '../ui.js';
import { db } from '../db.js';
import { treinoNav } from './sessao.js';
import { STAGES, LAST_STAGE, PAIN, painLabel, weekStage, cardioOfDay, totalSecs, timerAt, progression, pendingPainCheck } from '../cardio.js';

/* ---------- etapa atual ---------- */
export async function getStage() {
  const s = await db.setting('runStage');
  if (Number.isInteger(s) && s >= 0 && s <= LAST_STAGE) return s;
  // sem etapa salva: a da corrida mais recente registrada; sem histórico, a que a semana do programa libera
  const last = (await db.all('cardio')).filter(r => Number.isInteger(r.stage)).sort((a, b) => (a.date < b.date ? 1 : -1))[0];
  if (last) return last.stage;
  const p = await program();
  return weekStage(Math.max(p.week, 1));
}
const setStage = n => db.setSetting('runStage', Math.max(0, Math.min(LAST_STAGE, n)));
export async function cardioToday(date = todayStr()) {
  return cardioOfDay(parseDate(date).getDay(), await getStage());
}

/* ---------- timer (por relógio: não atrasa com a tela bloqueada) ---------- */
const T = { run: null, int: null, lastIdx: -1, lock: null };
const mmss = s => `${Math.floor(Math.max(0, s) / 60)}:${pad2(Math.floor(Math.max(0, s) % 60))}`;
const elapsedOf = r => ((r.pausedAt || Date.now()) - r.startedAt - (r.pausedMs || 0)) / 1000;
async function loadRun() {
  if (!T.run) T.run = (await db.setting('cardioTimer')) || null;
  if (T.run && T.run.date !== todayStr()) { T.run = null; await db.setSetting('cardioTimer', null); }
  return T.run;
}
const saveRun = () => db.setSetting('cardioTimer', T.run);
async function wakeLock(on) {
  try {
    if (on && 'wakeLock' in navigator && !T.lock) { T.lock = await navigator.wakeLock.request('screen'); T.lock.addEventListener?.('release', () => { T.lock = null; }); }
    if (!on && T.lock) { await T.lock.release(); T.lock = null; }
  } catch (e) { T.lock = null; }
}
// a trava de tela cai quando o app vai para o fundo; ao voltar, pede de novo
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && T.run && !T.run.pausedAt && !T.run.finished) wakeLock(true); });

function tick() {
  const box = document.getElementById('cTimer');
  if (!box) { clearInterval(T.int); T.int = null; return; }
  const r = T.run; if (!r) return;
  const t = timerAt(r.segs, elapsedOf(r));
  if (t.done && !r.finished) {
    r.finished = true; saveRun(); wakeLock(false);
    beep(990); setTimeout(() => beep(990), 350); setTimeout(() => beep(1320), 700);
    if (navigator.vibrate) navigator.vibrate([300, 150, 300]);
  } else if (!t.done && T.lastIdx !== -1 && t.idx !== T.lastIdx && !r.pausedAt && document.visibilityState === 'visible') {
    beep(t.seg.kind === 'trote' ? 990 : 660);
    if (navigator.vibrate) navigator.vibrate(t.seg.kind === 'trote' ? [200, 100, 200] : [400]);
    box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
  }
  T.lastIdx = t.idx;
  box.innerHTML = timerInner(r, t);
}
function timerInner(r, t) {
  const total = totalSecs(r.segs);
  if (t.done) return `<div class="tm-seg done">Cardio concluído</div><div class="tm-big">${mmss(total)}</div>
    <p>Muito bem. Registre como foi para acompanhar a etapa.</p>
    <div class="row"><button class="btn solid" type="button" data-act="cardioForm">Registrar cardio</button>
      <button class="btn" type="button" data-act="timerReset">Zerar timer</button></div>`;
  return `<div class="tm-seg ${t.seg.kind}">${esc(t.seg.label)}</div>
    <div class="tm-big" aria-live="off">${mmss(t.segLeft)}</div>
    <p class="tm-sub">Faltam ${mmss(t.totalLeft)} no total · bloco ${t.idx + 1} de ${r.segs.length}</p>
    ${t.next ? `<p class="tm-next">Depois: <b>${esc(t.next.label)}</b>, ${mmss(t.next.secs)}</p>` : '<p class="tm-next">Último bloco</p>'}
    <div class="tm-bar" aria-hidden="true">${r.segs.map((s, i) => `<i class="${s.kind} ${i < t.idx ? 'past' : i === t.idx ? 'cur' : ''}" style="flex:${s.secs}"></i>`).join('')}</div>
    <div class="row">${r.pausedAt ? '<button class="btn solid" type="button" data-act="timerResume">Continuar</button>' : '<button class="btn solid" type="button" data-act="timerPause">Pausar</button>'}
      <button class="btn" type="button" data-act="timerEnd">Encerrar</button></div>`;
}
function startTicking() { clearInterval(T.int); T.lastIdx = -1; tick(); T.int = setInterval(tick, 250); }

/* ---------- tela ---------- */
export async function viewCardio() {
  const tok = app.seq;
  const p = await program();
  const today = todayStr(), stage = await getStage();
  const c = cardioOfDay(new Date().getDay(), stage);
  const recs = (await db.all('cardio')).sort((a, b) => (a.date < b.date ? 1 : -1));
  const prog = progression(recs, stage, Math.max(p.week, 1));
  const ack = await db.setting('runPainAck');
  const run = await loadRun();
  const pending = pendingPainCheck(recs, today);
  if (tok !== app.seq) return;
  setBar('Treino', phaseLabel(p));
  const total = totalSecs(c.segs);
  main.innerHTML = treinoNav('cardio') + `
    ${pending ? painCardHTML(pending, today) : ''}
    <div class="card"><div class="spread"><h2>${c.kind === 'corrida' ? `Corrida · ${esc(c.label)} de ${STAGES.length}` : c.kind === 'descanso' ? 'Domingo' : 'Caminhada'}</h2></div>
      <p style="margin:6px 0 0">${esc(c.text)}</p>
      ${c.kind === 'corrida' ? `<p class="small muted" style="margin:6px 0 0">Trote leve: dá para falar frases curtas. Caminhada: conversa normal.</p>` : ''}
    </div>
    ${c.kind === 'corrida' || ['dor', 'avancar'].includes(prog.state) ? progressHTML(prog, stage, ack, c.kind !== 'corrida') : ''}
    ${c.kind === 'descanso' ? '<div class="card"><p style="margin:0">Hoje é descanso completo. Se quiser se mexer, uma caminhada leve e curta.</p><div class="form-actions"><button class="btn" type="button" data-act="cardioForm">Registrar cardio mesmo assim</button></div></div>' : `
    <section class="card timer-card" aria-label="Timer de intervalos">
      <div id="cTimer" class="tm">${run ? '' : `
        <div class="tm-seg">${c.segs.length > 1 ? `${c.segs.filter(s => s.kind === 'trote').length} blocos de trote` : esc(c.segs[0].label)}</div>
        <div class="tm-big">${mmss(total)}</div>
        <div class="tm-bar" aria-hidden="true">${c.segs.map(s => `<i class="${s.kind}" style="flex:${s.secs}"></i>`).join('')}</div>
        <p class="small muted">${c.segs.length > 1 ? 'A cada troca de bloco o app toca um bip e vibra quando o aparelho permite.' : 'O app avisa quando o tempo terminar.'}
          ${'wakeLock' in navigator ? 'A tela fica ligada durante o timer.' : 'Deixe a tela ligada: com ela bloqueada, o som não toca (o tempo continua contando).'}</p>
        <div class="row"><button class="btn solid" type="button" data-act="timerStart">Começar</button></div>`}</div>
    </section>
    <div class="form-actions"><button class="btn block" type="button" data-act="cardioForm">Registrar cardio sem o timer</button></div>`}
    <h2 class="section-title">Últimos cardios</h2>
    <div class="card">${recs.length ? `<ul class="rows">${recs.slice(0, 8).map(r => `<li><div><b>${fmtShort(r.date)} · ${r.minutes} min de ${esc(r.type)}</b>
      <span class="small muted">${[r.stage != null ? STAGES[r.stage]?.label + (r.completed ? ` (${{ sim: 'completa', parcial: 'parcial', nao: 'não completou' }[r.completed]})` : '') : '', r.effort, r.distanceKm ? String(r.distanceKm).replace('.', ',') + ' km' : '', r.painNextDay ? 'dor no dia seguinte: ' + painLabel(r.painNextDay).toLowerCase() : ''].filter(Boolean).join(' · ')}</span></div>
      <button class="del x" data-del="cardio:${r.id}" aria-label="Apagar cardio de ${fmtShort(r.date)}" title="Apagar">✕</button></li>`).join('')}</ul>` : '<p class="empty">Nenhum cardio registrado ainda.</p>'}</div>
    <details class="card adjust"><summary>Ajustar a etapa manualmente</summary>
      <fieldset class="chipset" data-on="stagePick"><legend>Etapa atual da corrida</legend><div class="segr">
        ${STAGES.map(s => `<label><input type="radio" name="stagePick" value="${s.n}" ${s.n === stage ? 'checked' : ''}><span>${s.label}</span></label>`).join('')}</div></fieldset>
      <p class="small muted">Use só se a etapa salva não corresponder ao que você está fazendo.</p></details>`;
  if (run) startTicking();
}

function progressHTML(prog, stage, ack, outside) {
  const next = STAGES[stage + 1];
  // fora do dia de corrida, o card diz de que se trata
  const tag = outside ? `<span class="small muted">Corrida · ${esc(STAGES[stage].label)}</span>` : '';
  if (prog.state === 'dor') {
    const acked = ack === prog.date;
    return `<div class="card prog dor">${tag}<h3>Dor depois da corrida de ${fmtShort(prog.date)}: ${esc(painLabel(prog.pain).toLowerCase())}</h3>
      <p>${acked ? 'Você escolheu repetir esta etapa. A sugestão de avançar volta depois de 2 sessões completas sem dor.' : 'Antes de avançar, a etapa precisa de 2 sessões completas sem dor no dia seguinte. O que prefere?'}</p>
      ${acked ? '' : `<div class="row"><button class="btn solid" type="button" data-act="stageRepeat" data-date="${prog.date}">Repetir esta etapa</button>
        ${prog.canBack ? `<button class="btn" type="button" data-act="stageBack">Voltar para a ${esc(STAGES[stage - 1].label.toLowerCase())}</button>` : ''}</div>`}
      <p class="small muted">Dor que não passa em alguns dias, que piora ou que muda o jeito de pisar: pare a corrida e procure avaliação.</p></div>`;
  }
  if (prog.state === 'avancar') return `<div class="card prog ok">${tag}<h3>Pronta para a ${esc(next.label.toLowerCase())}</h3>
    <p>2 sessões completas sem dor no dia seguinte. Próxima: ${esc(next.text)}.</p>
    <div class="row"><button class="btn solid" type="button" data-act="stageNext">Avançar para a ${esc(next.label.toLowerCase())}</button></div>
    <p class="small muted">Se preferir, continue mais uma semana nesta etapa. Não há pressa.</p></div>`;
  if (prog.state === 'aguardar') return `<div class="card prog"><p style="margin:0">2 sessões completas sem dor nesta etapa. A ${esc(next.label.toLowerCase())} fica disponível a partir da semana ${prog.fromWeek} do programa.</p></div>`;
  if (prog.state === 'final') return `<div class="card prog ok"><p style="margin:0">Você está na última etapa do plano e completando sem dor. Mantenha e reveja a ficha com calma.</p></div>`;
  return `<div class="card prog"><p style="margin:0"><b>${prog.streak} de 2</b> sessões completas sem dor no dia seguinte nesta etapa.</p></div>`;
}

/* ---------- pergunta sobre dor (tela Hoje e Cardio) ---------- */
export function painCardHTML(rec, today) {
  const when = rec.date === addDays(today, -1) ? 'de ontem' : `de ${DIAS[parseDate(rec.date).getDay()]}`;
  return `<div class="card pain-ask"><h3>Alguma dor da corrida ${when}?</h3>
    <fieldset class="chipset" data-on="painAnswer" data-id="${rec.id}"><legend class="sr">Dor no dia seguinte à corrida</legend><div class="opts wrap">
      ${PAIN.map(([v, l]) => `<label class="chip"><input type="radio" name="pain-${rec.id}" value="${v}"><span>${l}</span></label>`).join('')}</div></fieldset>
    <p class="small muted">Serve para decidir quando avançar de etapa na corrida.</p></div>`;
}
export async function pendingPain(today = todayStr()) { return pendingPainCheck(await db.all('cardio'), today); }

/* ---------- registro ---------- */
export async function cardioForm() {
  const today = todayStr(), c = await cardioToday(today), run = await loadRun();
  const minutes = run ? Math.max(1, Math.round(Math.min(elapsedOf(run), totalSecs(run.segs)) / 60)) : 30;
  const type = c.kind === 'corrida' && c.stage > 0 ? 'intervalado' : 'caminhada';
  const done = run?.finished ? 'sim' : run ? 'parcial' : 'sim';
  const radios = (name, list, sel) => `<div class="segr ${list.length === 3 ? 'c3' : ''}">${list.map(([v, l]) => `<label><input type="radio" name="${name}" value="${v}" ${v === sel ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
  openSheet(`<h2>Registrar cardio</h2>
    <label class="f" style="margin-top:8px">Data<input type="date" id="kDate" value="${today}"></label>
    <fieldset class="chipset"><legend>Tipo</legend>${radios('kType', [['caminhada', 'Caminhada'], ['intervalado', 'Intercalado'], ['corrida', 'Corrida']], type)}</fieldset>
    <label class="f">Minutos<input id="kMin" inputmode="numeric" value="${minutes}"></label>
    ${c.kind === 'corrida' ? `<fieldset class="chipset"><legend>Completou a ${esc(c.label.toLowerCase())}?</legend>${radios('kDone', [['sim', 'Sim'], ['parcial', 'Em parte'], ['nao', 'Não']], done)}</fieldset>` : ''}
    <fieldset class="chipset"><legend>Como foi</legend>${radios('kEff', [['leve', 'Leve'], ['moderado', 'Moderado'], ['forte', 'Forte']], 'moderado')}</fieldset>
    <details class="more"><summary>Velocidade, inclinação e distância (opcional)</summary>
      <div class="grid2">
        <label class="f">Caminhada (km/h)<input id="kVw" inputmode="decimal" placeholder="ex.: 5,5"></label>
        <label class="f">Trote (km/h)<input id="kVr" inputmode="decimal" placeholder="ex.: 7,5"></label>
        <label class="f">Inclinação (%)<input id="kInc" inputmode="decimal" placeholder="ex.: 3"></label>
        <label class="f">Distância (km)<input id="kDist" inputmode="decimal" placeholder="ex.: 3,2"></label>
      </div></details>
    <label class="f" style="margin-top:12px">Observação<input id="kNote" placeholder="ex.: canela ok, inclinação 5%"></label>
    <div class="form-actions"><button class="btn solid block" type="button" data-act="saveCardio" data-stage="${c.kind === 'corrida' ? c.stage : ''}">Salvar cardio</button></div>`);
}
const radioVal = name => document.querySelector(`#sheet input[name="${name}"]:checked`)?.value;
async function saveCardio(el) {
  const m = num($('#kMin').value); if (!m) { toast('Informe os minutos.'); return; }
  const date = $('#kDate').value || todayStr();
  const rec = { date, type: radioVal('kType'), minutes: m, effort: radioVal('kEff'), note: $('#kNote').value.trim() };
  // a etapa só vale para o cardio de corrida do próprio dia
  if (el.dataset.stage !== '' && date === todayStr()) { rec.stage = Number(el.dataset.stage); rec.completed = radioVal('kDone') || 'sim'; }
  const vw = num($('#kVw').value), vr = num($('#kVr').value), inc = num($('#kInc').value), dist = num($('#kDist').value);
  if (vw != null || vr != null) rec.speeds = { walk: vw, run: vr };
  if (inc != null) rec.incline = inc;
  if (dist != null) rec.distanceKm = dist;
  await db.add('cardio', rec);
  if (T.run) { T.run = null; await saveRun(); wakeLock(false); }
  closeSheet(); toast('Cardio salvo.'); app.route();
  announceAchievements();
}

/* ---------- ações ---------- */
on({
  cardioForm, saveCardio,
  async timerStart() {
    unlockAudio();
    const c = await cardioToday();
    T.run = { date: todayStr(), kind: c.kind, stage: c.stage ?? null, segs: c.segs, startedAt: Date.now(), pausedAt: null, pausedMs: 0 };
    await saveRun(); wakeLock(true); beep(660); startTicking();
  },
  async timerPause() { if (!T.run) return; T.run.pausedAt = Date.now(); await saveRun(); wakeLock(false); tick(); },
  async timerResume() { if (!T.run) return; unlockAudio(); T.run.pausedMs += Date.now() - T.run.pausedAt; T.run.pausedAt = null; await saveRun(); wakeLock(true); tick(); },
  async timerEnd() { if (!T.run) return; if (!T.run.pausedAt) T.run.pausedAt = Date.now(); await saveRun(); wakeLock(false); cardioForm(); },
  async timerReset() { T.run = null; await saveRun(); app.route(); },
  async stageNext() { await setStage((await getStage()) + 1); toast('Etapa atualizada. Bom treino.'); app.route(); },
  async stageBack() { await setStage((await getStage()) - 1); toast('Voltou uma etapa.'); app.route(); },
  async stageRepeat(el) { await db.setSetting('runPainAck', el.dataset.date); toast('Combinado: repetir esta etapa.'); app.route(); }
});
onChange({
  async stagePick(el, e) { await setStage(Number(e.target.value)); toast('Etapa ajustada.'); app.route(); },
  async painAnswer(el, e) {
    const rec = await db.get('cardio', Number(el.dataset.id));
    if (!rec) return;
    await db.put('cardio', { ...rec, painNextDay: e.target.value });
    toast(e.target.value === 'nenhuma' ? 'Ótimo. Anotado.' : 'Anotado. Veja a sugestão em Treino › Cardio.', 3200);
    app.route();
  }
});
