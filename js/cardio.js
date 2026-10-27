// Cardio da manhã: etapas da corrida, segmentos do timer e regra de progressão. Sem DOM e sem banco.
// Progressão: só sugere a próxima etapa com 2 sessões completas da etapa atual sem dor no dia
// seguinte E quando a semana do programa já chegou nela. Com dor, oferece repetir ou voltar.

const MIN = 60;
const walk = (label, min) => ({ kind: 'caminhada', label, secs: Math.round(min * MIN) });
const trot = min => ({ kind: 'trote', label: 'Trote leve', secs: Math.round(min * MIN) });
const reps = (n, a, b) => Array.from({ length: n }, () => [trot(a), walk('Caminhada', b)]).flat();

// Etapas dos dias de corrida (quarta e sábado). O texto é o mesmo do Guia.
export const STAGES = [
  { n: 0, label: 'Etapa 1', text: 'Caminhada rápida com inclinação de 3–6%, cerca de 30 min', segs: [walk('Caminhada rápida, inclinação 3–6%', 30)] },
  { n: 1, label: 'Etapa 2', text: '5 min caminhando + 7 × (1 min trote leve + 2 min caminhada) + 4 min caminhando',
    segs: [walk('Aquecimento caminhando', 5), ...reps(7, 1, 2), walk('Volta à calma caminhando', 4)] },
  { n: 2, label: 'Etapa 3', text: '5 min caminhando + 6 × (2 min trote + 2 min caminhada) + 1 min caminhando',
    segs: [walk('Aquecimento caminhando', 5), ...reps(6, 2, 2), walk('Volta à calma caminhando', 1)] },
  { n: 3, label: 'Etapa 4', text: '5 min caminhando + 5 × (3 min trote + 1,5 min caminhada) + 2,5 min caminhando',
    segs: [walk('Aquecimento caminhando', 5), ...reps(5, 3, 1.5), walk('Volta à calma caminhando', 2.5)] }
];
export const LAST_STAGE = STAGES.length - 1;
export const RUN_DAYS = [3, 6]; // quarta e sábado
export const PAIN = [['nenhuma', 'Nenhuma'], ['canela', 'Canela'], ['joelho', 'Joelho'], ['aquiles', 'Tendão de Aquiles'], ['outra', 'Outra']];
export const painLabel = id => (PAIN.find(p => p[0] === id) || [, id])[1];

// etapa que o calendário do programa permite: semanas 1–2, 3–4, 5–6, 7+
export const weekStage = week => (week <= 2 ? 0 : week <= 4 ? 1 : week <= 6 ? 2 : 3);

// O cardio do dia. dow: 0 = domingo.
export function cardioOfDay(dow, stage) {
  if (dow === 0) return { kind: 'descanso', text: 'Descanso completo', segs: [] };
  if (RUN_DAYS.includes(dow)) { const s = STAGES[stage]; return { kind: 'corrida', stage, label: s.label, text: s.text, segs: s.segs }; }
  const text = (dow === 1 || dow === 4) ? 'Caminhada moderada, 25–30 min' : 'Caminhada leve, 25–30 min';
  return { kind: 'caminhada', text, segs: [walk(dow === 1 || dow === 4 ? 'Caminhada moderada' : 'Caminhada leve', 30)] };
}
export const totalSecs = segs => segs.reduce((a, s) => a + s.secs, 0);

// Onde o timer está depois de `elapsed` segundos.
export function timerAt(segs, elapsed) {
  const total = totalSecs(segs);
  let acc = 0;
  for (let i = 0; i < segs.length; i++) {
    if (elapsed < acc + segs[i].secs) return { idx: i, seg: segs[i], segLeft: acc + segs[i].secs - elapsed, totalLeft: total - elapsed, done: false, next: segs[i + 1] || null };
    acc += segs[i].secs;
  }
  return { idx: segs.length, seg: null, segLeft: 0, totalLeft: 0, done: true, next: null };
}

// Sessões de dia de corrida (têm `stage`) ainda sem resposta sobre dor, de até 3 dias atrás.
export function pendingPainCheck(records, today) {
  const lim = addDaysStr(today, -3);
  return records.filter(r => r.stage != null && r.painNextDay == null && r.date < today && r.date >= lim)
    .sort((a, b) => (a.date < b.date ? 1 : -1))[0] || null;
}
function addDaysStr(s, n) { const d = new Date(s + 'T12:00:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); }

// Situação da etapa atual. records: registros de cardio; stage: etapa atual; week: semana do programa.
export function progression(records, stage, week) {
  const at = records.filter(r => r.stage === stage).sort((a, b) => (a.date === b.date ? (a.updatedAt || 0) - (b.updatedAt || 0) : a.date < b.date ? -1 : 1));
  const last = at[at.length - 1];
  if (last && last.painNextDay && last.painNextDay !== 'nenhuma') return { state: 'dor', pain: last.painNextDay, date: last.date, streak: 0, canBack: stage > 0 };
  // sessões completas e sem dor seguidas, da mais recente para trás
  let streak = 0;
  for (let i = at.length - 1; i >= 0; i--) {
    const r = at[i];
    if (r.completed === 'sim' && r.painNextDay === 'nenhuma') streak++;
    else if (r.completed === 'sim' && r.painNextDay == null) continue; // ainda aguardando a resposta do dia seguinte
    else break;
  }
  if (stage >= LAST_STAGE) return { state: streak >= 2 ? 'final' : 'seguir', streak };
  if (streak < 2) return { state: 'seguir', streak };
  return weekStage(week) > stage ? { state: 'avancar', streak, next: stage + 1 } : { state: 'aguardar', streak, next: stage + 1, fromWeek: 2 * (stage + 1) + 1 };
}
