// Prato-relógio: 24 h com 0h no topo, sentido horário. Anel externo com sono, atividades e refeições;
// no centro, donut com a fatia de calorias de proteína, carboidrato e gordura.
import { SLEEP } from '../data/nutricao.js';
import { mealOf, included, fmt } from '../nutri.js';

const CIRC = 2 * Math.PI * 70;
const pt = (h, r) => { const a = h / 24 * 2 * Math.PI; return [r * Math.sin(a), -r * Math.cos(a)]; };
const f = n => n.toFixed(1);
function arcPath(h1, h2, r) {
  const p1 = pt(h1, r), p2 = pt(h2, r);
  let span = ((h2 - h1) + 24) % 24; if (span === 0) span = 24;
  return `M${f(p1[0])} ${f(p1[1])} A${r} ${r} 0 ${span > 12 ? 1 : 0} 1 ${f(p2[0])} ${f(p2[1])}`;
}

// Desenha o prato uma vez; depois só updatePlate, para o donut animar entre os valores.
export function plateSVG() {
  let ticks = '';
  for (let h = 0; h < 24; h++) { const p = pt(h, 126); ticks += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="${h % 6 === 0 ? 2.4 : 1.4}" fill="var(--muted)" opacity=".35"/>`; }
  const labels = [[0, '0h'], [6, '6h'], [12, '12h'], [18, '18h']].map(([h, t]) => { const p = pt(h, 100); return `<text x="${f(p[0])}" y="${f(p[1])}" font-size="10" font-weight="600" fill="var(--muted)" text-anchor="middle" dominant-baseline="central">${t}</text>`; }).join('');
  const seg = id => `<circle id="${id}" r="70" fill="none" stroke="var(--${id.slice(3).toLowerCase()})" stroke-width="18" stroke-dasharray="0 ${f(CIRC)}"/>`;
  return `<svg class="plate" viewBox="-170 -170 340 340" role="img" aria-labelledby="plateTitle plateDesc">
    <title id="plateTitle">Prato-relógio do dia</title><desc id="plateDesc"></desc>
    <circle r="158" fill="var(--rim)"/>
    <circle r="140" fill="var(--plate)" stroke="var(--line)" stroke-width="1"/>
    <circle r="126" fill="none" stroke="var(--ring)" stroke-width="16"/>
    <path d="${arcPath(SLEEP[0], SLEEP[1], 126)}" fill="none" stroke="var(--sleep)" stroke-width="16" stroke-linecap="round"/>
    <g id="pActs"></g>${ticks}${labels}
    <circle r="70" fill="none" stroke="var(--surface2)" stroke-width="18"/>
    <g transform="rotate(-90)">${seg('segP')}${seg('segC')}${seg('segG')}</g>
    <text id="pK" y="-4" text-anchor="middle" font-weight="650" font-size="34" fill="var(--ink)">0</text>
    <text id="pT" y="20" text-anchor="middle" font-size="11.5" fill="var(--muted)">kcal planejadas</text>
    <g id="pEm"></g>
  </svg>`;
}

export function updatePlate(root, info) {
  const { d, st, planned: t, visible } = info;
  const kP = t[1] * 4, kC = t[2] * 4, kG = t[3] * 9, tot = kP + kC + kG || 1;
  const lens = [kP / tot * CIRC, kC / tot * CIRC, kG / tot * CIRC];
  let off = 0;
  ['segP', 'segC', 'segG'].forEach((id, i) => {
    const el = root.querySelector('#' + id);
    el.setAttribute('stroke-dasharray', `${f(Math.max(0, lens[i] - 2))} ${f(CIRC)}`);
    el.setAttribute('stroke-dashoffset', f(-off));
    off += lens[i];
  });
  root.querySelector('#pK').textContent = fmt(t[0]);
  root.querySelector('#pT').textContent = `de ${fmt(d.target)} kcal`;
  root.querySelector('#plateDesc').textContent = `${fmt(t[0])} de ${fmt(d.target)} kcal planejadas. Proteína ${Math.round(kP / tot * 100)}%, carboidrato ${Math.round(kC / tot * 100)}%, gordura ${Math.round(kG / tot * 100)}% das calorias.`;

  let acts = '';
  for (const s of visible) if (s.kind === 'activity') {
    acts += `<path d="${arcPath(s.h(d), s.end, 126)}" fill="none" stroke="var(--day, var(--accent))" stroke-width="16" stroke-linecap="round"/>`;
    const p = pt((s.h(d) + s.end) / 2, 155);
    acts += `<text x="${f(p[0])}" y="${f(p[1])}" font-size="17" text-anchor="middle" dominant-baseline="central">${s.e}</text>`;
  }
  root.querySelector('#pActs').innerHTML = acts;

  const moon = pt(2.25, 126);
  let em = `<text x="${f(moon[0])}" y="${f(moon[1])}" font-size="14" text-anchor="middle" dominant-baseline="central">🌙</text>`;
  for (const s of visible) {
    let e = null, hh = null;
    if (s.id === 'remedio') { e = info.profile.remedio.e || '💊'; hh = info.profile.remedio.h; }
    if (s.kind === 'meal') {
      if (!included(s, st)) continue;
      const mm = mealOf(s.id, d, st);
      if (s.id === 'preCardio' && mm.m[0] === 0) continue;
      e = mm.e; hh = s.h(d);
    }
    if (!e) continue;
    const p = pt(hh, 126);
    em += `<circle cx="${f(p[0])}" cy="${f(p[1])}" r="13" fill="var(--surface)" stroke="var(--line)"/>` +
      `<text x="${f(p[0])}" y="${f(p[1] + 1)}" font-size="15" text-anchor="middle" dominant-baseline="central">${e}</text>`;
  }
  root.querySelector('#pEm').innerHTML = em;
}
