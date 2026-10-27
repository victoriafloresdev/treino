// Tela Hoje: resumo e acesso rápido. O plano completo do dia fica em Comida › Dia.
import { esc, todayStr, parseDate, fmtN, fmtShort, weekStart, addDays } from '../util.js';
import { planById, program, phaseLabel, loadAll, workoutOrder, suggestedWorkout, avg7 } from '../training.js';
import { app, main, setBar, on, openSheet, toast } from '../ui.js';
import { cardioToday, pendingPain } from './cardio.js';
import { db } from '../db.js';
import { TARGET_P } from '../data/nutricao.js';
import { waterGoalCups, fmt } from '../nutri.js';
import { dayInfo, getProfile, importProfileFile } from '../days.js';
import { habitsOf } from '../habitos.js';
import { pendingClosing, weekHabits, v2Since } from '../stats.js';
import { CONSISTENT } from '../progress.js';
import { nextMeal } from '../proximo.js';
import { icon } from '../ui/icons.js';
import { dayTagHTML, applyDayColor } from './dia.js';
import { viewDate, isPast, dateNavHTML, dayLabel } from '../ui/dia-ativo.js';

export { applyDayColor };
const H = { ctx: null };
const hourNow = () => { const n = new Date(); return n.getHours() + n.getMinutes() / 60; };
// Backup: o aviso aparece a partir do domingo e fica até você exportar; depois, só no domingo seguinte.
export const lastSunday = d => addDays(d, -parseDate(d).getDay());
export const backupDue = (today, lastBackup) => !lastBackup || lastBackup < lastSunday(today);

export async function viewHoje() {
  // descarta o desenho se outra tela foi aberta enquanto este esperava o banco
  const tok = app.seq;
  const p = await program();
  if (tok !== app.seq) return;
  setBar('Hoje', phaseLabel(p));
  const today = todayStr(), past = isPast();
  const lastBackup = await db.setting('lastBackup');
  const all = await loadAll();
  const hasData = all.sets.length > 0 || all.cardio.length > 0 || all.body.length > 0;
  const needBackup = hasData && backupDue(today, lastBackup);
  const askProfile = !(await getProfile()) && !(await db.setting('profilePromptHidden'));
  H.ctx = { p, all, order: await workoutOrder(), cardio: await cardioToday(today), pain: await pendingPain(today), closing: await pendingClosing(today) };
  if (tok !== app.seq) return;
  main.innerHTML = `
    ${dateNavHTML()}
    ${past ? '' : `${!p.start ? `<div class="card"><h2>Quando o programa começa?</h2>
       <p class="muted small">A data define a semana atual, a fase (adaptação nas semanas 1–2) e o cardio do dia.</p>
       <div class="row"><label class="f" style="flex:1">Data de início<input type="date" id="startDate" value="${today}"></label></div>
       <div class="form-actions"><button class="btn solid block" data-act="setStart">Salvar data de início</button></div></div>` : ''}
    ${p.week >= 8 ? `<div class="banner"><b>Semana ${p.week}:</b> hora de revisar a ficha. Veja aderência e progressão na aba Progresso.</div>` : ''}
    ${needBackup ? `<div class="alert">${icon('download-simple')}<span><b>Backup da semana</b><small>Seus dados ficam só neste celular.</small></span>
      <button class="btn sm solid" type="button" data-act="export">Exportar</button></div>` : ''}
    ${askProfile ? `<div class="card notice">${icon('user-circle', 'lead-ic')}<div><h3>Importe seu perfil de saúde</h3>
      <p class="small muted">Ele traz o lembrete do remédio, as suas notas e as dicas pessoais. Fica só neste celular e vai junto nos backups. É uma vez só.</p>
      <div class="row"><label class="btn solid sm" style="cursor:pointer">Importar perfil de saúde<input type="file" id="profileFileHoje" accept="application/json,.json" hidden></label>
        <button class="btn sm" type="button" data-act="profileLater">Agora não</button></div></div></div>` : ''}
    ${H.ctx.pain ? `<a class="alert" href="#treino/cardio">${icon('sneaker-move')}<span><b>Alguma dor da corrida?</b><small>Responda em Cardio para decidir a etapa.</small></span>${icon('caret-right')}</a>` : ''}
    ${H.ctx.closing ? `<a class="alert" href="#fechar/${H.ctx.closing}">${icon('calendar-check')}
      <span><b>Fechar a semana</b><small>${fmtShort(H.ctx.closing)} a ${fmtShort(addDays(H.ctx.closing, 6))}</small></span>${icon('caret-right')}</a>` : ''}`}
    <section id="hojeDay" aria-label="Tipo de dia"></section>
    <section class="next" id="hojeNext" aria-label="${past ? 'Refeições do dia' : 'Próxima refeição'}"></section>
    <section class="rings" id="hojeRings" aria-label="Resumo do dia"></section>
    <section class="card" id="hojeTreinos" aria-label="Treinos do dia"></section>
    <section class="card" id="hojeHabits" aria-label="Hábitos do dia"></section>
    <section class="card peso" id="hojePeso" aria-label="Peso"></section>`;
  const pf = document.getElementById('profileFileHoje');
  if (pf) pf.onchange = async e => { if (await importProfileFile(e.target.files[0])) app.route(); };
  app.refresh = refreshHoje;
  await refreshHoje();
}

// Atualiza as partes da tela no lugar (os anéis animam entre os valores).
async function refreshHoje() {
  const tok = app.seq;
  const today = viewDate(), past = isPast();
  const info = await dayInfo(today);
  const body = await db.all('body');
  const wk = await weekHabits(weekStart(today), await v2Since(), today);
  if (tok !== app.seq || !document.getElementById('hojeNext')) return;
  applyDayColor(info.type);
  const weighed = body.find(b => b.date === today && b.weight != null);
  const hb = habitsOf(info, weighed);
  const wpct = wk.total ? Math.round(100 * wk.done / wk.total) : null;
  // num dia que passou, a "próxima" é a primeira que ficou sem marcar
  const hour = past ? 0 : hourNow();

  document.getElementById('hojeDay').innerHTML = dayTagHTML(info);
  document.getElementById('hojeNext').innerHTML = nextHTML(info, hour, past);
  document.getElementById('hojeRings').innerHTML = ringsHTML(info);
  document.getElementById('hojeTreinos').innerHTML = treinosHTML(info);
  const hOpen = document.querySelector('#hojeHabits details')?.open;
  document.getElementById('hojeHabits').innerHTML = `<details ${hOpen ? 'open' : ''}><summary><span>Hábitos do dia</span><span class="count num">${hb.done} de ${hb.total}</span>${icon('caret-down')}</summary>
    <ul class="habits">${hb.list.map(h => `<li class="${h.done ? 'ok' : ''}">${icon(h.done ? 'check-circle-fill' : 'circle')}<span>${esc(h.label)}</span><span class="sr">${h.done ? ': feito' : ': ainda não'}</span></li>`).join('')}</ul>
    ${wpct != null ? `<p class="small muted wkline">Na semana: ${wk.done} de ${wk.total} (${wpct}%)${wpct >= CONSISTENT * 100 ? ', semana consistente' : ''}</p>` : ''}</details>`;
  const w7 = avg7(body, today);
  document.getElementById('hojePeso').innerHTML = `${icon('scales', 'lead-ic')}
    <span class="peso-t"><b>Peso</b><small>${weighed ? `${past ? 'Neste dia' : 'Hoje'}: <span class="num">${fmtN(weighed.weight)}</span> kg · ` : ''}média de 7 dias: <span class="num">${w7 ? fmtN(w7) + ' kg' : '–'}</span></small></span>
    ${weighed ? '' : '<button class="btn sm" type="button" data-act="weightSheet">Registrar peso</button>'}`;
}

/* ---------- próxima refeição ---------- */
function nextHTML(info, hour, past) {
  const n = nextMeal(info, hour);
  const skipped = n?.skipped?.length ? `<p class="small muted skipped">Ficou sem marcar: ${n.skipped.map(s => esc(s.title.toLowerCase())).join(', ')}.
    <a href="#comida/dia">Ver o dia</a></p>` : '';
  if (!n || !n.slot) return `<div class="next-card done">
    <p class="next-k">${icon('check-circle-fill')} Refeições ${past ? 'de ' + esc(dayLabel(info.date).toLowerCase()) : 'do dia'}</p>
    <h2>${n?.done ? (past ? 'Tudo marcado nesse dia' : 'Tudo marcado por hoje') : 'Sem próxima refeição'}</h2>
    ${skipped}<div class="row"><a class="btn" href="#comida/dia">Ver o plano do dia</a></div></div>`;
  const mm = n.meal;
  return `<div class="next-card">
    <p class="next-k">${past ? `Falta marcar · ${esc(dayLabel(info.date))}` : `Próxima refeição${n.time === 'livre' ? ', quando quiser' : ` · <span class="num">${n.time}</span>`}`}</p>
    <div class="next-main"><span class="disc" aria-hidden="true">${mm.e}</span>
      <div><h2>${esc(n.slot.title)}</h2><p>${esc(mm.builder ? `${mm.prot.name} + ${mm.carb.name}` : mm.name)}</p></div></div>
    <p class="next-nums"><span class="num">${fmt(mm.m[0])}</span> kcal · <span class="num">${fmt(mm.m[1])}</span> g de proteína</p>
    ${skipped}
    <div class="row"><button class="btn solid" type="button" data-act="mealDone" data-slot="${n.slot.id}">Marcar como feito</button>
      <button class="btn" type="button" data-act="openMeal" data-slot="${n.slot.id}">Ver no plano</button></div></div>`;

}

/* ---------- anéis ---------- */
function ring({ value, max, color, big, unit, label, act }) {
  const r = 30, c = 2 * Math.PI * r, frac = Math.max(0, Math.min(1, max ? value / max : 0));
  const svg = `<svg viewBox="0 0 76 76" aria-hidden="true"><circle cx="38" cy="38" r="${r}" class="ring-bg"/>
    ${frac > 0 ? `<circle cx="38" cy="38" r="${r}" class="ring-fg" style="stroke:${color};stroke-dasharray:${(frac * c).toFixed(1)} ${c.toFixed(1)}"/>` : ''}</svg>`;
  const inner = `${svg}<span class="ring-v num">${big}</span><span class="ring-l">${label}</span>`;
  return act ? `<button class="ring" type="button" ${act}>${inner}</button>` : `<div class="ring">${inner}</div>`;
}
function ringsHTML(info) {
  const goal = waterGoalCups(info.d);
  return `${ring({ value: info.eaten[0], max: info.d.target, color: 'var(--day)', big: fmt(info.eaten[0]), label: `kcal de ${fmt(info.d.target)}` })}
    ${ring({ value: info.eaten[1], max: TARGET_P, color: 'var(--p)', big: `${fmt(info.eaten[1])}<small>g</small>`, label: `proteína de ${TARGET_P} g` })}
    <div class="ring-water">${ring({ value: info.water, max: goal, color: 'var(--water)', big: `${info.water}<small>/${goal}</small>`, label: 'copos de água',
      act: `data-act="water" data-v="1" aria-label="Adicionar um copo de água. ${info.water} de ${goal} copos."` })}
      <button class="ring-minus" type="button" data-act="water" data-v="-1" aria-label="Tirar um copo de água" ${info.water ? '' : 'disabled'}>${icon('minus')}</button></div>`;
}

/* ---------- treinos de hoje ---------- */
function workoutToday() {
  const { all, p, order } = H.ctx;
  const plan = planById(suggestedWorkout(all, order, viewDate()));
  const sess = plan && all.sessions.find(s => s.date === viewDate() && s.planId === plan.id && (all.setsBySession[s.id] || []).length);
  return { plan, started: !!sess, phase: p.phase };
}
function treinosHTML(info) {
  const rows = [];
  if (info.d.musc || info.reg.musc) {
    const w = workoutToday();
    const doneSess = H.ctx.all.realSessions.find(s => s.date === info.date);
    rows.push(info.reg.musc
      ? `<li class="tr done">${icon('check-circle-fill')}<span class="tr-t"><b>${esc(planById(doneSess?.planId)?.name || 'Musculação')}</b><small>Treino registrado</small></span>
          <a class="btn sm" href="#treino/${doneSess?.planId || ''}">Ver</a></li>`
      : w.plan ? `<li class="tr">${icon('barbell')}<span class="tr-t"><b>${esc(w.plan.name)}</b><small>${esc(w.plan.focus)} · ${w.plan.items.length} exercícios · ${w.plan.time[w.phase]}</small></span>
          <a class="btn sm solid" href="#treino/${w.plan.id}">${w.started ? 'Continuar' : 'Começar'}</a></li>`
      : `<li class="tr">${icon('barbell')}<span class="tr-t"><b>Musculação</b><small>Os quatro treinos da semana estão feitos.</small></span></li>`);
  }
  if (info.d.cardio || info.reg.cardio) {
    const c = H.ctx.all.cardio.filter(x => x.date === info.date);
    rows.push(info.reg.cardio
      ? `<li class="tr done">${icon('check-circle-fill')}<span class="tr-t"><b>Cardio</b><small>${c.map(x => `${x.minutes} min de ${esc(x.type)}`).join(', ') || 'Registrado'}</small></span></li>`
      : `<li class="tr">${icon('sneaker-move')}<span class="tr-t"><b>Cardio${H.ctx.cardio.label ? ' · ' + esc(H.ctx.cardio.label) : ''}</b><small>${esc(H.ctx.cardio.text)}</small></span>
          <button class="btn sm" type="button" data-act="cardioForm">Registrar</button></li>`);
  }
  if (!rows.length) rows.push(`<li class="tr">${icon('leaf')}<span class="tr-t"><b>${isPast() ? 'Dia de descanso' : 'Hoje é descanso'}</b><small>Recuperar também faz parte do plano.</small></span></li>`);
  // sem musculação prevista: dá para treinar mesmo assim (o tipo do dia se ajusta pelo registro)
  if (!info.d.musc && !info.reg.musc) rows.push(`<li class="tr quiet">${icon('barbell')}<span class="tr-t"><small>Musculação não prevista</small></span>
          <a class="linkbtn" href="#treino">Treinar mesmo assim</a></li>`);
  return `<h3>${isPast() ? 'Treinos do dia' : 'Treinos de hoje'}</h3><ul class="treinos">${rows.join('')}</ul>`;
}

on({
  async profileLater() { await db.setSetting('profilePromptHidden', true); toast('Você pode importar depois em Mais.'); app.route(); },
  weightSheet() {
    openSheet(`<h2>Registrar peso</h2>
      <div class="grid2"><label class="f">Data<input type="date" id="wDate" value="${viewDate()}" max="${todayStr()}"></label>
      <label class="f">Peso (kg)<input id="wQuick" inputmode="decimal" placeholder="0,0" autocomplete="off"></label></div>
      <p class="small muted">Pese-se de manhã, depois do banheiro e antes de comer. A média de 7 dias é o que importa.</p>
      <div class="form-actions"><button class="btn solid block" type="button" data-act="saveWeight">Salvar peso</button></div>`);
    setTimeout(() => document.getElementById('wQuick')?.focus(), 50);
  }
});
