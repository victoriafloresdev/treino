// Aparência: modo claro/escuro e paleta de cores. Preferência deste aparelho (localStorage).
import { cssVar } from '../ui.js';

export const THEMES = [['auto', 'Automático', 'circle-half'], ['light', 'Claro', 'sun'], ['dark', 'Escuro', 'moon']];
export const PALETTES = [
  { id: 'comida', name: 'Comida', desc: 'tomate, abóbora, açaí e brócolis' },
  { id: 'oceano', name: 'Oceano', desc: 'azul, turquesa, índigo e verde-água' },
  { id: 'floresta', name: 'Floresta', desc: 'mata, mostarda, cacau e eucalipto' },
  { id: 'lavanda', name: 'Lavanda', desc: 'framboesa, pêssego, lavanda e céu' },
  { id: 'grafite', name: 'Grafite', desc: 'tons sóbrios, quase sem cor' }
];

export function getAppearance() {
  let theme = 'auto', palette = 'comida';
  try { theme = localStorage.getItem('theme') || theme; palette = localStorage.getItem('palette') || palette; } catch (e) { /* sem armazenamento */ }
  if (!THEMES.some(t => t[0] === theme)) theme = 'auto';
  if (!PALETTES.some(p => p.id === palette)) palette = 'comida';
  return { theme, palette };
}

// cor da barra de status do iPhone igual ao fundo do app
function updateThemeColor() {
  document.querySelectorAll('meta[name="theme-color"]').forEach(m => m.remove());
  const m = document.createElement('meta');
  m.name = 'theme-color'; m.content = cssVar('--bg');
  document.head.appendChild(m);
}

export function applyAppearance(a = getAppearance()) {
  const h = document.documentElement;
  if (a.theme === 'auto') delete h.dataset.theme; else h.dataset.theme = a.theme;
  if (a.palette === 'comida') delete h.dataset.palette; else h.dataset.palette = a.palette;
  updateThemeColor();
}

export function setAppearance(patch) {
  const a = { ...getAppearance(), ...patch };
  try { localStorage.setItem('theme', a.theme); localStorage.setItem('palette', a.palette); } catch (e) { /* sem armazenamento */ }
  applyAppearance(a);
  return a;
}

// no modo automático, acompanha a troca de claro/escuro do sistema
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', () => { if (getAppearance().theme === 'auto') updateThemeColor(); });
