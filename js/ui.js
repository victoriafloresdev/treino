// Peças de interface compartilhadas: barra do topo, toast, sheet, gráficos e cronômetro.
import { $, pad2 } from './util.js';

// O app.js preenche app.route; as telas chamam app.route() para redesenhar.
// app.seq conta as navegações: uma tela que termina de carregar depois de outra ter sido aberta não desenha nada.
export const app = { route: () => {}, seq: 0, refresh: null };
// atualiza a tela atual no lugar (se ela souber) ou redesenha a rota
export const refreshView = () => (app.refresh || app.route)();

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

// Cor de um token já resolvida em rgb() (o Chart.js não entende light-dark() nem oklch()).
const probe = { el: null, ctx: null };
export function cssVar(n) {
  if (!probe.el) {
    probe.el = document.createElement('i'); probe.el.style.display = 'none'; document.body.appendChild(probe.el);
    probe.ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  }
  probe.el.style.color = `var(${n})`;
  const c = probe.ctx; c.clearRect(0, 0, 1, 1); c.fillStyle = '#000'; c.fillStyle = getComputedStyle(probe.el).color; c.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = c.getImageData(0, 0, 1, 1).data;
  return a === 255 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${(a / 255).toFixed(2)})`;
}
export function destroyCharts() { charts.forEach(c => c.destroy()); charts = []; }
export function mkChart(canvas, cfg) {
  if (!window.Chart) return;
  const ink = cssVar('--muted'), line = cssVar('--line');
  Chart.defaults.font.family = '"Atkinson Hyperlegible Next", system-ui, sans-serif';
  Chart.defaults.color = ink;
  // estilo dos gráficos: sem borda de eixo, grade só horizontal e suave, legenda com ponto pequeno
  Chart.defaults.scale.border.display = false;
  Chart.defaults.scale.grid.color = line;
  Chart.defaults.scale.grid.tickLength = 0;
  Chart.defaults.scale.ticks.padding = 6;
  Chart.defaults.plugins.legend.labels.usePointStyle = true;
  Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
  Chart.defaults.plugins.legend.labels.boxWidth = 8;
  Chart.defaults.plugins.legend.labels.boxHeight = 8;
  Chart.defaults.plugins.legend.align = 'start';
  Chart.defaults.plugins.tooltip.backgroundColor = cssVar('--ink');
  Chart.defaults.plugins.tooltip.titleColor = cssVar('--bg');
  Chart.defaults.plugins.tooltip.bodyColor = cssVar('--bg');
  Chart.defaults.plugins.tooltip.cornerRadius = 10;
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.elements.line.borderWidth = 2.5;
  Chart.defaults.elements.point.radius = 2.5;
  Chart.defaults.elements.bar.borderRadius = 6;
  cfg.options = Object.assign({
    responsive: true, maintainAspectRatio: false, animation: false, locale: 'pt-BR',
    plugins: { tooltip: { intersect: false, mode: 'index' } },
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

// Pequena celebração ao desbloquear uma conquista.
export function celebrate(text) {
  const el = document.createElement('div');
  el.className = 'celebrate'; el.setAttribute('role', 'status');
  // várias de uma vez ficam empilhadas
  el.style.marginTop = `${document.querySelectorAll('.celebrate').length * 112}px`;
  el.innerHTML = `<svg class="ic" aria-hidden="true"><use href="icons/sprite.svg#i-trophy"></use></svg><b>Conquista</b><span></span>`;
  el.lastChild.textContent = text;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3600);
}
// carrega a checagem de conquistas sob demanda (evita ciclo de imports)
export function announceAchievements() { return import('./views/conquistas.js').then(m => m.announceAchievements()); }
