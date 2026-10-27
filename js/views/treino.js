// Aba Treino › Musculação: abre no treino escolhido, no do dia (se ainda não feito) ou no próximo da sequência.
import { parseDate } from '../util.js';
import { loadAll, doneThisWeek, nextInSequence, planById } from '../training.js';
import { WEEK, PLAN } from '../plan.js';
import { S, viewSessao } from './sessao.js';
import { viewDate } from '../ui/dia-ativo.js';

export function defaultWorkout(all) {
  const done = doneThisWeek(all);
  const today = WEEK.find(w => w.dow === parseDate(viewDate()).getDay())?.plan;
  if (today && !done[today]) return today;
  return (nextInSequence(done) || PLAN[0]).id;
}
export async function viewTreinoLista() {
  const id = S.pick && planById(S.pick) ? S.pick : defaultWorkout(await loadAll());
  await viewSessao(id);
}
