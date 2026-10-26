// Tela Progresso: indicadores e gráficos.
import { $, esc, pad2, todayStr, parseDate, addDays, weekStart, fmtShort, fmtN } from '../util.js';
import { e1rm, ITEMS, itemById, planById, EFFORT, isTimed, program, phaseLabel, loadAll, weeklyMuscleSets, avg7 } from '../training.js';
import { main, setBar, cssVar, destroyCharts, mkChart, destroyChartOn } from '../ui.js';
import { S } from './sessao.js';
import { MUSCLES } from '../plan.js';

/* ================= tela: Progresso ================= */
export async function viewProgresso() {
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
