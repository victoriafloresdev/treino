// Utilidades: datas, números e texto. Sem dependências.

export const $ = (s, el = document) => el.querySelector(s);
export const $$ = (s, el = document) => [...el.querySelectorAll(s)];
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const pad2 = n => String(n).padStart(2, '0');
export const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const parseDate = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (s, n) => { const d = parseDate(s); d.setDate(d.getDate() + n); return todayStr(d); };
export const weekStart = s => { const d = parseDate(s); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return todayStr(d); };
export const fmtShort = s => { const d = parseDate(s); return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`; };
export const DIAS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
export const cap = s => s[0].toUpperCase() + s.slice(1);
export const fmtLong = s => { const d = parseDate(s); return `${cap(DIAS[d.getDay()])}, ${d.getDate()} de ${MESES[d.getMonth()]}`; };
export const num = v => { if (v == null || String(v).trim() === '') return null; const n = Number(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
export const fmtN = (n, d = 1) => n == null ? '–' : (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('pt-BR');
// Semana ISO (segunda a domingo), ex.: { year: 2026, week: 44, id: '2026-W44' }
export function isoWeek(s) {
  const d = parseDate(s); d.setHours(12);
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7)); // quinta da mesma semana
  const y = d.getFullYear(), jan4 = new Date(y, 0, 4, 12);
  const week = 1 + Math.round(((d - jan4) / 864e5 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return { year: y, week, id: `${y}-W${pad2(week)}` };
}
