// Tela Hoje.
import { esc, todayStr, parseDate, weekStart, fmtLong, fmtN } from '../util.js';
import { planById, program, phaseLabel, cardioPlan, loadAll, doneThisWeek, nextInSequence, avg7 } from '../training.js';
import { main, setBar } from '../ui.js';
import { db } from '../db.js';
import { PLAN, WEEK } from '../plan.js';

/* ================= tela: Hoje ================= */
export async function viewHoje() {
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
      `<div class="row" style="margin-top:6px"><label class="f" style="flex:1">Peso de hoje (kg)<input id="wQuick" inputmode="decimal" placeholder="0,0"></label>
         <button class="btn solid" style="align-self:flex-end" data-act="saveWeight">Salvar</button></div>
       <p class="small muted" style="margin:8px 0 0">Pese-se de manhã, depois do banheiro e antes de comer. A média semanal é o que importa.</p>`}
    </div>`;
}
