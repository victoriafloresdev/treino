// Tela Progresso: indicadores e gráficos.
import { $, esc, pad2, todayStr, parseDate, addDays, weekStart, fmtShort, fmtN } from '../util.js';
import { e1rm, ITEMS, itemById, planById, EFFORT, isTimed, program, phaseLabel, loadAll, weeklyMuscleSets, avg7 } from '../training.js';
import { app, main, setBar, cssVar, destroyCharts, mkChart, destroyChartOn, subTabs } from '../ui.js';

import { S } from './sessao.js';
import { MUSCLES } from '../plan.js';
import { TARGET_P } from '../data/nutricao.js';
import { STAGES } from '../cardio.js';
import { dailySeries, weeklyDeficit, trendsAll, recoveryNote } from '../stats.js';

export const PROG_TABS = [['graficos', 'Gráficos'], ['corpo', 'Corpo'], ['conquistas', 'Conquistas']];
// datas com ano quando o período passa de 6 meses
const dlabel = dates => { const long = dates.length > 1 && (parseDate(dates[dates.length - 1]) - parseDate(dates[0])) / 864e5 > 183; return d => fmtShort(d) + (long ? '/' + d.slice(2, 4) : ''); };

/* ================= tela: Progresso ================= */
export async function viewProgresso() {
  // descarta o desenho se outra tela foi aberta enquanto este esperava o banco
  const tok = app.seq;
  const p = await program();
  if (tok !== app.seq) return;
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
  const daily = await dailySeries(14, today);
  const defs = await weeklyDeficit(8, today);
  const trends = trendsAll(all.sets);
  const recovery = recoveryNote(trends, ws);
  const runs = all.cardio.filter(c => Number.isInteger(c.stage)).sort((a, b) => (a.date < b.date ? -1 : 1));

  if (tok !== app.seq) return;
  main.innerHTML = subTabs('progresso', PROG_TABS, 'graficos') + `
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

    <h2 class="section-title">Tendência dos exercícios</h2>
    <div class="card">
      ${recovery ? `<div class="callout"><b>${recovery.length} exercícios ficaram mais difíceis nesta semana.</b> Costuma ser recuperação: vale olhar o sono, a alimentação (principalmente proteína e carboidrato perto do treino) e o estresse da semana antes de mexer nas cargas.</div>` : ''}
      ${trends.length ? `<ul class="rows trends">${trends.map(x => `<li><div><b>${esc(x.it.name)}</b><span class="small muted">última sessão: ${fmtShort(x.t.date)}</span></div>
        <span class="trend ${x.t.id}"><span aria-hidden="true">${x.t.arrow}</span> ${x.t.label}</span></li>`).join('')}</ul>
        <p class="small muted">Compara a última sessão com a média das duas anteriores: carga, esforço marcado e repetições por série.</p>`
        : '<p class="empty">A tendência aparece depois de 3 sessões de um exercício.</p>'}
    </div>

    <h2 class="section-title">Comida e água, últimos 14 dias</h2>
    <div class="card"><h3>Calorias feitas e meta do dia</h3><div class="chart-wrap"><canvas id="cKcal"></canvas></div>
      <p class="small muted" style="margin:8px 0 0">Feitas = refeições marcadas como feitas. Dia sem marcação aparece zerado.</p></div>
    <div class="card"><h3>Proteína por dia</h3><div class="chart-wrap"><canvas id="cProt"></canvas></div></div>
    <div class="card"><h3>Água por dia (copos de 250 ml)</h3><div class="chart-wrap"><canvas id="cWater"></canvas></div></div>

    <h2 class="section-title">Déficit semanal (estimativa)</h2>
    <div class="card">${defs.some(d => d.def != null) ? `<div class="chart-wrap"><canvas id="cDef"></canvas></div>` : '<p class="empty">Aparece depois dos primeiros dias com refeições marcadas.</p>'}
      <p class="small muted" style="margin:8px 0 0">Estimativa: gasto do tipo de dia menos o que foi marcado (dias sem registro completo usam o planejado). Margem de cerca de ±200 kcal por dia; olhe a tendência de 2–3 semanas, não um número.</p></div>

    <h2 class="section-title">Peso</h2>
    <div class="card">${all.body.some(b => b.weight != null) ? `<div class="chart-wrap"><canvas id="cWeight"></canvas></div>
      <p class="small muted" style="margin:8px 0 0">A linha da média de 7 dias é a que vale: o peso diário oscila 1–2 kg com água e sal.</p>` : `<p class="empty">Registre seu peso na tela Hoje ou em Progresso › Corpo.</p>`}</div>

    <h2 class="section-title">Composição corporal</h2>
    <div class="card">${all.comps.length ? `<h3>% de gordura</h3><div class="chart-wrap"><canvas id="cComp"></canvas></div>
      <h3 style="margin-top:14px">Massa livre de gordura (kg)</h3><div class="chart-wrap"><canvas id="cLean"></canvas></div>
      <p class="small muted" style="margin:8px 0 0">Compare apenas avaliações do mesmo método. Dobras e bioimpedância dão números diferentes para o mesmo corpo.</p>` : `<p class="empty">Adicione avaliações (dobras ou bioimpedância) em Progresso › Corpo.</p>`}</div>

    <h2 class="section-title">Cardio</h2>
    <div class="card"><h3>Minutos por semana</h3><div class="chart-wrap"><canvas id="cCardio"></canvas></div></div>
    <div class="card"><h3>Etapa da corrida</h3>${runs.length ? '<div class="chart-wrap"><canvas id="cStage"></canvas></div>' : '<p class="empty">Aparece depois do primeiro cardio de corrida registrado com o timer ou com a etapa.</p>'}</div>`;

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
    // cada método só se compara com ele mesmo
    mkChart($('#cLean'), { type: 'line', data: { labels: comps.map(c => fmtShort(c.date) + '/' + c.date.slice(2, 4)), datasets: methods.map((m, i) => ({
      label: `MLG (${m})`, data: comps.map(c => c.method === m ? c.leanKg : null), borderColor: colors[i % 4], backgroundColor: colors[i % 4], spanGaps: true, pointRadius: 4 })) } });
  }

  const dl = daily.map(x => fmtShort(x.date));
  const lineOf = (label, data, color) => ({ label, type: 'line', data, borderColor: color, borderDash: [5, 4], pointRadius: 0, borderWidth: 2, stepped: 'middle' });
  const cP = cssVar('--p'), cW = cssVar('--water');
  mkChart($('#cKcal'), { type: 'bar', data: { labels: dl, datasets: [
    { label: 'kcal feitas', data: daily.map(x => Math.round(x.eaten)), backgroundColor: accent, borderRadius: 4 },
    lineOf('Meta do dia', daily.map(x => x.target), prim)] }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } } });
  mkChart($('#cProt'), { type: 'bar', data: { labels: dl, datasets: [
    { label: 'Proteína feita (g)', data: daily.map(x => Math.round(x.protein)), backgroundColor: cP, borderRadius: 4 },
    lineOf(`Meta: ${TARGET_P} g`, daily.map(() => TARGET_P), muted)] }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } } });
  mkChart($('#cWater'), { type: 'bar', data: { labels: dl, datasets: [
    { label: 'Copos', data: daily.map(x => x.water), backgroundColor: cW, borderRadius: 4 },
    lineOf('Meta do tipo de dia', daily.map(x => x.waterGoal), muted)] }, options: { scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { stepSize: 2 } } } } });
  if (defs.some(d => d.def != null)) mkChart($('#cDef'), { type: 'bar', data: { labels: defs.map(d => fmtShort(d.ws)), datasets: [
    { label: 'Déficit estimado da semana (kcal)', data: defs.map(d => (d.def == null ? null : Math.round(d.def))), backgroundColor: ok, borderRadius: 6 }] },
    options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } } });
  if (runs.length) {
    const lab = dlabel(runs.map(r => r.date));
    const stageTip = r => `${STAGES[r.stage].label}${r.completed ? ' · ' + { sim: 'completa', parcial: 'parcial', nao: 'não completou' }[r.completed] : ''}${r.painNextDay && r.painNextDay !== 'nenhuma' ? ' · com dor' : ''}`;
    mkChart($('#cStage'), { type: 'line', data: { labels: runs.map(r => lab(r.date)), datasets: [
      { label: 'Etapa', data: runs.map(r => r.stage + 1), borderColor: accent, backgroundColor: runs.map(r => (r.painNextDay && r.painNextDay !== 'nenhuma' ? cssVar('--hard') : accent)), stepped: true, pointRadius: 5 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => stageTip(runs[c.dataIndex]) } } },
        scales: { x: { grid: { display: false } }, y: { min: 0.5, max: STAGES.length + 0.5, ticks: { stepSize: 1, callback: v => (Number.isInteger(v) ? 'Etapa ' + v : '') } } } } });
  }
}
export function drawEx(exId, all) {
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
  $('#exTable').innerHTML = `<div class="tbl"><table class="t"><thead><tr><th>Data</th><th>${isTimed(it) ? 'Tempo' : 'Carga'}</th><th>Reps por série</th><th>Dificuldade</th></tr></thead><tbody>
    ${pts.slice(-6).reverse().map(p => `<tr><td>${fmtShort(p.date)}</td><td>${isTimed(it) ? p.secs + ' s' : fmtN(p.maxKg) + ' kg'}</td><td>${esc(p.reps)}</td><td>${esc(p.eff)}</td></tr>`).join('')}</tbody></table></div>
    <p class="small muted">Dificuldade: F = fácil, M = médio, D = difícil.</p>`;
}
