// Dia ativo: o dia que as telas Hoje, Comida › Dia e Treino estão mostrando.
// Normalmente é hoje; dá para voltar no calendário e registrar um dia que passou. Nunca no futuro.
import { todayStr, addDays, parseDate, esc, DIAS, MESES, cap } from '../util.js';
import { app, on, onChange } from '../ui.js';
import { icon } from './icons.js';

let sel = null;
export const viewDate = () => (sel && sel < todayStr() ? sel : todayStr());
export const isPast = () => viewDate() < todayStr();
export function setViewDate(d) { sel = d && d < todayStr() ? d : null; }

export function dayLabel(d) {
  const t = todayStr();
  if (d === t) return 'Hoje';
  if (d === addDays(t, -1)) return 'Ontem';
  const x = parseDate(d);
  return `${cap(DIAS[x.getDay()])}, ${x.getDate()} de ${MESES[x.getMonth()]}`;
}

// seletor: ‹ dia anterior · data (abre o calendário) · próximo dia ›
export function dateNavHTML() {
  const d = viewDate(), t = todayStr();
  const sub = d === t ? `${cap(DIAS[parseDate(d).getDay()])}, ${parseDate(d).getDate()} de ${MESES[parseDate(d).getMonth()]}` : 'toque para escolher outro dia';
  return `<div class="datenav ${d < t ? 'past' : ''}">
    <button class="icon-btn" type="button" data-act="dayPrev" aria-label="Dia anterior">${icon('caret-right', 'flip')}</button>
    <label class="datenav-pick" data-on="pickDate">
      <span><b>${esc(dayLabel(d))}</b><small>${esc(sub)}</small></span>
      <input type="date" value="${d}" max="${t}" aria-label="Escolher o dia">
    </label>
    <button class="icon-btn" type="button" data-act="dayNext" aria-label="Próximo dia" ${d >= t ? 'disabled' : ''}>${icon('caret-right')}</button>
  </div>
  ${d < t ? `<p class="past-note">${icon('clock')}<span>Registrando um dia que passou.</span><button class="linkbtn" type="button" data-act="dayToday">Voltar para hoje</button></p>` : ''}`;
}

on({
  dayPrev() { setViewDate(addDays(viewDate(), -1)); app.route(); },
  dayNext() { setViewDate(addDays(viewDate(), 1)); app.route(); },
  dayToday() { setViewDate(null); app.route(); }
});
onChange({
  pickDate(el, e) { if (e.target.value) { setViewDate(e.target.value); app.route(); } }
});
