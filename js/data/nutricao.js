// Plano alimentar: dados. Edite aqui para mudar opções, porções e textos, sem mexer na interface.
// Macros sempre em m = [kcal, proteína, carboidrato, gordura, fibra], em gramas.
// Textos com dado pessoal de saúde não ficam aqui: o perfil importado no aparelho troca o texto
// genérico pelo pessoal (chaves `noteKey` e marcadores [[chave|texto genérico]] nas dicas).

export const DAYS = {
  A: { id: 'A', name: 'Cardio + musculação', short: 'Cardio + musc', e: '🔥', target: 1700, burn: 2420, cardio: true, musc: true, dinnerH: 21, dinner: '21h00', carbDinner: 0.75, water: 3.5,
    desc: 'Esteira às 7h30 e musculação às 19h. É o dia que mais gasta, então o pré-treino entra.' },
  B: { id: 'B', name: 'Só cardio', short: 'Só cardio', e: '🏃‍♀️', target: 1600, burn: 2220, cardio: true, musc: false, dinnerH: 19.75, dinner: '19h45', carbDinner: 0.75, water: 3,
    desc: 'Esteira de manhã e noite livre. Sem pré-treino e jantar mais cedo.' },
  C: { id: 'C', name: 'Só musculação', short: 'Só musc', e: '🏋️‍♀️', target: 1650, burn: 2200, cardio: false, musc: true, dinnerH: 21, dinner: '21h00', carbDinner: 0.5, water: 3,
    desc: 'Manhã livre e musculação às 19h. Pré-treino entra, jantar com um pouco menos de carboidrato.' },
  D: { id: 'D', name: 'Descanso', short: 'Descanso', e: '🌿', target: 1550, burn: 2000, cardio: false, musc: false, dinnerH: 19.75, dinner: '19h45', carbDinner: 0.5, water: 2.5,
    desc: 'Dia de recuperar. Mesma estrutura, sem pré-treino e com jantar um pouco mais leve.' }
};
export const DAY_IDS = ['A', 'B', 'C', 'D'];
// tipo do dia a partir das atividades
export const typeOf = (cardio, musc) => (cardio && musc ? 'A' : cardio ? 'B' : musc ? 'C' : 'D');

export const TARGET_P = 130;
export const FAT_RANGE = [45, 55];
export const FIBER_RANGE = [25, 30];
export const ON_TARGET_KCAL = 60; // ±60 kcal conta como "dentro da meta"
export const KCAL_PER_KG_FAT = 7700;

export const PROT = [
  { id: 'frango', name: 'Frango', e: '🍗', g: 120, per: [159, 32, 0, 2.5, 0], cas: g => (g >= 110 ? '1 filé médio' : '1 filé pequeno') },
  { id: 'moida', name: 'Carne moída', e: '🥩', g: 100, per: [219, 35.9, 0, 7.3, 0], cas: g => Math.round(g / 25) + ' c. sopa cheias', red: true },
  { id: 'porco', name: 'Lombo de porco', e: '🐖', g: 100, per: [210, 35.7, 0, 6.4, 0], cas: g => (g >= 95 ? '1 bife médio' : '1 bife pequeno'), red: true },
  { id: 'tilapia', name: 'Tilápia', e: '🐟', g: 150, per: [128, 26, 0, 2.7, 0], cas: g => (g / 60).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' filés médios' },
  { id: 'sobrecoxa', name: 'Sobrecoxa', e: '🍗', g: 100, per: [233, 29.2, 0, 12, 0], cas: () => 'sem pele, 1–2 unidades' },
  { id: 'atum', name: 'Atum', e: '🥫', g: 120, per: [110, 25, 0, 1, 0], cas: g => (g >= 110 ? '1 lata drenada' : '¾ de lata drenada') }
];
export const CARB = [
  { id: 'arroz', name: 'Arroz', e: '🍚', g: 100, per: [128, 2.5, 28.1, 0.2, 1.6], cas: g => Math.round(g / 25) + ' c. sopa cheias' },
  { id: 'batata', name: 'Batata', e: '🥔', g: 240, per: [52, 1.2, 11.9, 0, 1.3], cas: g => '≈ ' + (g / 120).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' batatas médias' },
  { id: 'abobora', name: 'Abóbora', e: '🎃', g: 250, per: [48, 1.4, 10.8, 0.7, 2.5], cas: g => '≈ ' + (g / 125).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' xíc. em cubos' },
  { id: 'bdoce', name: 'Batata-doce', e: '🍠', g: 160, per: [77, 0.6, 18.4, 0.1, 2.2], cas: g => '≈ ' + Math.max(1, Math.round(g / 80)) + ' fatias médias' },
  { id: 'macarrao', name: 'Macarrão', e: '🍝', g: 80, per: [158, 5.8, 31, 0.9, 1.8], cas: g => (g >= 70 ? '1 pegador' : '¾ de pegador') },
  { id: 'milho', name: 'Milho', e: '🌽', g: 130, per: [98, 3.2, 17.1, 2.4, 4.6], cas: g => Math.round(g / 25) + ' c. sopa cheias' }
];
export const LEG = { name: 'Cenoura + brócolis cozidos', q: '180 g (≈ 1½ xíc.)', m: [50, 2.7, 10, 0.6, 5] };
export const SAL = { name: 'Alface americana + tomatinhos', q: 'à vontade', m: [16, 0.9, 3, 0.2, 1.5] };
export const OIL = { name: 'Azeite ou óleo no preparo', q: '1 c. chá (5 ml)', m: [40, 0, 0, 4.5, 0] };
export const MOLHO = [
  { id: 'iog', name: 'Iogurte e ervas', e: '🥣', q: '2 c. sopa de iogurte + mostarda', m: [20, 1.3, 2.2, 0.2, 0] },
  { id: 'maio', name: 'Maionese light', e: '🥚', q: '1 c. sopa (15 g)', m: [42, 0.1, 1, 4.2, 0] },
  { id: 'creme', name: 'Levíssimo', e: '🥛', q: '2 c. sopa (30 g)', m: [35, 0.9, 1.5, 3, 0] },
  { id: 'ketchup', name: 'Ketchup + mostarda', e: '🍅', q: '1 c. sopa no total', m: [15, 0.2, 3.4, 0.1, 0] },
  { id: 'zero', name: 'Só temperos', e: '🌿', q: 'alho, ervas, limão', m: [0, 0, 0, 0, 0] }
];
export const PSY = { name: 'Psyllium 5 g no almoço ou jantar', m: [15, 0.1, 4, 0, 4] };
export const DINNER_PROT_FACTOR = 0.84;
export const DEFAULT_BUILD = { prot: 'frango', carb: 'arroz', molho: 'iog' };

export const OPTS = {
  preCardio: [
    { id: 'jejum', name: 'Em jejum', e: '💧', items: [['Água', '300–500 ml']], m: [0, 0, 0, 0, 0],
      note: 'O padrão. O cardio é moderado, então o jejum funciona bem.', noteKey: 'nota.preCardio.jejum' },
    { id: 'banana', name: '½ banana', e: '🍌', items: [['Banana', '½ média (35 g)']], m: [35, 0.4, 9, 0.1, 0.7],
      note: 'Para quando acordar com fome ou já tiver sentido tontura. Tire a outra metade da fruta do café.' },
    { id: 'cafe', name: 'Café com leite', e: '☕', items: [['Café com leite desnatado', '50 ml de leite']], m: [18, 1.6, 2.5, 0.1, 0],
      noteKey: 'nota.preCardio.cafe' },
    { id: 'torrada', name: '2 torradas', e: '🍞', items: [['Torrada integral', '2 unidades (20 g)']], m: [74, 2.4, 14, 1, 1.4] }
  ],
  cafe: [
    { id: 'salgado', name: 'Ovos e pão', e: '🍳', items: [['Ovos mexidos', '2 unidades (100 g)'], ['Pão de forma integral', '1 fatia (25 g)'], ['Muçarela', '1 fatia (20 g)'], ['Leite desnatado, pode ser com café', '200 ml (1 copo)'], ['Fruta', '1 porção (ex.: 150 g de mamão)']], m: [405, 27, 38, 16, 4.4] },
    { id: 'paosal', name: 'Pão de sal', e: '🥖', items: [['Pão francês', '1 unidade (50 g)'], ['Ovo', '1 unidade'], ['Muçarela', '1 fatia (20 g)'], ['Leite desnatado batido com whey', '200 ml + 15 g (½ scoop)']], m: [414, 33, 41, 12, 1.2] },
    { id: 'crepioca', name: 'Crepioca', e: '🫓', items: [['Ovos', '2 unidades'], ['Goma de tapioca', '1 c. sopa (20 g)'], ['Muçarela', '1 fatia (20 g)'], ['Leite desnatado', '200 ml'], ['Fruta', '1 porção']], m: [409, 24, 44, 15, 2.7],
      note: 'A mesma massa vira pão de queijo: forminhas de silicone, 8 min na air fryer.' },
    { id: 'panqueca', name: 'Panqueca de banana', e: '🥞', tag: 'doce', items: [['Ovo', '1 unidade'], ['Whey', '15 g (½ scoop)'], ['Banana', '1 média'], ['Aveia', '2 c. sopa (20 g)'], ['Canela e cacau', 'à vontade'], ['Geleia sem açúcar por cima', '1 c. sopa (20 g)'], ['Leite desnatado', '200 ml']], m: [370, 28, 48, 8, 3.4],
      note: 'Quer a muçarela também? Some 62 kcal e 4,5 g de proteína.' },
    { id: 'rj', name: 'Romeu e Julieta', e: '🧀', tag: 'doce', items: [['Pão de forma integral', '2 fatias (50 g)'], ['Muçarela', '1 fatia (20 g)'], ['Doce de leite ou geleia sem açúcar', '15 g / 20 g'], ['Cappuccino proteico: leite + café + whey', '200 ml + 15 g']], m: [363, 29, 42, 9, 3.4] },
    { id: 'mingau', name: 'Mingau proteico', e: '🥣', tag: 'doce', items: [['Leite desnatado', '250 ml'], ['Aveia em flocos', '30 g (3 c. sopa)'], ['Whey', '20 g'], ['Cacau em pó', '1 c. chá'], ['Banana', '½ média']], m: [331, 29, 44, 5, 4.7] },
    { id: 'tapioca', name: 'Tapioca doce', e: '🍌', tag: 'doce', items: [['Goma de tapioca', '2 c. sopa (30 g)'], ['Muçarela', '1 fatia (20 g)'], ['Banana com canela', '½ média'], ['Leite desnatado batido com whey', '200 ml + 15 g']], m: [329, 23, 46, 6, 1] }
  ],
  lanche: [
    { id: 'bowl', name: 'Bowl de iogurte', e: '🥣', items: [['Iogurte natural desnatado', '1 pote (170 g)'], ['Whey', '15 g (½ scoop)'], ['Chia', '1 c. sopa (10 g)'], ['Fruta', 'morango, ½ banana ou kiwi'], ['Chocopops ou flocos de arroz', '15 g (3 c. sopa)']], m: [286, 22, 41, 5, 4.9],
      note: 'Leve o crocante num potinho separado e misture na hora para não amolecer. Iogurte vai em lancheira térmica.' },
    { id: 'shake', name: 'Shake de whey', e: '🥤', items: [['Whey', '30 g (1 scoop)'], ['Leite desnatado de caixinha', '250 ml']], m: [208, 31, 15, 2.5, 0],
      note: 'Leve o whey no copo e o leite UHT fechado: misture na hora, sem precisar de geladeira. Leve também a banana, que vira seu pré-treino.' },
    { id: 'sfrango', name: 'Sanduíche de frango', e: '🥪', items: [['Pão de forma integral', '2 fatias (50 g)'], ['Frango desfiado', '60 g (3 c. sopa cheias)'], ['Requeijão light', '1 c. sopa (15 g)'], ['Cenoura ralada e alface', 'à vontade']], m: [259, 27, 25, 6, 3.9] },
    { id: 'satum', name: 'Sanduíche de atum', e: '🐟', items: [['Pão de forma integral', '2 fatias (50 g)'], ['Atum ao natural', '½ lata (60 g)'], ['Creme de ricota light', '20 g'], ['Folhas e tomate', 'à vontade']], m: [230, 23, 25, 5, 3.7] },
    { id: 'wrap', name: 'Wrap', e: '🌯', items: [['Rap10 integral', '1 unidade (40 g)'], ['Frango desfiado', '60 g'], ['Muçarela', '1 fatia (20 g)'], ['Folhas', 'à vontade']], m: [283, 27, 21, 9, 2.5] },
    { id: 'ovos', name: 'Ovos e fruta', e: '🥚', items: [['Ovos cozidos', '2 unidades'], ['Muçarela', '1 fatia (20 g)'], ['Fruta', '1 porção']], m: [271, 18, 17, 15, 2],
      note: 'Prático, mas com menos proteína e carboidrato. Nos dias de musculação, faça o pré-treino.' }
  ],
  preTreino: [
    { id: 'banana', name: 'Banana', e: '🍌', items: [['Banana', '1 média']], m: [78, 1, 20, 0.1, 1.6] },
    { id: 'maca', name: 'Maçã', e: '🍎', items: [['Maçã', '1 média (130 g)']], m: [73, 0.4, 19.5, 0.2, 2.6] },
    { id: 'geleia', name: 'Pão com geleia', e: '🍞', items: [['Pão francês', '½ unidade'], ['Geleia sem açúcar', '1 c. sopa']], m: [90, 2.3, 18.5, 0.8, 0.7] },
    { id: 'dl', name: 'Pão com doce de leite', e: '🍯', items: [['Pão de forma', '1 fatia'], ['Doce de leite', '15 g (camada fina)']], m: [109, 4, 19, 2, 1.7],
      note: 'Funciona, só digere um pouco mais devagar que a fruta.' },
    { id: 'barra', name: 'Barrinha de cereal', e: '🍫', items: [['Barrinha de cereal comum', '1 unidade (22 g)']], m: [85, 1, 16, 2, 1] }
  ],
  doce: [
    { id: 'choc', name: 'Chocolate 70%', e: '🍫', items: [['Chocolate 70%', '20 g (≈ 4 quadradinhos)']], m: [115, 1.9, 9.2, 8.4, 2.2] },
    { id: 'dl', name: 'Doce de leite', e: '🍯', items: [['Doce de leite', '1 c. sopa (20 g)']], m: [63, 1.4, 11, 1.5, 0] },
    { id: 'pacoca', name: 'Paçoca', e: '🥜', items: [['Paçoca', '1 unidade (20 g)']], m: [100, 3, 11, 5, 1] },
    { id: 'sorvete', name: 'Sorvete', e: '🍨', items: [['Sorvete de massa', '1 bola (60 g)']], m: [120, 2, 16, 5.5, 0] },
    { id: 'picole', name: 'Picolé de fruta', e: '🍧', items: [['Picolé de fruta', '1 unidade']], m: [70, 0.5, 17, 0.2, 0.5] },
    { id: 'brig', name: 'Brigadeiro', e: '🟤', items: [['Brigadeiro', '1 pequeno (15 g)']], m: [65, 0.6, 9, 3, 0.3] }
  ],
  jantar: [
    { id: 'prato', name: 'Prato', e: '🍽️', builder: true },
    { id: 'atum', name: 'Sanduíche de atum', e: '🥪', items: [['Pão francês', '1 unidade (50 g)'], ['Atum ao natural', '100 g (≈ 1 lata pequena)'], ['Maionese light', '1 c. sopa'], ['Muçarela', '1 fatia (20 g)'], ['Alface e tomate', 'à vontade']], m: [374, 35, 33, 11, 2] },
    { id: 'hamb', name: 'Hambúrguer caseiro', e: '🍔', items: [['Pão de hambúrguer', '1 unidade (50 g)'], ['Hambúrguer de patinho', '120 g cru'], ['Muçarela', '1 fatia (20 g)'], ['Alface, tomate, cebola', 'à vontade'], ['Ketchup e mostarda', '1 c. sopa no total']], m: [389, 36, 32, 13, 2.3],
      note: 'Receita dos discos em Comida › Dicas. Salada crua ao lado sempre cabe.' },
    { id: 'frango', name: 'Sanduíche de frango', e: '🥙', items: [['Pão francês', '1 unidade (50 g)'], ['Frango desfiado', '100 g'], ['Requeijão light', '20 g'], ['Salada', 'à vontade']], m: [359, 39, 32, 7, 2] },
    { id: 'omelete', name: 'Omelete com batata', e: '🍳', items: [['Ovos + claras', '2 + 2'], ['Muçarela', '1 fatia (20 g)'], ['Batata cozida', '200 g'], ['Legumes e salada', 'à vontade']], m: [374, 28, 32, 15, 4.1] }
  ]
};

// Linha do tempo do dia. `h` é a hora decimal usada no prato-relógio.
// O lembrete do remédio da manhã só aparece com o perfil de saúde importado (profile.remedio).
export const SLOTS = [
  { id: 'remedio', kind: 'marker', profile: true },
  { id: 'preCardio', kind: 'meal', title: 'Antes do cardio', time: () => '07h20', h: () => 7 + 20 / 60, show: d => d.cardio },
  { id: 'cardio', kind: 'activity', e: '🏃‍♀️', time: () => '07h30', h: () => 7.5, end: 8.1, label: 'Esteira, 30 min', sub: 'Alterne trote e caminhada.', show: d => d.cardio },
  { id: 'cafe', kind: 'meal', title: 'Café da manhã', time: d => (d.cardio ? '09h00' : '08h30'), h: d => (d.cardio ? 9 : 8.5), show: () => true },
  { id: 'almoco', kind: 'meal', title: 'Almoço', sub: 'Monte o prato: proteína, carboidrato e molho', time: () => '12h00', h: () => 12, show: () => true },
  { id: 'doce', kind: 'meal', optional: true, defaultOn: true, title: 'Docinho', sub: 'depois do almoço ou do jantar', time: () => 'livre', h: () => 13, show: () => true },
  { id: 'lanche', kind: 'meal', title: 'Lanche da faculdade', sub: 'no intervalo das aulas', time: () => '16h40', h: () => 16 + 40 / 60, show: () => true },
  { id: 'preTreino', kind: 'meal', optional: true, defaultOn: true, title: 'Pré-treino', sub: '30–45 min antes', time: () => '18h30', h: () => 18.5, show: d => d.musc },
  { id: 'musc', kind: 'activity', e: '🏋️‍♀️', time: () => '19h00', h: () => 19, end: 20.5, label: 'Musculação', sub: 'Direto da faculdade.', show: d => d.musc },
  { id: 'jantar', kind: 'meal', title: 'Jantar', time: d => d.dinner, h: d => d.dinnerH, show: () => true },
  { id: 'sono', kind: 'marker', e: '🌙', time: () => '22h30', h: () => 22.5, label: 'Dormir', sub: 'Jantar leve ajuda o sono a vir.', show: () => true }
];
export const SLEEP = [22.5, 6];

/* ---------- Trocas ---------- */
export const CATS = [
  { id: 'prot', name: 'Proteínas', e: '🍗', hint: 'Equivalem a 120 g de frango no almoço (~38 g de proteína). No jantar, use cerca de 85% da porção.', rows: [
    ['🍗', 'Frango grelhado', '120 g (1 filé médio)', 191, 38], ['🍗', 'Frango desfiado', '120 g (5 c. sopa cheias)', 196, 38], ['🥩', 'Carne moída de patinho', '100 g (4 c. sopa cheias)', 219, 36],
    ['🐖', 'Lombo ou pernil magro', '100 g (1 bife médio)', 210, 36], ['🐟', 'Tilápia', '150 g (2½ filés médios)', 192, 39], ['🥫', 'Atum ao natural', '120 g (1 lata drenada)', 132, 30],
    ['🥩', 'Músculo cozido', '100 g', 194, 31], ['🍗', 'Sobrecoxa sem pele', '100 g (1–2 unidades)', 233, 29], ['🥚', 'Ovos', '3 inteiros + 2 claras', 250, 26]] },
  { id: 'carb', name: 'Carboidratos', e: '🍚', hint: 'Equivalem a 100 g de arroz (~125 kcal), a porção do almoço. Batata e abóbora dão bem mais volume pelas mesmas calorias.', rows: [
    ['🍚', 'Arroz branco', '100 g (4 c. sopa cheias)', 128, 2.5], ['🥔', 'Batata inglesa', '240 g (2 médias)', 125, 3], ['🎃', 'Abóbora cabotiá', '250 g (2 xíc. em cubos)', 120, 3.5],
    ['🍠', 'Batata-doce', '160 g (2 fatias médias)', 123, 1], ['🍝', 'Macarrão', '80 g (1 pegador)', 126, 4.6], ['🌽', 'Milho verde', '130 g (5 c. sopa cheias)', 127, 4],
    ['🌾', 'Cuscuz de milho', '110 g (1 fatia média)', 124, 2.4], ['🌱', 'Mandioca cozida', '100 g (3 c. sopa rasas)', 125, 0.6],
    ['🍞', 'Pão de forma integral', '2 fatias (50 g)', 124, 6], ['🥖', 'Pão francês', '1 unidade (50 g)', 150, 4.5]] },
  { id: 'fruta', name: 'Frutas', e: '🍓', hint: 'Uma porção ≈ 50–75 kcal. Da sua tabela antiga, com as quantidades revisadas.', rows: [
    ['🍌', 'Banana', '1 média (70 g)', 69, 0.9], ['🍎', 'Maçã', '1 pequena (110 g)', 62, 0.3], ['🍈', 'Mamão', '150 g (½ papaia pequeno)', 60, 0.8],
    ['🍍', 'Abacaxi', '2 fatias finas (150 g)', 72, 1.3], ['🍓', 'Morango', '10 grandes (200 g)', 60, 1.8], ['🍇', 'Uva', '15 unidades (120 g)', 64, 0.8],
    ['🥝', 'Kiwi', '2 pequenos (130 g)', 66, 1.4], ['🍊', 'Laranja ou mexerica', '1 média', 52, 1], ['🥭', 'Manga', '½ média (90 g)', 65, 0.5],
    ['🍉', 'Melancia', '2 fatias (200 g)', 66, 1.8], ['🍈', 'Melão', '1 fatia grande (230 g)', 67, 1.6], ['🍐', 'Pera', '1 pequena (110 g)', 58, 0.6]] },
  { id: 'leg', name: 'Legumes', e: '🥦', hint: 'Coma à vontade: a meta é pelo menos 150 g no almoço e no jantar. Valores para 150 g cozidos. Mix congelado conta.', rows: [
    ['🥕', 'Cenoura', '150 g', 45, 1.2], ['🥦', 'Brócolis', '150 g', 38, 3.2], ['🥒', 'Abobrinha', '150 g', 23, 1.5], ['🫛', 'Vagem', '150 g', 38, 2.2],
    ['🥬', 'Couve-flor', '150 g', 29, 2], ['🥒', 'Chuchu', '150 g', 29, 0.6], ['🫑', 'Pimentão', '150 g', 32, 1.5], ['🍆', 'Berinjela', '150 g', 29, 1],
    ['🍄', 'Cogumelos', '150 g', 38, 4], ['🟣', 'Beterraba', '150 g', 48, 2], ['🥗', 'Repolho cru', '150 g', 26, 1.4], ['🧊', 'Mix congelado', '150 g', 50, 3]] },
  { id: 'lanche', name: 'Lanches', e: '🥪', hint: 'Para carregar na bolsa. Escolha um: cada um funciona sozinho.', rows: null, from: 'lanche' },
  { id: 'cafe', name: 'Cafés', e: '🍳', hint: 'Salgados e doces, todos com 23–33 g de proteína.', rows: null, from: 'cafe' },
  { id: 'doce', name: 'Doces', e: '🍫', hint: 'O docinho do dia tem espaço para ~60–120 kcal. Para algo maior, use Refeição livre.', rows: null, from: 'doce',
    extra: [['🍫', 'Chocolate ao leite', '20 g', 108, 1.5], ['🍓', 'Morango com leite condensado', '10 morangos + 1 c. sopa', 94, 1.8], ['🍌', 'Banana quente com canela e cacau', '1 banana na frigideira ou micro-ondas', 75, 1]] }
];
export const TROCA_REGRAS = [
  '<b>Proteína troca por proteína</b>, não por peso: o que importa é chegar perto dos ~38 g do almoço e ~32 g do jantar.',
  '<b>Carboidrato troca por calorias</b>: arroz, batata, pão e macarrão são intercambiáveis pela kcal.',
  '<b>Queijos amarelos, castanhas, abacate e pasta de amendoim</b> são principalmente gordura: use no lugar do docinho ou do azeite, não da proteína.',
  '<b>Produto “fit” ou “zero”</b>: compare as kcal do rótulo, não a embalagem. Muitas vezes a versão normal em porção menor sai igual.'
];

// Calculadora de troca. carbJ segue o tipo do dia: porção do almoço (125 kcal) × fator do jantar.
export const CALC = [
  { id: 'protA', name: 'Proteína do almoço', e: '🍗', goalP: 38, refK: 191, ref: '120 g de frango' },
  { id: 'protJ', name: 'Proteína do jantar', e: '🍗', goalP: 32, refK: 159, ref: '100 g de frango' },
  { id: 'carbA', name: 'Carbo do almoço', e: '🍚', goalK: 125 },
  { id: 'carbJ', name: 'Carbo do jantar', e: '🍚', goalK: 125, dinnerFactor: true },
  { id: 'fruta', name: 'Fruta', e: '🍓', goalK: 65 },
  { id: 'doce', name: 'Docinho', e: '🍫', goalK: 100 },
  { id: 'lanche', name: 'Lanche inteiro', e: '🥪', goalK: 280, minP: 20 }
];
export const CALC_MIN_PROT_PER_100 = 10;
export const CALC_TOLERANCE = 40;

/* ---------- Refeição livre ---------- */
export const PRESETS = [
  ['🍕', 'Pizza, 3 fatias', 800], ['🍔', 'Hambúrguer + batata', 1100], ['🍣', 'Rodízio japonês', 1000], ['🥤', 'Açaí 500 ml', 650],
  ['🍖', 'Churrasco ou festa', 1200], ['🥟', 'Pastel + caldo de cana', 650], ['🍰', 'Sobremesa de restaurante', 450], ['🍺', '3 cervejas', 450]
];
export const LIVRE_SEGUIR_ATE = 500;
export const LIVRE_MAX_CORTE_DIA = 250;
export const LIVRE_DEFAULT_KCAL = 800;
export const LIVRE_CALLOUT = '<b>Depois da refeição livre:</b> volte ao plano na refeição seguinte, sem jejum e sem cardio extra para “pagar”. A balança pode subir 0,5–2 kg por 1–3 dias por causa de sal, carboidrato e água. Isso não é gordura e some sozinho.';

/* ---------- Dicas ----------
   [[chave|texto genérico]] é trocado pelo texto do perfil (profile.textos[chave]) quando existir.
   Dicas com `perfil` só aparecem se o perfil trouxer profile.dicas[perfil]. */
export const DICAS = [
  { id: 'agua', e: '💧', title: 'Água', small: '2,5 a 3,5 L conforme o dia', html: `
    <p>Sua meta muda com o tipo de dia: <b>2,5 L</b> no descanso, <b>3 L</b> com um treino e <b>3,5 L</b> com cardio e musculação. O contador da tela Hoje já usa a meta certa.</p>
    <ul>
      [[dica.agua.manha|<li>O primeiro copo do dia já conta: tome 300–500 ml ao acordar.</li>]]
      <li>Leve uma garrafa de 1 L para a faculdade e termine antes das 18h30.</li>
      <li>No treino, cerca de 500 ml. Depois das 21h, só goles, para não acordar à noite.</li>
      <li>Urina amarelo-clara ao longo do dia é um bom sinal de hidratação.</li>
    </ul>` },
  { id: 'remedio', perfil: 'remedio' },
  { id: 'cardio', e: '🏃‍♀️', title: 'Cardio da manhã', small: 'Jejum, pré-cardio e progressão', html: `
    <p><b>Jejum funciona bem</b> para 30 minutos de intensidade leve a moderada. Não queima mais gordura no fim do dia, mas é confortável e prático. O que define o resultado é o déficit total.</p>
    <ul>
      <li><b>Acordou com fome ou já sentiu tontura?</b> Coma ½ banana antes e tire a outra metade da fruta do café.</li>
      <li><b>Intensidade:</b> na caminhada você conversa normalmente; no trote fala frases curtas.</li>
      <li><b>Progressão:</b> siga a prescrição da semana que aparece no cardio da tela Hoje (a mesma do Guia).</li>
      <li>Café da manhã até 1 h depois do cardio. Não precisa ser imediato.</li>
    </ul>` },
  { id: 'pretreino', e: '🍌', title: 'Pré-treino da noite', small: 'O que fazer em cada situação', html: `
    <p>O lanche das 16h40 já sustenta boa parte do treino. O pré-treino é um reforço pequeno (20–30 g de carboidrato), 30–45 min antes, e já está contado no dia.</p>
    <div class="tbl"><table>
      <thead><tr><th>Situação</th><th>O que fazer</th></tr></thead>
      <tbody>
        <tr><td>Com fome antes do treino</td><td>Coma o pré-treino. Banana é o mais prático.</td></tr>
        <tr><td>Sem fome</td><td>Pode pular. Deixe a fruta na bolsa caso a energia caia.</td></tr>
        <tr><td>Lanche foi grande ou depois das 17h30</td><td>Pule.</td></tr>
        <tr><td>Lanche foi só o shake</td><td>Coma a banana às 18h30: ela fecha o carboidrato que faltou.</td></tr>
        <tr><td>Treino atrasou (depois das 20h)</td><td>Faça o pré-treino e encurte o treino para não dormir tarde.</td></tr>
        <tr><td>Não vai treinar</td><td>Toque em “Hoje não vou treinar” na tela Hoje. O pré-treino sai sozinho.</td></tr>
      </tbody>
    </table></div>
    <p>Evite antes do treino: muita gordura (castanhas, queijo em quantidade) e muita fibra, porque digerem devagar.</p>` },
  { id: 'fibra', e: '🥦', title: 'Fibra sem feijão', small: 'E onde entra o psyllium', html: `
    <p>Meta: <b>25–30 g por dia</b>. A barra de fibra na tela Hoje mostra quanto você está tendo.</p>
    <ul>
      <li>Legumes no almoço <b>e</b> no jantar (mín. 150 g cada) + salada crua.</li>
      <li>2–3 frutas por dia, com casca quando der (maçã, pera, uva).</li>
      <li>Chia no bowl, aveia na panqueca ou no mingau, pão integral.</li>
      <li>Batata e abóbora com casca rendem mais fibra.</li>
      <li><b>Psyllium:</b> comece com 3 g, suba para 5 g, sempre com 1 copo grande de água, no almoço ou jantar. Ele cobre a fibra solúvel, mas não o ferro do feijão; [[dica.fibra.ferro|quem cobre o ferro é a carne vermelha 3–4x por semana.]]</li>
      <li>Se um dia quiser testar, grão-de-bico ou lentilha em lata/sachê já vêm cozidos: 2 c. sopa na salada.</li>
    </ul>` },
  { id: 'temperos', e: '🧄', title: 'Temperos e condimentos', small: 'Sabor sem pesar nas calorias', html: `
    <h4>Base</h4>
    <ul class="pills"><li>alho</li><li>cebola</li><li>cheiro-verde</li><li>limão</li><li>vinagre</li><li>pimenta-do-reino</li></ul>
    <h4>Especiarias</h4>
    <ul class="pills"><li>páprica defumada</li><li>cominho</li><li>cúrcuma</li><li>curry</li><li>noz-moscada (molhos cremosos)</li><li>canela (doces)</li><li>gengibre</li></ul>
    <h4>Ervas</h4>
    <ul class="pills"><li>orégano</li><li>manjericão</li><li>alecrim</li><li>tomilho</li><li>hortelã</li><li>coentro</li><li>chimichurri seco</li></ul>
    <h4>Intensidade</h4>
    <ul class="pills"><li>mostarda</li><li>molho inglês</li><li>shoyu (pouco)</li><li>raspas de limão</li><li>parmesão (1 c. sopa ≈ 20 kcal)</li><li>pimenta</li></ul>
    <p><b>Sobre o sal:</b> caldo em cubo e tempero pronto concentram muito sódio. [[dica.temperos.sal|Vale trocar por ervas + ácido (limão ou vinagre)]], que dão sensação de sabor com menos sal. Truque: “sal de ervas”, 1 parte de sal para 2 de ervas secas, batido no pilão ou liquidificador.</p>` },
  { id: 'molhos', e: '🥣', title: 'Molhos rápidos', small: 'Todos cabem nos 30–50 kcal do prato', html: `
    <div class="recipe"><h4>Iogurte, limão e ervas</h4><p class="meta">≈ 20 kcal por porção</p>2 c. sopa de iogurte natural + suco de ½ limão + alho ralado + hortelã ou salsinha + sal e pimenta.</div>
    <div class="recipe"><h4>Mostarda e mel</h4><p class="meta">≈ 30 kcal</p>1 c. chá de mostarda + ½ c. chá de mel + 1 c. sopa de iogurte + gotas de limão.</div>
    <div class="recipe"><h4>Rosé light</h4><p class="meta">≈ 55 kcal (num dia sem azeite no preparo)</p>1 c. sopa de maionese light + 1 c. sopa de ketchup + gotas de limão.</div>
    <div class="recipe"><h4>Cremoso de Levíssimo</h4><p class="meta">≈ 40 kcal</p>2 c. sopa de creme de leite Levíssimo + 1 c. chá de mostarda + alho + cebolinha. Fica ótimo com frango e brócolis.</div>
    <div class="recipe"><h4>Tomate rápido</h4><p class="meta">≈ 25 kcal</p>3 c. sopa de molho de tomate + alho + orégano, aquecido 1 min. Bom para carne moída e macarrão.</div>
    <div class="recipe"><h4>Vinagrete</h4><p class="meta">≈ 45 kcal</p>Tomate, cebola e pimentão picados + cheiro-verde + vinagre + 1 c. chá de azeite + sal. Rende para 2 refeições se dividir o azeite.</div>` },
  { id: 'receitas', e: '👩‍🍳', title: 'Receitinhas', small: 'Para cozinhar 2x na semana e montar o resto', html: `
    <div class="recipe"><h4>Frango da semana em cubos</h4><p class="meta">Rende ~6 porções de 120 g</p>1 kg de peito em cubos marinado com 3 c. sopa de iogurte natural, alho, limão, páprica e sal (30 min ou na véspera). Air fryer ou forno a 200 °C por 20–25 min. Divida em potes de 120 g.</div>
    <div class="recipe"><h4>Carne moída base</h4><p class="meta">500 g crus rendem ~4 porções de 85–100 g</p>Patinho moído refogado com cebola, alho e tomate, finalizado com cheiro-verde. Para render mais volume, junte 1 abobrinha ralada.</div>
    <div class="recipe"><h4>Hambúrguer caseiro</h4><p class="meta">4 discos de 120 g, ≈ 160 kcal e 26 g de proteína cada (cru)</p>500 g de patinho moído + ½ cebola ralada + 1 dente de alho + sal, pimenta e páprica defumada. Modele, congele entre papel-manteiga. Frigideira antiaderente 3–4 min por lado, ou air fryer a 200 °C por 10–12 min.</div>
    <div class="recipe"><h4>Patê de frango ou atum</h4><p class="meta">≈ 80 kcal e 10 g de proteína a cada 60 g</p>250 g de frango cozido desfiado (ou 2 latas de atum) + 1 cenoura ralada + 200 g de creme de ricota light ou cottage + cebola, alho, cheiro-verde, sal e pimenta. Misture ou processe. Dura 4 dias na geladeira.</div>
    <div class="recipe"><h4>Panqueca de banana</h4><p class="meta">Do seu plano antigo</p>Amasse 1 banana, misture 1 ovo, 15 g de whey, 2 c. sopa de aveia, canela e cacau. Frigideira em fogo baixo ou forminhas na air fryer por 8 min.</div>
    <div class="recipe"><h4>Pão de queijo de crepioca</h4><p class="meta">Do seu plano antigo</p>1 ovo + 1 c. sopa de goma de tapioca + 1 fatia de muçarela picada + sal e orégano. Forminhas de silicone, 8 min na air fryer a 180 °C.</div>
    <div class="recipe"><h4>Estrogonofe leve</h4><p class="meta">Do seu plano antigo, rende 3 porções</p>350 g de frango ou patinho em tiras grelhados + cebola e alho + 4 c. sopa de molho de tomate + 1 c. sobremesa de mostarda + 1 c. sopa de ketchup + 150 g de creme de ricota light. Conta como proteína + molho do prato.</div>
    <div class="recipe"><h4>Batata ou abóbora em 8 minutos</h4><p class="meta">Para dias sem tempo</p>Em pote de vidro tampado com 2 c. sopa de água, 6–8 min no micro-ondas. Ou air fryer a 200 °C por 18–20 min com o azeite do prato (1 c. chá).</div>` },
  { id: 'fora', e: '🍴', title: 'Comendo fora', small: 'Self-service, lanchonete, festa', html: `
    <ul>
      <li><b>Self-service:</b> metade do prato com salada e legumes, proteína do tamanho da palma da mão, uma fonte de carboidrato (3–4 c. sopa). Se vier arroz e batata frita, pegue um pouco de cada em vez de dois montes.</li>
      <li><b>Lanchonete:</b> sanduíche de frango ou hambúrguer simples, sem a porção grande de batata.</li>
      <li><b>Pizza:</b> 2–3 fatias + salada antes. Se passar disso, use Comida › Refeição livre.</li>
      <li><b>Festa:</b> coma o lanche normalmente antes de ir. Chegar com muita fome é o que mais faz exagerar.</li>
      <li><b>Bebida alcoólica:</b> 1 lata de cerveja ≈ 150 kcal; 1 taça de vinho ≈ 125 kcal. Alterne com água.</li>
    </ul>` },
  { id: 'funcionando', e: '📈', title: 'Está funcionando?', small: 'Quando e como ajustar', html: `
    <p>Ritmo esperado: <b>0,5–0,8 kg por semana</b> na média semanal. As duas primeiras semanas costumam mostrar mais, por água e glicogênio.[[dica.funcionando.meta|]]</p>
    <div class="tbl"><table>
      <thead><tr><th>Sinal (2–3 semanas seguidas)</th><th>Ajuste</th></tr></thead>
      <tbody>
        <tr><td>Média cai menos de 0,3 kg/semana com boa aderência</td><td>Tire 100–150 kcal: o docinho diário ou 1–2 c. sopa de arroz.</td></tr>
        <tr><td>Mais de 1 kg/semana depois da semana 3, cargas caindo, fome constante, sono ruim</td><td>Some 100–150 kcal, de preferência em carboidrato perto do treino.</td></tr>
        <tr><td>Dor muscular por mais de 72 h, desempenho caindo</td><td>Reduza volume de treino antes de mexer na comida.</td></tr>
        <tr><td>Cansaço fora do comum, frio, estagnação sem explicação</td><td>[[dica.funcionando.medico|Converse com seu médico antes de mudar o plano.]]</td></tr>
      </tbody>
    </table></div>
    <ul>
      <li><b>Cintura:</b> na altura do umbigo, a cada 2 semanas.</li>
      <li><b>Fotos:</b> a cada 4 semanas, mesma luz e roupa.</li>
      <li><b>Dobras cutâneas:</b> a cada 6–8 semanas, com o mesmo avaliador.</li>
      <li><b>Ciclo menstrual:</b> na semana antes da menstruação a balança pode subir 1–2 kg de água. Compare com a mesma fase do mês anterior.</li>
    </ul>` },
  { id: 'medico', e: '🩺', title: 'Para levar ao médico', small: '[[dica.medico.sub|O que anotar para a consulta]]', html: `
    [[dica.medico.pontos|<ul><li>Médias de peso e cintura das últimas semanas (aba Progresso).</li><li>Como estão o sono, a energia e o apetite.</li><li>Os exames mais recentes, para comparar com os anteriores.</li></ul>]]
    <div class="alert"><b>Pare o treino e procure avaliação</b> se tiver dor ou aperto no peito, falta de ar desproporcional ao esforço, palpitação forte, desmaio ou tontura que não passa ao parar.</div>` }
];
export const RODAPE = '[[rodape|Calorias e gasto são estimativas com margem de cerca de ±200 kcal; o que confirma o ajuste é a tendência de peso e medidas. Não substitui nutricionista nem médico.]]';

/* ---------- Semana ---------- */
export const WEEK_NOTES = {
  semDescanso: '<b>Sem nenhum dia de descanso total.</b> Recomendo pelo menos um: é onde músculo e articulações se recuperam, e a vontade de treinar volta.',
  muitaMusc: n => `<b>Musculação em ${n} dias</b> é bastante para quem está retomando. Comece com 4 e suba se a recuperação estiver boa.`,
  semTreino: '<b>Semana sem treino.</b> O plano continua funcionando; o déficit só fica menor.',
  ok: '<b>Boa distribuição.</b> Se puder, deixe um dia livre no meio da semana (como a quarta) em vez de cinco dias seguidos: a recuperação agradece.'
};
export const WEIGHT_MSGS = [
  [-1, 'Queda forte. Normal nas 2 primeiras semanas; depois disso, se continuar, vale comer um pouco mais.'],
  [-0.4, 'Dentro do ritmo esperado (0,5–0,8 kg por semana).'],
  [-1e-9, 'Queda lenta. Se repetir por 2–3 semanas com boa aderência, tire 100–150 kcal.'],
  [Infinity, 'Média subiu ou ficou igual. Uma semana assim não diz muito: confira fase do ciclo, sal e sono antes de mudar algo.']
];
