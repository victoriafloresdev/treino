// Calorias e macros de cada item das opções de refeição: [kcal, proteína, carboidrato, gordura, fibra].
// Estimativas pela tabela TACO e rótulos comuns, na porção da opção. O app ajusta cada opção para a soma
// dos itens dar exatamente o total já usado no plano (nutri.js › itemMacros), então nenhum total muda.
// Servem só para descontar os itens que você tirar de uma refeição num dia.
const OVO = [72, 6.3, 0.4, 5, 0];
const OVOS2 = [143, 12.6, 0.8, 10, 0];
const MUCARELA = [66, 4.5, 0.6, 5, 0];
const LEITE200 = [70, 6.6, 10, 0.2, 0];
const LEITE_WHEY = [130, 18, 11.5, 1, 0];
const FRUTA = [60, 0.8, 15, 0.2, 2.7];
const PAO_FORMA2 = [126, 4.8, 22, 1.8, 3.4];
const PAO_FRANCES = [150, 4, 29, 1.6, 1.2];
const FRANGO60 = [98, 19, 0, 2.3, 0];
const SALADA = [8, 0.4, 1.6, 0.1, 0.8];

export const ITEM_EST = {
  'cafe:salgado': [[150, 12.5, 1, 10.5, 0], [63, 2.4, 11, 0.9, 1.7], MUCARELA, LEITE200, FRUTA],
  'cafe:paosal': [PAO_FRANCES, OVO, MUCARELA, LEITE_WHEY],
  'cafe:crepioca': [OVOS2, [68, 0, 17, 0, 0], MUCARELA, LEITE200, FRUTA],
  'cafe:panqueca': [OVO, [60, 11.5, 1.5, 0.8, 0], [78, 1, 20, 0.1, 1.6], [79, 2.8, 13.4, 1.7, 2], [5, 0.3, 0.6, 0.2, 0.6], [10, 0, 4, 0, 0.2], LEITE200],
  'cafe:rj': [PAO_FORMA2, MUCARELA, [47, 1, 8, 1.1, 0], LEITE_WHEY],
  'cafe:mingau': [[88, 8.3, 12.5, 0.3, 0], [118, 4.2, 20, 2.6, 2.9], [80, 15.5, 2, 1, 0], [7, 0.4, 0.3, 0.4, 0.8], [39, 0.5, 10, 0.1, 0.8]],
  'cafe:tapioca': [[102, 0, 25, 0, 0], MUCARELA, [40, 0.5, 10, 0.1, 0.9], LEITE_WHEY],
  'lanche:bowl': [[70, 7, 10, 0.5, 0], [60, 11.5, 1.5, 0.8, 0], [49, 1.7, 4.2, 3.1, 3.4], [45, 0.6, 10.5, 0.2, 1.5], [58, 0.8, 13, 0.3, 0]],
  'lanche:shake': [[120, 23, 3, 1.6, 0], [88, 8.3, 12.5, 0.3, 0]],
  'lanche:sfrango': [PAO_FORMA2, FRANGO60, [28, 1.5, 0.5, 2.3, 0], [10, 0.5, 2, 0.1, 0.8]],
  'lanche:satum': [PAO_FORMA2, [70, 15.5, 0, 0.6, 0], [28, 2.2, 0.6, 1.8, 0], SALADA],
  'lanche:wrap': [[120, 3.5, 19, 3, 1.8], FRANGO60, MUCARELA, [5, 0.3, 0.8, 0.1, 0.6]],
  'lanche:ovos': [OVOS2, MUCARELA, FRUTA],
  'preTreino:geleia': [[75, 2, 14.5, 0.8, 0.6], [10, 0, 4, 0, 0.1]],
  'preTreino:dl': [[63, 2.4, 11, 0.9, 1.7], [47, 1, 8, 1.1, 0]],
  'jantar:atum': [PAO_FRANCES, [117, 26, 0, 1, 0], [40, 0.1, 1, 4, 0], MUCARELA, SALADA],
  'jantar:hamb': [[135, 4.5, 24, 2, 1.2], [160, 25, 0, 6, 0], MUCARELA, SALADA, [15, 0.3, 3.5, 0.1, 0.2]],
  'jantar:frango': [PAO_FRANCES, [163, 31, 0, 3.8, 0], [37, 2, 0.6, 3, 0], SALADA],
  'jantar:omelete': [[177, 19.5, 1.2, 10, 0], MUCARELA, [104, 2.4, 24, 0.2, 2.6], [20, 1, 4, 0.2, 1.5]]
};
