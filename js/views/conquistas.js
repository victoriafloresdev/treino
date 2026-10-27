// Progresso › Conquistas e a tela "Fechar a semana".
import { esc, todayStr, fmtShort, addDays, weekStart, fmtN, isoWeek } from '../util.js';
import { program, phaseLabel } from '../training.js';
import { app, main, setBar, subTabs, on, toast, celebrate } from '../ui.js';
import { db } from '../db.js';
import { ACHIEVEMENTS, evalAchievements, CONSISTENT } from '../progress.js';
import { achievementStats, checkAchievements, closingSummary, weekUid } from '../stats.js';
import { fmt, fmt1 } from '../nutri.js';
import { PROG_TABS } from './progresso.js';
import { icon } from '../ui/icons.js';
import { shareJSON } from './mais.js';

const pct = (d, t) => (t ? Math.round(100 * d / t) : 0);
const range = ws => `${fmtShort(ws)} a ${fmtShort(addDays(ws, 6))}`;

// Verifica conquistas novas e comemora (chamado depois de registrar treino, cardio, fechamento…)
export async function announceAchievements() {
  try {
    const fresh = await checkAchievements();
    const meta = Object.fromEntries(ACHIEVEMENTS.map(a => [a.id, a]));
    for (const a of fresh) celebrate(meta[a.id].title);
  } catch (e) { console.warn(e); }
}

export async function viewConquistas() {
  const tok = app.seq;
  const p = await program();
  const s = await achievementStats();
  const fresh = await checkAchievements(s);
  const got = Object.fromEntries((await db.all('achievements')).map(a => [a.id, a]));
  const weekly = (await db.all('weekly')).filter(w => w.closedAt).sort((a, b) => (a.start < b.start ? 1 : -1));
  if (tok !== app.seq) return;
  setBar('Progresso', phaseLabel(p));
  const cur = s.weeks[s.weeks.length - 1] || { done: 0, total: 0 };
  const list = evalAchievements(s);
  main.innerHTML = subTabs('progresso', PROG_TABS, 'conquistas') + `
    <div class="kpis">
      <div class="kpi"><div class="v">${cur.done}<span style="font-size:20px">/${cur.total}</span></div><div class="l">hábitos nesta semana (${pct(cur.done, cur.total)}%)</div></div>
      <div class="kpi"><div class="v">${s.streak.current}</div><div class="l">semanas consistentes seguidas (melhor: ${s.streak.best})</div></div>
    </div>
    <p class="small muted">Semana consistente: ${Math.round(CONSISTENT * 100)}% ou mais dos hábitos previstos. A sequência conta semanas, não dias: um dia ruim não zera nada.</p>
    ${s.weeks.length > 1 ? `<div class="card"><h3>Semanas</h3><ul class="weeks-bars">${s.weeks.slice(-8).map(w => `<li><span>${fmtShort(w.ws)}</span>
      <span class="track"><span class="fill ${w.total && w.done / w.total >= CONSISTENT ? 'full' : ''}" style="width:${pct(w.done, w.total)}%"></span></span>
      <span class="num">${pct(w.done, w.total)}%</span></li>`).join('')}</ul></div>` : ''}
    <h2 class="section-title">Conquistas</h2>
    <ul class="ach">${list.map(a => `<li class="${a.unlocked ? 'on' : ''}"><span class="em">${icon(a.ic)}</span>
      <div><b>${esc(a.title)}</b><span class="small muted">${esc(a.desc)}</span>
        ${a.unlocked ? `<span class="small okline">✓ ${got[a.id] ? 'desde ' + fmtShort(got[a.id].date) : 'conquistada'}</span>`
          : a.progress ? `<span class="track"><span class="fill" style="width:${pct(a.progress[0], a.progress[1])}%"></span></span><span class="small muted">${a.progress[0]} de ${a.progress[1]}</span>` : '<span class="small muted">ainda não</span>'}</div></li>`).join('')}</ul>
    <h2 class="section-title">Fechamentos semanais</h2>
    <div class="card">${weekly.length ? `<ul class="rows">${weekly.map(w => `<li><div><b>Semana de ${range(w.start)}</b>
      <span class="small muted">${w.summary.habits.done} de ${w.summary.habits.total} hábitos · ${w.summary.workouts} treinos · ${w.summary.cardio.count} cardios${w.backupAt ? ' · backup ✓' : ''}</span></div>
      <a class="btn sm" href="#fechar/${w.start}">Ver</a></li>`).join('')}</ul>` : '<p class="empty">Nenhuma semana fechada ainda. No domingo, a tela Hoje mostra o card “Fechar a semana”.</p>'}</div>`;
  for (const a of fresh) celebrate(a.title);
}

/* ---------- fechar a semana ---------- */
export async function viewFechar(ws) {
  const tok = app.seq;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ws || '')) ws = weekStart(addDays(todayStr(), -7));
  ws = weekStart(ws);
  const rec = await db.get('weekly', weekUid(ws));
  const sm = rec?.summary || await closingSummary(ws);
  if (tok !== app.seq) return;
  setBar('Fechar a semana', range(ws), 'hoje');
  const f = rec?.feeling || {};
  const radios = (name, legend, list, sel) => `<fieldset class="chipset"><legend>${legend}</legend><div class="segr c3">${list.map(([v, l]) =>
    `<label><input type="radio" name="${name}" value="${v}" ${v === sel ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>`;
  const wDiff = sm.weight != null && sm.weightPrev != null ? sm.weight - sm.weightPrev : null;
  main.innerHTML = `
    <div class="card"><h2>Semana ${isoWeek(ws).week} · ${range(ws)}</h2>
      <p class="${sm.habits.consistent ? 'okline' : 'muted'}" style="margin:6px 0 0">${sm.habits.total ? `${sm.habits.done} de ${sm.habits.total} hábitos (${pct(sm.habits.done, sm.habits.total)}%)${sm.habits.consistent ? ': semana consistente' : ''}`
        : 'Hábitos contam a partir do dia em que a nova versão do app começou a ser usada.'}</p></div>
    <div class="kpis">
      <div class="kpi"><div class="v">${sm.workouts}<span style="font-size:20px">/4</span></div><div class="l">treinos${sm.workoutNames.length ? ': ' + esc(sm.workoutNames.join(', ')) : ''}</div></div>
      <div class="kpi"><div class="v">${sm.cardio.count}</div><div class="l">cardios, ${sm.cardio.minutes} min</div></div>
      <div class="kpi"><div class="v">${sm.kcal == null ? '–' : fmt(sm.kcal)}</div><div class="l">kcal por dia, média dos ${sm.loggedDays} dias marcados</div></div>
      <div class="kpi"><div class="v">${sm.protein == null ? '–' : fmt(sm.protein) + ' g'}</div><div class="l">proteína por dia, média</div></div>
      <div class="kpi"><div class="v">${sm.water == null ? '–' : fmt1(sm.water * 0.25) + ' L'}</div><div class="l">água por dia (meta média ${sm.waterGoal == null ? '–' : fmt1(sm.waterGoal * 0.25)} L)</div></div>
      <div class="kpi"><div class="v">${sm.weight == null ? '–' : fmtN(sm.weight) + ' kg'}</div><div class="l">peso, média de 7 dias${wDiff == null ? '' : ` (${wDiff > 0 ? '+' : ''}${fmtN(wDiff)} vs. semana anterior)`}</div></div>
    </div>
    <div class="card">
      <h3>Cargas que subiram</h3>
      ${sm.loadsUp.length ? `<ul class="plain">${sm.loadsUp.map(x => `<li>${esc(x.name)}: ${fmtN(x.from)} → <b>${fmtN(x.to)} kg</b></li>`).join('')}</ul>` : '<p class="muted small">Nenhuma nesta semana. Manter a carga com boa técnica também é progresso.</p>'}
      ${sm.easier.length ? `<h3>Ficando mais fáceis</h3><p class="small">↗ ${esc(sm.easier.join(', '))}</p>` : ''}
      ${sm.harder.length ? `<h3>Ficando mais difíceis</h3><p class="small">↘ ${esc(sm.harder.join(', '))}</p>` : ''}
      ${sm.achievements.length ? `<h3>Conquistas</h3><p class="small">${sm.achievements.map(id => { const a = ACHIEVEMENTS.find(x => x.id === id); return a ? esc(a.title) : ''; }).join(' · ')}</p>` : ''}
    </div>
    <div class="card"><h3>Como foi a semana?</h3>
      ${radios('energia', 'Energia', [['baixa', 'Pouca energia'], ['ok', 'Normal'], ['alta', 'Muita energia']], f.energia)}
      ${radios('sono', 'Sono', [['ruim', 'Sono ruim'], ['ok', 'Sono ok'], ['bom', 'Sono bom']], f.sono)}
      <label class="f">Dores ou observações<textarea id="wkNote" rows="3" placeholder="opcional">${esc(f.nota || '')}</textarea></label>
      <div class="form-actions" style="display:grid;gap:10px">
        <button class="btn solid block" type="button" data-act="exportWeek" data-ws="${ws}">${rec?.backupAt ? 'Exportar semana de novo' : 'Fechar e exportar semana'}</button>
        <button class="btn block" type="button" data-act="closeWeek" data-ws="${ws}">${rec?.closedAt ? 'Atualizar fechamento' : 'Só fechar, sem exportar'}</button></div>
      <p class="small muted">Exportar gera o arquivo ${esc(weekFile(ws))} com todos os seus dados e abre o compartilhar: salve no iCloud Drive ou no Google Drive. No computador, o programa tools/consolidar.py junta os arquivos em planilhas.${rec?.backupAt ? ` Último envio: ${fmtShort(new Date(rec.backupAt).toISOString().slice(0, 10))}.` : ''}</p>
    </div>`;
  viewFechar.summary = sm;
}

// bem-estar-AAAA-Sww.json, pela semana ISO
export const weekFile = ws => { const w = isoWeek(ws); return `bem-estar-${w.year}-S${String(w.week).padStart(2, '0')}.json`; };

async function saveClosing(ws, extra = {}) {
  const val = n => document.querySelector(`input[name="${n}"]:checked`)?.value || null;
  const note = document.getElementById('wkNote')?.value.trim() || '';
  const cur = await db.get('weekly', weekUid(ws));
  const summary = cur?.summary || viewFechar.summary || await closingSummary(ws);
  await db.put('weekly', { ...(cur || {}), uid: weekUid(ws), id: isoWeek(ws).id, start: ws, end: addDays(ws, 6), summary,
    feeling: { energia: val('energia'), sono: val('sono'), nota: note }, closedAt: cur?.closedAt || Date.now(), ...extra });
}

on({
  async closeWeek(el) {
    await saveClosing(el.dataset.ws);
    toast('Semana fechada.');
    await announceAchievements();
    location.hash = 'progresso/conquistas';
  },
  async exportWeek(el) {
    const ws = el.dataset.ws;
    // o compartilhar precisa vir logo depois do toque: gera e envia primeiro, grava depois
    const ok = await shareJSON(await db.exportAll(), weekFile(ws), 'Fechamento da semana');
    if (!ok) return;
    await saveClosing(ws, { backupAt: Date.now() });
    await db.setSetting('lastBackup', todayStr());
    toast('Semana fechada e exportada.');
    await announceAchievements();
    location.hash = 'progresso/conquistas';
  }
});
