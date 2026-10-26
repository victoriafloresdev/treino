// Ficha de treino: Upper/Lower 4x. Edite aqui para mudar exercícios, séries e textos.
export const MUSCLES = {
 "quads": "Quadríceps",
 "glutes": "Glúteo máximo",
 "glute_med": "Glúteo médio",
 "hamstrings": "Posteriores de coxa",
 "adductors": "Adutores",
 "calves": "Panturrilhas",
 "abs": "Abdômen",
 "obliques": "Oblíquos",
 "chest": "Peitoral",
 "front_delt": "Deltoide anterior",
 "side_delt": "Deltoide lateral",
 "rear_delt": "Deltoide posterior",
 "lats": "Dorsais",
 "midback": "Meio das costas (romboides e trapézio médio)",
 "traps": "Trapézio superior",
 "biceps": "Bíceps",
 "triceps": "Tríceps",
 "forearms": "Antebraços",
 "lowerback": "Lombar"
};

export const PLAN = [
 {
  "id": "inferior-a",
  "name": "Inferior A",
  "short": "Inf. A",
  "day": "Segunda",
  "dow": 1,
  "kind": "lower",
  "focus": "Foco em quadríceps",
  "sets": [
   "12",
   "16"
  ],
  "time": [
   "~40 min",
   "50–55 min"
  ],
  "cardio": "Manhã: caminhada moderada",
  "items": [
   {
    "n": "1",
    "id": "ia1",
    "name": "Leg press 45°",
    "img": "Leg_Press",
    "sets": [
     2,
     3
    ],
    "reps": "8–12",
    "rir": "2–3",
    "rest": "2–3 min",
    "prim": [
     "quads",
     "glutes"
    ],
    "sec": [
     "adductors",
     "hamstrings"
    ],
    "foco": "Empurre com o pé inteiro e sinta a frente da coxa e o glúteo trabalhando juntos.",
    "tips": [
     "Pés no meio da plataforma, na largura do quadril, pontas levemente para fora.",
     "Desça só até onde a lombar continua colada no encosto. Esse é o seu limite de amplitude.",
     "Empurre a plataforma sem travar o joelho no topo: pare logo antes de estender por completo.",
     "Desça em cerca de 2 segundos, sem deixar a carga “cair”."
    ],
    "postura": "Joelho varo não impede o exercício. O que importa é o joelho acompanhar a direção da ponta do pé durante todo o movimento, sem abrir nem fechar.",
    "evite": [
     "Quadril descolando do banco no fundo da descida.",
     "Joelhos se fechando para dentro na subida."
    ],
    "alt": "Leg press horizontal ou hack machine.",
    "q": "leg press 45 execução correta",
    "restSec": 150,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "2",
    "id": "ia2",
    "name": "Cadeira flexora (sentada)",
    "img": "Seated_Leg_Curl",
    "sets": [
     2,
     3
    ],
    "reps": "10–15",
    "rir": "1–2",
    "rest": "90 s",
    "prim": [
     "hamstrings"
    ],
    "sec": [
     "calves"
    ],
    "foco": "Parte de trás da coxa. O movimento sai do joelho; o quadril fica parado.",
    "tips": [
     "Alinhe o eixo do aparelho com a articulação do joelho.",
     "Rolo inferior logo acima do tornozelo; trava da coxa firme, sem apertar demais.",
     "Incline o tronco levemente à frente: o posterior fica mais alongado e trabalha mais.",
     "Puxe até onde conseguir e volte em 2–3 segundos."
    ],
    "evite": [
     "Levantar o quadril do assento para completar a repetição.",
     "Soltar a volta rápido."
    ],
    "alt": "Mesa flexora (deitada).",
    "q": "cadeira flexora sentada execução",
    "restSec": 90,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "3",
    "id": "ia3",
    "name": "Cadeira extensora",
    "img": "Leg_Extensions",
    "sets": [
     2,
     3
    ],
    "reps": "10–15",
    "rir": "1–2",
    "rest": "90 s",
    "prim": [
     "quads"
    ],
    "sec": [],
    "foco": "Frente da coxa. Segure 1 segundo com a perna estendida e sinta o quadríceps contrair.",
    "tips": [
     "Eixo do aparelho alinhado ao joelho; a dobra do joelho na borda do assento.",
     "Segure as alças laterais e mantenha o quadril firme no banco.",
     "Suba sem impulso, pausa de 1 s em cima, desça controlando."
    ],
    "evite": [
     "“Chutar” o peso com embalo.",
     "Tirar o quadril do assento nas últimas repetições."
    ],
    "alt": "Leg press unilateral com carga leve.",
    "q": "cadeira extensora execução correta",
    "restSec": 90,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "4",
    "id": "ia4",
    "name": "Cadeira adutora",
    "img": "Thigh_Adductor",
    "sets": [
     2,
     2
    ],
    "reps": "12–15",
    "rir": "1–2",
    "rest": "60–90 s",
    "prim": [
     "adductors"
    ],
    "sec": [],
    "foco": "Parte interna da coxa. Feche apertando e volte devagar.",
    "tips": [
     "Comece com uma abertura confortável e aumente aos poucos ao longo das semanas.",
     "Costas apoiadas no encosto durante toda a série.",
     "Feche até as almofadas quase se encontrarem; pausa curta.",
     "Volte em 2 segundos, sem deixar as placas baterem."
    ],
    "postura": "Fortalecer adutores ajuda a estabilidade do quadril e do joelho.",
    "evite": [
     "Abrir demais logo na primeira semana: é o que mais causa dor na virilha."
    ],
    "alt": "Adução na polia com tornozeleira.",
    "q": "cadeira adutora execução",
    "restSec": 75,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "5a",
    "group": "5",
    "id": "ia5",
    "name": "Panturrilha em pé na máquina",
    "img": "Standing_Calf_Raises",
    "sets": [
     2,
     3
    ],
    "reps": "10–15",
    "rir": "1–2",
    "rest": "Sem descanso: vá para o 5b",
    "prim": [
     "calves"
    ],
    "sec": [],
    "foco": "Panturrilha. O estímulo maior está na pausa embaixo, com o músculo alongado.",
    "tips": [
     "Ponta dos pés na borda da plataforma.",
     "Desça o calcanhar abaixo da plataforma e pare 1–2 s embaixo.",
     "Suba o máximo que conseguir, como se fosse ficar na ponta dos pés.",
     "Joelhos estendidos, mas não travados."
    ],
    "evite": [
     "Quicar no fundo para ganhar impulso.",
     "Encurtar a amplitude para colocar mais peso."
    ],
    "alt": "Panturrilha no leg press ou no Smith.",
    "q": "panturrilha em pé máquina execução",
    "restSec": 0,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "5b",
    "group": "5",
    "id": "ia6",
    "name": "Abdominal na máquina",
    "img": "Ab_Crunch_Machine",
    "sets": [
     2,
     2
    ],
    "reps": "10–15",
    "rir": "1–2",
    "rest": "60–90 s depois do par",
    "prim": [
     "abs"
    ],
    "sec": [
     "obliques"
    ],
    "foco": "Abdômen. Pense em aproximar as costelas do quadril, enrolando a coluna.",
    "tips": [
     "Ajuste o banco para que o apoio fique na altura do peito.",
     "Solte o ar enquanto fecha o tronco.",
     "Volte até o abdômen alongar, sem deixar a carga encostar."
    ],
    "evite": [
     "Puxar com os braços.",
     "Carga tão alta que o movimento vira dobra de quadril em vez de enrolar a coluna."
    ],
    "alt": "Abdominal na polia alta, ajoelhada, com corda.",
    "q": "abdominal máquina execução",
    "restSec": 75,
    "frames": [
     0,
     1
    ]
   }
  ]
 },
 {
  "id": "superior-a",
  "name": "Superior A",
  "short": "Sup. A",
  "day": "Terça",
  "dow": 2,
  "kind": "upper",
  "focus": "Empurrar e puxar na horizontal",
  "sets": [
   "14",
   "17"
  ],
  "time": [
   "~42 min",
   "52–57 min"
  ],
  "cardio": "Manhã: caminhada leve",
  "items": [
   {
    "n": "1",
    "id": "sa1",
    "name": "Supino máquina (sentado)",
    "img": "Machine_Bench_Press",
    "sets": [
     2,
     3
    ],
    "reps": "8–12",
    "rir": "2–3",
    "rest": "2 min",
    "prim": [
     "chest"
    ],
    "sec": [
     "front_delt",
     "triceps"
    ],
    "foco": "Peitoral. Empurre pensando em aproximar os braços um do outro, não só em esticar o cotovelo.",
    "tips": [
     "Ajuste o banco para que os pegadores fiquem na altura do meio do peito.",
     "Costas e escápulas apoiadas no encosto; ombros longe das orelhas.",
     "Cotovelos a cerca de 45–60° do tronco, não totalmente abertos.",
     "Volte até sentir o peito alongar, sem perder o apoio das escápulas."
    ],
    "postura": "Com ombros protrusos, a tendência é o ombro “ir junto” no fim do empurrão. Mantenha o peito aberto e as escápulas encostadas no banco do início ao fim.",
    "evite": [
     "Ombros subindo em direção às orelhas.",
     "Arquear muito a lombar para empurrar mais peso."
    ],
    "alt": "Supino no Smith ou com halteres.",
    "q": "supino máquina sentado execução",
    "restSec": 120,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "2",
    "id": "sa2",
    "name": "Remada máquina com apoio no peito",
    "img": "Leverage_Iso_Row",
    "sets": [
     2,
     3
    ],
    "reps": "8–12",
    "rir": "2–3",
    "rest": "2 min",
    "prim": [
     "lats",
     "midback"
    ],
    "sec": [
     "rear_delt",
     "biceps"
    ],
    "foco": "Meio das costas, entre as escápulas. Termine cada repetição “apertando” as escápulas uma contra a outra.",
    "tips": [
     "Ajuste o banco para os pegadores ficarem na linha do peito.",
     "Peito colado no apoio do início ao fim.",
     "Comece levando os ombros para trás; depois puxe os cotovelos para trás.",
     "Pausa de 1 s na contração; volte deixando as escápulas se afastarem."
    ],
    "postura": "Exercício-chave para ombros protrusos e escápula alada: fortalece a musculatura que leva os ombros para trás.",
    "evite": [
     "Tirar o peito do apoio para roubar repetições.",
     "Encolher os ombros durante a puxada."
    ],
    "alt": "Remada baixa na polia com triângulo.",
    "q": "remada máquina apoio peito execução",
    "restSec": 120,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "3",
    "id": "sa3",
    "name": "Puxada alta, pegada neutra",
    "img": "Close-Grip_Front_Lat_Pulldown",
    "sets": [
     2,
     3
    ],
    "reps": "8–12",
    "rir": "2–3",
    "rest": "2 min",
    "prim": [
     "lats"
    ],
    "sec": [
     "biceps",
     "midback"
    ],
    "foco": "Lateral das costas, logo abaixo das axilas. Pense em puxar com os cotovelos, não com as mãos.",
    "tips": [
     "Coxas presas sob o rolo.",
     "Tronco quase vertical, com leve inclinação para trás.",
     "Desça os ombros primeiro e depois puxe os cotovelos para baixo, junto ao corpo.",
     "Puxe até a altura do queixo ou peito alto; suba controlando até os braços quase estenderem."
    ],
    "evite": [
     "Jogar o tronco para trás para mover a carga.",
     "Puxar só com os braços, com os ombros encolhidos."
    ],
    "alt": "Puxada unilateral na polia ou graviton.",
    "q": "puxada alta pegada neutra triângulo execução",
    "restSec": 120,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "4",
    "id": "sa4",
    "name": "Desenvolvimento máquina",
    "img": "Leverage_Shoulder_Press",
    "sets": [
     2,
     2
    ],
    "reps": "8–12",
    "rir": "2",
    "rest": "90 s",
    "prim": [
     "front_delt",
     "side_delt"
    ],
    "sec": [
     "triceps",
     "traps"
    ],
    "foco": "Ombros. Empurre para cima mantendo o pescoço longo.",
    "tips": [
     "Ajuste o banco para que os pegadores fiquem na altura dos ombros.",
     "Costas inteiras apoiadas no encosto.",
     "Use a pegada neutra (palmas uma de frente para a outra), se o aparelho tiver.",
     "Desça até as mãos ficarem perto da altura do queixo."
    ],
    "evite": [
     "Arquear a lombar para terminar a repetição.",
     "Encolher o pescoço."
    ],
    "alt": "Desenvolvimento com halteres, sentada com encosto.",
    "q": "desenvolvimento máquina ombro execução",
    "restSec": 90,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "5",
    "id": "sa5",
    "name": "Crucifixo inverso no peck deck",
    "img": "Reverse_Machine_Flyes",
    "sets": [
     2,
     2
    ],
    "reps": "12–15",
    "rir": "1–2",
    "rest": "60–90 s",
    "prim": [
     "rear_delt",
     "midback"
    ],
    "sec": [
     "traps"
    ],
    "foco": "Parte de trás do ombro e região entre as escápulas.",
    "tips": [
     "Sente de frente para o aparelho, peito apoiado no encosto.",
     "Pegadores na altura dos ombros; braços quase estendidos, cotovelos levemente dobrados.",
     "Abra até os braços ficarem na linha do corpo.",
     "Carga leve: o controle importa mais que o peso."
    ],
    "postura": "Junto com a remada, trabalha a musculatura entre as escápulas, importante para a postura dos ombros.",
    "evite": [
     "Balançar o tronco para abrir os braços.",
     "Encolher os ombros."
    ],
    "alt": "Crucifixo inverso na polia.",
    "q": "crucifixo inverso peck deck execução",
    "restSec": 75,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "6a",
    "group": "6",
    "id": "sa6",
    "name": "Rosca na polia baixa (barra)",
    "img": "Standing_Biceps_Cable_Curl",
    "sets": [
     2,
     2
    ],
    "reps": "10–15",
    "rir": "1–2",
    "rest": "Sem descanso: vá para o 6b",
    "prim": [
     "biceps"
    ],
    "sec": [
     "forearms"
    ],
    "foco": "Bíceps. Cotovelo parado, só o antebraço se move.",
    "tips": [
     "Fique perto da polia, cotovelos ao lado do corpo.",
     "Suba sem balançar o tronco.",
     "Desça até o braço quase estender."
    ],
    "evite": [
     "Levar os cotovelos para frente no fim da subida.",
     "Jogar o quadril para ajudar."
    ],
    "alt": "Rosca com halteres.",
    "q": "rosca bíceps polia baixa barra execução",
    "restSec": 0,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "6b",
    "group": "6",
    "id": "sa7",
    "name": "Tríceps na polia alta (corda)",
    "img": "Triceps_Pushdown_-_Rope_Attachment",
    "sets": [
     2,
     2
    ],
    "reps": "10–15",
    "rir": "1–2",
    "rest": "60–90 s depois do par",
    "prim": [
     "triceps"
    ],
    "sec": [],
    "foco": "Parte de trás do braço. Abra a corda no final da extensão.",
    "tips": [
     "Cotovelos colados ao lado do corpo.",
     "Estenda o braço por completo e separe as pontas da corda.",
     "Volte até o antebraço ficar um pouco acima da linha paralela ao chão."
    ],
    "evite": [
     "Cotovelos abrindo ou indo para frente.",
     "Inclinar o tronco sobre a corda para usar o peso do corpo."
    ],
    "alt": "Tríceps na barra reta.",
    "q": "tríceps corda polia execução",
    "restSec": 75,
    "frames": [
     0,
     1
    ]
   }
  ]
 },
 {
  "id": "inferior-b",
  "name": "Inferior B",
  "short": "Inf. B",
  "day": "Quinta",
  "dow": 4,
  "kind": "lower",
  "focus": "Foco em glúteos e posteriores",
  "sets": [
   "12",
   "17"
  ],
  "time": [
   "~40 min",
   "50–55 min"
  ],
  "cardio": "Manhã: caminhada moderada",
  "items": [
   {
    "n": "1",
    "id": "ib1",
    "name": "Elevação pélvica na máquina",
    "img": "Barbell_Hip_Thrust",
    "imgNote": "A foto mostra a versão com barra. Na máquina, o movimento é o mesmo; só a carga vem do aparelho.",
    "sets": [
     2,
     3
    ],
    "reps": "8–12",
    "rir": "2–3",
    "rest": "2 min",
    "prim": [
     "glutes"
    ],
    "sec": [
     "hamstrings",
     "glute_med"
    ],
    "foco": "Glúteo. Aperte forte no topo; quem termina o movimento é o glúteo, não a lombar.",
    "tips": [
     "Encosto na parte de baixo das escápulas.",
     "Pés na largura do quadril; no topo, a canela deve ficar perto da vertical.",
     "Queixo levemente recolhido, olhando para frente, não para o teto.",
     "Suba até alinhar quadril e tronco e segure 1 segundo."
    ],
    "evite": [
     "Arquear a lombar no topo para subir mais.",
     "Pés muito longe do corpo: o exercício passa a puxar mais o posterior."
    ],
    "alt": "Elevação pélvica no Smith com banco, ou glúteo na máquina (coice).",
    "q": "elevação pélvica máquina execução",
    "restSec": 120,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "2",
    "id": "ib2",
    "name": "Leg press com pés altos",
    "img": "Leg_Press",
    "imgNote": "Mesmo aparelho do Inferior A, com os pés na parte alta da plataforma.",
    "sets": [
     2,
     3
    ],
    "reps": "10–12",
    "rir": "2–3",
    "rest": "2 min",
    "prim": [
     "glutes",
     "quads"
    ],
    "sec": [
     "hamstrings",
     "adductors"
    ],
    "foco": "Glúteo e posterior. Empurre a plataforma pelo calcanhar.",
    "tips": [
     "Pés na parte alta da plataforma, um pouco mais afastados que no Inferior A.",
     "Desça até onde a lombar continua apoiada.",
     "Joelhos acompanham a direção dos pés."
    ],
    "evite": [
     "Calcanhar descolando da plataforma.",
     "Lombar saindo do encosto no fundo."
    ],
    "alt": "Hack machine ou leg press horizontal.",
    "q": "leg press pés altos glúteo",
    "restSec": 120,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "3",
    "id": "ib3",
    "name": "Mesa flexora (deitada)",
    "img": "Lying_Leg_Curls",
    "sets": [
     2,
     3
    ],
    "reps": "10–15",
    "rir": "1–2",
    "rest": "90 s",
    "prim": [
     "hamstrings"
    ],
    "sec": [
     "calves"
    ],
    "foco": "Parte de trás da coxa. Quadril colado no banco do início ao fim.",
    "tips": [
     "Joelho logo depois da borda do banco; rolo acima do tornozelo.",
     "Segure nos pegadores e pressione o quadril contra o banco.",
     "Desça em 2–3 segundos."
    ],
    "evite": [
     "Empinar o quadril para subir o peso.",
     "Deixar a carga cair na volta."
    ],
    "alt": "Cadeira flexora (sentada).",
    "q": "mesa flexora execução correta",
    "restSec": 90,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "4",
    "id": "ib4",
    "name": "Cadeira abdutora",
    "img": "Thigh_Abductor",
    "sets": [
     2,
     3
    ],
    "reps": "12–20",
    "rir": "1–2",
    "rest": "60–90 s",
    "prim": [
     "glute_med"
    ],
    "sec": [
     "glutes"
    ],
    "foco": "Lateral do quadril, na parte de cima do glúteo.",
    "tips": [
     "Incline o tronco levemente à frente: aumenta o trabalho do glúteo.",
     "Abra controlando e segure 1 s aberta.",
     "Volte devagar, sem deixar as placas baterem."
    ],
    "evite": [
     "Abrir com tranco.",
     "Carga tão alta que você só consegue meia amplitude."
    ],
    "alt": "Abdução na polia com tornozeleira.",
    "q": "cadeira abdutora execução glúteo",
    "restSec": 75,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "5a",
    "group": "5",
    "id": "ib5",
    "name": "Panturrilha sentada (máquina)",
    "img": "Seated_Calf_Raise",
    "sets": [
     2,
     3
    ],
    "reps": "12–15",
    "rir": "1–2",
    "rest": "Sem descanso: vá para o 5b",
    "prim": [
     "calves"
    ],
    "sec": [],
    "foco": "Panturrilha (sóleo, a parte mais profunda). Pausa embaixo.",
    "tips": [
     "Apoio sobre a coxa, logo acima do joelho.",
     "Ponta dos pés na plataforma; desça o calcanhar o máximo possível.",
     "Pausa de 1–2 s embaixo, suba até o topo."
    ],
    "evite": [
     "Quicar no fundo."
    ],
    "alt": "Panturrilha no leg press.",
    "q": "panturrilha sentada máquina execução",
    "restSec": 0,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "5b",
    "group": "5",
    "id": "ib6",
    "name": "Prancha frontal",
    "img": "Plank",
    "frames": [
     1,
     1
    ],
    "sets": [
     2,
     2
    ],
    "reps": "20–40 s",
    "rir": "Pare ao perder o alinhamento",
    "rest": "60 s depois do par",
    "prim": [
     "abs"
    ],
    "sec": [
     "obliques",
     "glutes"
    ],
    "foco": "Abdômen inteiro. Corpo em linha reta da cabeça ao calcanhar.",
    "tips": [
     "Cotovelos logo abaixo dos ombros.",
     "Contraia glúteos e abdômen; respire normalmente.",
     "Aumente cerca de 5 s por semana."
    ],
    "postura": "Empurre o chão com os antebraços, sem deixar as escápulas “afundarem” entre os ombros. É um bom treino de estabilidade para a escápula alada.",
    "evite": [
     "Quadril caindo (lombar afundando) ou quadril alto demais.",
     "Prender a respiração."
    ],
    "alt": "Pallof press na polia.",
    "q": "prancha abdominal execução correta",
    "restSec": 60
   }
  ]
 },
 {
  "id": "superior-b",
  "name": "Superior B",
  "short": "Sup. B",
  "day": "Sexta",
  "dow": 5,
  "kind": "upper",
  "focus": "Puxar na vertical e ombros",
  "sets": [
   "14",
   "18"
  ],
  "time": [
   "~42 min",
   "53–58 min"
  ],
  "cardio": "Manhã: caminhada leve",
  "items": [
   {
    "n": "1",
    "id": "sb1",
    "name": "Puxada alta, pegada aberta",
    "img": "Wide-Grip_Lat_Pulldown",
    "sets": [
     2,
     3
    ],
    "reps": "8–12",
    "rir": "2–3",
    "rest": "2 min",
    "prim": [
     "lats"
    ],
    "sec": [
     "biceps",
     "midback",
     "rear_delt"
    ],
    "foco": "Lateral das costas. Cotovelos descem em direção aos bolsos.",
    "tips": [
     "Pegada um pouco mais larga que os ombros.",
     "Coxas presas no rolo, tronco quase vertical.",
     "Puxe à frente do rosto até o peito alto.",
     "Suba controlando até os braços quase estenderem."
    ],
    "evite": [
     "Puxar atrás da nuca.",
     "Jogar o tronco para trás."
    ],
    "alt": "Puxada com pegada supinada (palmas para você).",
    "q": "puxada alta pegada aberta execução",
    "restSec": 120,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "2",
    "id": "sb2",
    "name": "Supino inclinado máquina",
    "img": "Leverage_Incline_Chest_Press",
    "sets": [
     2,
     3
    ],
    "reps": "8–12",
    "rir": "2–3",
    "rest": "2 min",
    "prim": [
     "chest",
     "front_delt"
    ],
    "sec": [
     "triceps"
    ],
    "foco": "Parte de cima do peitoral.",
    "tips": [
     "Pegadores na altura da parte alta do peito.",
     "Escápulas apoiadas, ombros baixos.",
     "Empurre sem travar os cotovelos; volte até sentir o peito alongar."
    ],
    "postura": "A mesma regra do supino do Superior A: escápulas encostadas o tempo todo, para o ombro não ir à frente.",
    "evite": [
     "Ombros subindo.",
     "Lombar descolando do banco."
    ],
    "alt": "Supino inclinado no Smith.",
    "q": "supino inclinado máquina execução",
    "restSec": 120,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "3",
    "id": "sb3",
    "name": "Remada baixa na polia (triângulo)",
    "img": "Seated_Cable_Rows",
    "sets": [
     2,
     3
    ],
    "reps": "10–12",
    "rir": "2",
    "rest": "90 s–2 min",
    "prim": [
     "lats",
     "midback"
    ],
    "sec": [
     "biceps",
     "rear_delt"
    ],
    "foco": "Meio das costas. Puxe o triângulo até o umbigo e aproxime as escápulas.",
    "tips": [
     "Joelhos levemente dobrados, pés firmes.",
     "Tronco fixo e quase vertical durante a série.",
     "Pausa de 1 s com as escápulas juntas; volte deixando os braços estenderem."
    ],
    "evite": [
     "Balançar o tronco para frente e para trás.",
     "Arredondar a coluna na volta."
    ],
    "alt": "Remada máquina com apoio no peito.",
    "q": "remada baixa triângulo execução",
    "restSec": 105,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "4",
    "id": "sb4",
    "name": "Elevação lateral na máquina",
    "img": "Side_Lateral_Raise",
    "imgNote": "A foto mostra a versão com halteres. Na máquina, o movimento é o mesmo.",
    "sets": [
     2,
     3
    ],
    "reps": "12–15",
    "rir": "1–2",
    "rest": "60–90 s",
    "prim": [
     "side_delt"
    ],
    "sec": [
     "traps"
    ],
    "foco": "Lateral do ombro. Conduza o movimento com os cotovelos.",
    "tips": [
     "Ajuste o banco para o eixo do aparelho ficar na linha do ombro.",
     "Suba até os braços ficarem na altura dos ombros.",
     "Desça em 2 segundos."
    ],
    "evite": [
     "Encolher o pescoço: o trapézio “rouba” o exercício.",
     "Subir acima da linha dos ombros com balanço."
    ],
    "alt": "Elevação lateral na polia ou com halteres.",
    "q": "elevação lateral máquina execução",
    "restSec": 75,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "5",
    "id": "sb5",
    "name": "Face pull na polia (corda)",
    "img": "Face_Pull",
    "sets": [
     2,
     2
    ],
    "reps": "12–15",
    "rir": "2",
    "rest": "60 s",
    "prim": [
     "rear_delt",
     "midback"
    ],
    "sec": [
     "traps"
    ],
    "foco": "Parte de trás do ombro e entre as escápulas. Termine com as mãos ao lado das orelhas.",
    "tips": [
     "Polia na altura do rosto.",
     "Puxe a corda em direção à testa, separando as mãos.",
     "Cotovelos altos, na linha dos ombros.",
     "Carga leve; controle a volta."
    ],
    "postura": "Fortalece os rotadores externos e a musculatura que leva os ombros para trás, útil para ombros protrusos.",
    "evite": [
     "Jogar o tronco para trás.",
     "Cotovelos caindo abaixo da linha dos ombros."
    ],
    "alt": "Crucifixo inverso no peck deck.",
    "q": "face pull corda execução",
    "restSec": 60,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "6a",
    "group": "6",
    "id": "sb6",
    "name": "Tríceps na polia alta (barra V)",
    "img": "Triceps_Pushdown_-_V-Bar_Attachment",
    "sets": [
     2,
     2
    ],
    "reps": "10–15",
    "rir": "1–2",
    "rest": "Sem descanso: vá para o 6b",
    "prim": [
     "triceps"
    ],
    "sec": [],
    "foco": "Parte de trás do braço. Cotovelos parados.",
    "tips": [
     "Cotovelos colados ao corpo.",
     "Estenda o braço por completo.",
     "Volte até o antebraço passar um pouco da linha paralela ao chão."
    ],
    "evite": [
     "Cotovelos abrindo.",
     "Usar o peso do corpo."
    ],
    "alt": "Tríceps na máquina.",
    "q": "tríceps polia barra v execução",
    "restSec": 0,
    "frames": [
     0,
     1
    ]
   },
   {
    "n": "6b",
    "group": "6",
    "id": "sb7",
    "name": "Rosca martelo na polia (corda)",
    "img": "Cable_Hammer_Curls_-_Rope_Attachment",
    "sets": [
     2,
     2
    ],
    "reps": "10–15",
    "rir": "1–2",
    "rest": "60–90 s depois do par",
    "prim": [
     "biceps",
     "forearms"
    ],
    "sec": [],
    "foco": "Bíceps e antebraço. Punhos neutros, como se segurasse dois martelos.",
    "tips": [
     "Cotovelos fixos ao lado do corpo.",
     "Suba até perto dos ombros sem balançar.",
     "Desça controlando."
    ],
    "evite": [
     "Levar os cotovelos para frente.",
     "Balançar o tronco."
    ],
    "alt": "Rosca martelo com halteres.",
    "q": "rosca martelo corda polia execução",
    "restSec": 75,
    "frames": [
     0,
     1
    ]
   }
  ]
 }
];

export const WEEK = [
 {
  "d": "Seg",
  "dow": 1,
  "plan": "inferior-a",
  "cardio": "Caminhada moderada"
 },
 {
  "d": "Ter",
  "dow": 2,
  "plan": "superior-a",
  "cardio": "Caminhada leve"
 },
 {
  "d": "Qua",
  "dow": 3,
  "plan": null,
  "cardio": "Corrida e caminhada intercaladas"
 },
 {
  "d": "Qui",
  "dow": 4,
  "plan": "inferior-b",
  "cardio": "Caminhada moderada"
 },
 {
  "d": "Sex",
  "dow": 5,
  "plan": "superior-b",
  "cardio": "Caminhada leve"
 },
 {
  "d": "Sáb",
  "dow": 6,
  "plan": null,
  "cardio": "Corrida leve e confortável"
 },
 {
  "d": "Dom",
  "dow": 0,
  "plan": null,
  "cardio": "Descanso completo"
 }
];
