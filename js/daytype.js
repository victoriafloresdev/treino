// Tipo de dia (A/B/C/D) com uma única fonte de verdade: a ficha de treino.
// - previsto: modelo semanal (vem da ficha; editável em Mais)
// - registrar uma atividade não prevista eleva o tipo
// - não registrar não rebaixa sozinho; só as ações "Hoje não vou treinar" / "Pular cardio de hoje"
// - a escolha manual da data sempre vence
import { DAYS, typeOf } from './data/nutricao.js';
import { WEEK } from './plan.js';

// índice 0 = segunda ... 6 = domingo
export const WD = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
export const monIdx = date => (new Date(date + 'T12:00:00').getDay() + 6) % 7;

export function weekModelFromPlan() {
  return WD.map((_, i) => {
    const w = WEEK.find(x => x.dow === (i + 1) % 7);
    return typeOf(!/descanso/i.test(w.cardio), !!w.musc);
  });
}

export const SOURCES = { ficha: 'previsto na semana', registro: 'ajustado pelo registro', voce: 'escolhido por você' };

// model: 7 tipos (seg..dom); reg: { cardio, musc } registrados na data; rec: registro do store daytypes
export function resolveDay(date, model, reg = {}, rec = null) {
  const plannedType = model[monIdx(date)];
  if (rec?.override && DAYS[rec.override]) return { type: rec.override, plannedType, source: 'voce', manual: true };
  const p = DAYS[plannedType];
  const skip = rec?.skip || {};
  const cardio = (p.cardio && !skip.cardio) || !!reg.cardio;
  const musc = (p.musc && !skip.musc) || !!reg.musc;
  const type = typeOf(cardio, musc);
  // atividade além do previsto veio do registro; faltar algo previsto só acontece por escolha
  const beyondPlan = (cardio && !p.cardio) || (musc && !p.musc);
  const source = type === plannedType ? 'ficha' : beyondPlan ? 'registro' : 'voce';
  return { type, plannedType, source, manual: false, skip: { cardio: !!skip.cardio, musc: !!skip.musc } };
}
