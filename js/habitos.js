// Hábitos do dia, definidos pelo tipo de dia. Premiam o hábito, nunca o peso.
import { waterGoalCups } from './nutri.js';

export const PROT_HABIT = 120;
export const MEALS_HABIT = 0.8;

// info: resultado de dayInfo; weighed: houve pesagem na data
export function habitsOf(info, weighed) {
  const { d, reg, eaten, water, doneCount, mealCount } = info;
  const list = [];
  if (d.musc) list.push({ id: 'treino', label: 'Treino feito', done: !!reg.musc });
  if (d.cardio) list.push({ id: 'cardio', label: 'Cardio feito', done: !!reg.cardio });
  // dia de descanso previsto: descansar conta como hábito cumprido
  if (!d.musc && !d.cardio) list.push({ id: 'descanso', label: 'Dia de descanso', done: true });
  list.push({ id: 'proteina', label: `Proteína: ${PROT_HABIT} g ou mais`, done: eaten[1] >= PROT_HABIT });
  list.push({ id: 'agua', label: 'Água na meta', done: water >= waterGoalCups(d) });
  list.push({ id: 'refeicoes', label: 'Refeições marcadas (80% ou mais)', done: mealCount > 0 && doneCount / mealCount >= MEALS_HABIT });
  list.push({ id: 'peso', label: 'Pesagem', done: !!weighed });
  return { list, done: list.filter(h => h.done).length, total: list.length };
}
