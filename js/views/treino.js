// Aba Treino › Musculação: abre no treino escolhido ou no sugerido pela sequência.
import { planById } from '../training.js';
import { S, viewSessao } from './sessao.js';

export async function viewTreinoLista() {
  await viewSessao(S.pick && planById(S.pick) ? S.pick : null);
}
