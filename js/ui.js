// Peças de interface compartilhadas: barra do topo, toast, sheet, gráficos e cronômetro.
import { $, pad2 } from './util.js';

// O app.js preenche app.route; as telas chamam app.route() para redesenhar.
// app.seq conta as navegações: uma tela que termina de carregar depois de outra ter sido aberta não desenha nada.
export const app = { route: () => {}, seq: 0 };

// Cada tela registra os próprios botões (data-act) e campos (data-on): o app.js só despacha.
export const actions = {};
export const changes = {};
export function on(map) { Object.assign(actions, map); }

// Sub-abas de uma seção (ex.: Comida › Semana), como controle segmentado de links.
export function subTabs(base, tabs, cur) {
  return `<nav class="subtabs" aria-label="Partes da seção">${tabs.map(([id, label]) =>
    `<a href="#${base}/${id}" ${id === cur ? 'aria-current="page"' : ''}>${label}</a>`).join('')}</nav>`;
}
export function onChange(map) { Object.assign(changes, map); }
document.addEventListener('change', e => {
  const el = e.target.closest('[data-on]');
  if (el && changes[el.dataset.on]) changes[el.dataset.on](el, e);
});

/* ================= UI básica ================= */
export const main = $('#main');
export let charts = [];
export function setBar(title, ctx = '', back = null) {
  $('#title').textContent = title;
  $('#ctx').innerHTML = ctx;
  const b = $('#back');
  b.hidden = !back;
  b.onclick = back ? () => { location.hash = back; } : null;
}
export function toast(msg, ms = 2400) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('on'), ms);
}
export function openSheet(html) {
  const sh = $('#sheet');
  sh.innerHTML = `<button class="close" type="button" aria-label="Fechar" data-close>✕</button><div class="grab"></div>${html}`;
  sh.classList.add('on'); $('#sheetBg').classList.add('on'); sh.scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
export function closeSheet() {
  $('#sheet').classList.remove('on'); $('#sheetBg').classList.remove('on');
  document.body.style.overflow = '';
}
$('#sheetBg').addEventListener('click', closeSheet);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSheet(); });
window.addEventListener('scroll', () => $('#appbar').classList.toggle('scrolled', window.scrollY > 4), { passive: true });

export function cssVar(n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim(); }
export function destroyCharts() { charts.forEach(c => c.destroy()); charts = []; }
export function mkChart(canvas, cfg) {
  if (!window.Chart) return;
  const ink = cssVar('--muted'), line = cssVar('--line');
  Chart.defaults.font.family = 'Archivo, system-ui, sans-serif';
  Chart.defaults.color = ink;
  cfg.options = Object.assign({
    responsive: true, maintainAspectRatio: false, animation: false, locale: 'pt-BR',
    plugins: { legend: { labels: { boxWidth: 12, boxHeight: 12 } }, tooltip: { intersect: false, mode: 'index' } },
    scales: { x: { grid: { display: false } }, y: { grid: { color: line }, beginAtZero: false } }
  }, cfg.options || {});
  charts.push(new Chart(canvas, cfg));
}
export function destroyChartOn(id) { charts = charts.filter(c => { if (c.canvas.id === id) { c.destroy(); return false; } return true; }); }

/* ================= cronômetro de descanso ================= */
export const timer = { end: 0, int: null, ctx: null };
export function beep(freq = 880) {
  try {
    const c = timer.ctx; if (!c) return;
    [0, 0.25].forEach(t => {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = freq; o.connect(g); g.connect(c.destination);
      g.gain.setValueAtTime(0.0001, c.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.3, c.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + 0.18);
      o.start(c.currentTime + t); o.stop(c.currentTime + t + 0.2);
    });
  } catch (e) { /* sem som */ }
}
export function unlockAudio() {
  try {
    if (!timer.ctx) timer.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (timer.ctx.state === 'suspended') timer.ctx.resume();
  } catch (e) { /* ignora */ }
}
export function startTimer(sec, label) {
  const el = $('#timer');
  timer.end = Date.now() + sec * 1000;
  $('#timerLabel').textContent = label;
  el.classList.add('on'); el.classList.remove('end'); document.body.classList.add('timer-on');
  clearInterval(timer.int);
  const tick = () => {
    const left = Math.max(0, Math.round((timer.end - Date.now()) / 1000));
    $('#timerVal').textContent = `${Math.floor(left / 60)}:${pad2(left % 60)}`;
    if (left <= 0) {
      clearInterval(timer.int);
      el.classList.add('end'); $('#timerLabel').textContent = 'Descanso terminado: próxima série';
      beep(); if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setTimeout(() => { if (el.classList.contains('end')) { el.classList.remove('on'); document.body.classList.remove('timer-on'); } }, 8000);
    }
  };
  tick(); timer.int = setInterval(tick, 250);
}
$('#timerPlus').onclick = () => {
  const left = Math.max(0, Math.round((timer.end - Date.now()) / 1000));
  const label = $('#timer').classList.contains('end') ? 'Descanso extra' : $('#timerLabel').textContent;
  startTimer(left + 15, label);
};
$('#timerSkip').onclick = () => { clearInterval(timer.int); $('#timer').classList.remove('on', 'end'); document.body.classList.remove('timer-on'); };
