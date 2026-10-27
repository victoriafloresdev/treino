// Tipo do dia: etiqueta com a origem e a sheet "Mudar o dia" (usadas na Hoje e em Comida › Dia).
import { esc, todayStr } from '../util.js';
import { on, onChange, openSheet, closeSheet, toast, refreshView } from '../ui.js';
import { DAYS, DAY_IDS } from '../data/nutricao.js';
import { SOURCES } from '../daytype.js';
import { setOverride, setSkip } from '../days.js';
import { icon } from '../ui/icons.js';

export const DAY_ICON = { A: 'flame', B: 'person-simple-run', C: 'barbell', D: 'leaf' };
let current = null;

export function applyDayColor(type) {
  document.documentElement.dataset.day = type;
  // lembra o último tipo para a próxima abertura já começar com a cor certa
  try { localStorage.setItem('dayType', type); } catch (e) { /* sem armazenamento */ }
}

// info: resultado de dayInfo
export function dayTagHTML(info) {
  current = info;
  return `<div class="daytag">
    <span class="daytag-ic">${icon(DAY_ICON[info.type])}</span>
    <span class="daytag-t"><b>${esc(info.d.name)}</b><small>${SOURCES[info.source]}</small></span>
    <button class="btn sm" type="button" data-act="daySheet">Mudar</button>
  </div>`;
}

function daySheet() {
  const info = current, p = DAYS[info.plannedType];
  openSheet(`<h2>Mudar o dia</h2>
    <p class="muted small">Pela ficha, hoje é <b>${esc(p.name)}</b>. Registrar um treino ou cardio já ajusta o dia sozinho.</p>
    <fieldset class="chipset" data-on="dayOverride"><legend>Tipo de hoje</legend><div class="segr">
      ${DAY_IDS.map(k => `<label><input type="radio" name="dayOverride" value="${k}" ${info.manual && info.type === k ? 'checked' : ''}><span>${icon(DAY_ICON[k])}${esc(DAYS[k].short)}</span></label>`).join('')}
    </div></fieldset>
    ${info.manual ? `<button class="btn block" type="button" data-act="dayAuto">Voltar ao previsto pela ficha</button>` : ''}
    <div class="sheet-actions">
      ${p.musc && !info.reg.musc ? (info.skip?.musc ? `<button class="btn block" type="button" data-act="skip" data-kind="musc" data-v="0">Vou treinar hoje</button>`
        : `<button class="btn block" type="button" data-act="skip" data-kind="musc" data-v="1">Hoje não vou treinar</button>`) : ''}
      ${p.cardio && !info.reg.cardio ? (info.skip?.cardio ? `<button class="btn block" type="button" data-act="skip" data-kind="cardio" data-v="0">Vou fazer o cardio</button>`
        : `<button class="btn block" type="button" data-act="skip" data-kind="cardio" data-v="1">Pular cardio de hoje</button>`) : ''}
    </div>
    <p class="small muted">A escolha vale só para hoje. O modelo da semana fica em Mais.</p>`);
}

on({
  daySheet,
  async dayAuto() { await setOverride(todayStr(), null); closeSheet(); await refreshView(); },
  async skip(el) { await setSkip(todayStr(), el.dataset.kind, el.dataset.v === '1'); closeSheet(); await refreshView(); toast(el.dataset.v === '1' ? 'Dia ajustado.' : 'Desfeito.'); }
});
onChange({
  async dayOverride(el, e) { await setOverride(todayStr(), e.target.value); closeSheet(); await refreshView(); toast('Tipo de hoje alterado.'); }
});
