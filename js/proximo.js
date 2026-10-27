// O que vem agora: próxima refeição e mensagem do dia. Funções puras.
import { countedMeals, mealOf } from './nutri.js';
import { MENSAGENS } from './data/mensagens.js';

// Próxima refeição: a primeira ainda não feita depois da última marcada como feita.
// Se nada foi marcado, a da hora do dia (com 1 h de tolerância). info: resultado de dayInfo.
export function nextMeal(info, hour) {
  const meals = countedMeals(info.d, info.st, info.profile);
  if (!meals.length) return null;
  const lastDone = meals.reduce((idx, s, i) => (info.done[s.id] ? i : idx), -1);
  let next;
  if (lastDone >= 0) next = meals.slice(lastDone + 1).find(s => !info.done[s.id]);
  else next = meals.find(s => !info.done[s.id] && s.time(info.d) !== 'livre' && s.h(info.d) >= hour - 1) || meals.find(s => !info.done[s.id]);
  // refeições anteriores que ficaram sem marcar (para lembrar, sem cobrar)
  const skipped = meals.filter((s, i) => !info.done[s.id] && (lastDone >= 0 ? i < lastDone : false));
  if (!next) return { done: meals.every(s => info.done[s.id]), skipped, slot: null };
  return { slot: next, meal: mealOf(next.id, info.d, info.st), time: next.time(info.d), skipped };
}

// Escolha estável por data: muda de um dia para o outro, não muda durante o dia.
function pick(list, date, salt = 0) {
  let h = salt;
  for (const c of date) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}
// ctx: { hour, cardio, musc, cardioDone, muscDone, weekPct, weekday (1 = seg) }
export function mensagemDoDia(ctx, date) {
  let key = 'geral';
  if (ctx.hour >= 20) key = 'noite';
  else if (ctx.muscDone) key = 'treinoFeito';
  else if (ctx.cardio && !ctx.cardioDone && ctx.hour < 10) key = 'manhaCardio';
  else if (!ctx.cardio && !ctx.musc) key = 'descanso';
  else if (ctx.weekday >= 4 && ctx.weekPct != null && ctx.weekPct < 50) key = 'semanaCorrida';
  else if (ctx.weekPct != null && ctx.weekPct >= 80 && ctx.weekday >= 3) key = 'semanaBoa';
  else if (ctx.musc) key = 'diaTreino';
  return { key, text: pick(MENSAGENS[key], date, key.length) };
}
