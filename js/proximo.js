// O que vem agora: a próxima refeição. Função pura.
import { countedMeals, mealOf } from './nutri.js';

// Próxima refeição: a primeira ainda não feita depois da última marcada como feita.
// Se nada foi marcado, a primeira do dia (o café da manhã): só avança quando você marca. info: resultado de dayInfo.
export function nextMeal(info) {
  const meals = countedMeals(info.d, info.st, info.profile);
  if (!meals.length) return null;
  const lastDone = meals.reduce((idx, s, i) => (info.done[s.id] ? i : idx), -1);
  let next;
  if (lastDone >= 0) next = meals.slice(lastDone + 1).find(s => !info.done[s.id]);
  else next = meals.find(s => !info.done[s.id]);
  // refeições anteriores que ficaram sem marcar (para lembrar, sem cobrar)
  const skipped = meals.filter((s, i) => !info.done[s.id] && (lastDone >= 0 ? i < lastDone : false));
  if (!next) return { done: meals.every(s => info.done[s.id]), skipped, slot: null };
  return { slot: next, meal: mealOf(next.id, info.d, info.st), time: next.time(info.d), skipped };
}
