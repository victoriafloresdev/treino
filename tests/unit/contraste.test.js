// Contraste AA (4,5:1) dos tokens de cor, em claro e escuro, para cada tipo de dia.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// o matiz var(--h) vira HUE para não atrapalhar a leitura dos parênteses
const css = readFileSync(new URL('../../css/tokens.css', import.meta.url), 'utf8').replaceAll('var(--h)', 'HUE');

// oklch(L% C H) → sRGB linear → luminância relativa (WCAG)
function oklchToLinear(L, C, H) {
  const h = H * Math.PI / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b, m_ = L - 0.1055613458 * a - 0.0638541728 * b, s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ ** 3, m = m_ ** 3, s = s_ ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]
    .map(v => Math.min(1, Math.max(0, v)));
}
const lum = c => { const [r, g, b] = oklchToLinear(...c); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// pega light-dark(oklch(...),oklch(...)) de um token, trocando var(--h) pelo matiz
function token(block, name, hue) {
  const m = block.match(new RegExp(`--${name}:light-dark\\(oklch\\(([^)]*)\\),oklch\\(([^)]*)\\)\\)`));
  assert.ok(m, `token --${name}`);
  return [m[1], m[2]].map(s => {
    const [L, C, H] = s.replace('HUE', String(hue)).split(/\s+/);
    return [parseFloat(L) / 100, parseFloat(C), parseFloat(H)];
  });
}
const root = css.slice(css.indexOf(':root{'), css.indexOf('}', css.indexOf('--nav-h')));
const dayBlock = (d, pal) => {
  const sel = pal ? `html[data-palette="${pal}"][data-day="${d}"]{` : `\nhtml[data-day="${d}"]{`;
  const i = css.indexOf(sel);
  assert.ok(i >= 0, sel);
  return css.slice(i + sel.length, css.indexOf('}', i));
};
// matiz dos neutros: o do bloco do dia, senão o da paleta, senão o padrão
const hueOf = (block, pal) => {
  const own = block.match(/--h:(\d+)/);
  if (own) return Number(own[1]);
  const i = pal ? css.indexOf(`[data-palette="${pal}"]{--h:`) : -1;
  return i >= 0 ? Number(css.slice(i).match(/--h:(\d+)/)[1]) : 255;
};
const DAYS = { 'padrão': [255, root] };
for (const pal of [null, 'oceano', 'floresta', 'lavanda', 'grafite'])
  for (const d of ['A', 'B', 'C', 'D']) { const blk = dayBlock(d, pal); DAYS[`${pal || 'comida'} ${d}`] = [hueOf(blk, pal), blk]; }

for (const [day, [hue, block]] of Object.entries(DAYS)) {
  test(`contraste AA: ${day}`, () => {
    const t = n => token(n === 'accent' ? block : root, n, hue);
    const [bgL, bgD] = t('bg'), [surL, surD] = t('surface'), [s2L, s2D] = t('surface2');
    const [inkL, inkD] = t('ink'), [mutL, mutD] = t('muted'), [accL, accD] = t('accent'), [aiL, aiD] = token(root, 'accent-ink', hue);
    const checks = {
      'texto no fundo (claro)': ratio(inkL, bgL), 'texto no fundo (escuro)': ratio(inkD, bgD),
      'texto secundário no card (claro)': ratio(mutL, surL), 'texto secundário no card (escuro)': ratio(mutD, surD),
      'texto secundário no fundo 2 (claro)': ratio(mutL, s2L), 'texto secundário no fundo 2 (escuro)': ratio(mutD, s2D),
      'link no card (claro)': ratio(accL, surL), 'link no card (escuro)': ratio(accD, surD),
      'link no fundo (claro)': ratio(accL, bgL), 'link no fundo (escuro)': ratio(accD, bgD),
      'texto do botão principal (claro)': ratio(aiL, accL), 'texto do botão principal (escuro)': ratio(aiD, accD)
    };
    const fails = Object.entries(checks).filter(([, r]) => r < 4.5).map(([k, r]) => `${k}: ${r.toFixed(2)}`);
    assert.deepEqual(fails, []);
  });
}
