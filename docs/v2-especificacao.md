# v2: app de bem-estar completo

A v2 junta o app de treino que já está publicado com o plano alimentar interativo, que está em `privado/Plano_da_Vic.html` e documentado em `privado/contexto-alimentacao.md`. O resultado é um app único para o dia a dia, com:

- treino de musculação e cardio;
- refeições, água, peso e composição corporal;
- gráficos de progresso;
- uma gamificação leve;
- um fechamento semanal que leva os dados do celular para o computador.

Regras permanentes: `CLAUDE.md`. Contexto pessoal: `CLAUDE.local.md`.

---

## 0. Antes de escrever código

1. Leia `CLAUDE.md`, `CLAUDE.local.md`, `privado/contexto-alimentacao.md`, todo o código atual (`index.html`, `js/`, `css/`, `sw.js`) e o `privado/Plano_da_Vic.html` inteiro.
2. Crie a branch `v2-bem-estar` a partir da `main`.
3. Entregue um **plano** antes de implementar, com:
   - arquitetura de arquivos;
   - esquema do IndexedDB v2 e a migração;
   - mapa de telas;
   - ordem das fases;
   - riscos;
   - **no máximo 5 perguntas** sobre o que for realmente ambíguo.

   Para o resto, faça a suposição mais razoável e deixe-a explícita.
4. Espere a aprovação do plano.

## 1. Correções e limpeza do que já existe

### 1.1 Layout no iPhone 17

Hoje algumas caixas saem da margem do bloco em que estão. Faça uma auditoria de todas as telas nas larguras 375, 402 e 440, em claro e escuro, e corrija na origem (ver "Layout no celular" no `CLAUDE.md`). Pontos suspeitos:

- `.ex-meta` com 4 colunas;
- `.set-in` e `.effort`;
- `.kpis`;
- `.bar` com coluna fixa de 128 px;
- tabelas em `.tbl` com `min-width`;
- `grid2`/`grid3` com inputs;
- o cronômetro fixo e o toast sobre o conteúdo.

Inclua um teste automático que falhe se algum elemento visível ultrapassar a borda do seu contêiner ou se a página rolar na horizontal.

### 1.2 Remover supersets

Remova o campo `group` e a lógica de superset (`ss-label`, "vá ao par", troca automática para o parceiro). Os exercícios continuam na mesma ordem, renumerados (5a/5b → 5 e 6; 6a/6b → 6 e 7). **Os `id` não mudam**, porque o histórico depende deles. Descanso dos que eram superset:

| Exercício | Descanso |
| --- | --- |
| Panturrilhas | 60 s |
| Abdominal na máquina | 60 s |
| Prancha | 60 s |
| Roscas | 60 s |
| Tríceps | 60 s |

Recalcule a duração estimada de cada treino e mostre os novos valores. Se algum passar de 60 min na fase completa, me avise antes de mudar qualquer outra coisa.

## 2. Dados (IndexedDB v2)

- Migração aditiva de `treino-app` v1 para v2. Novos stores, por exemplo:
  - `meals`: escolhas e "feito" por data e refeição;
  - `water`: por data;
  - `daytypes`: tipo previsto e override manual por data;
  - `profile`: perfil de saúde importado;
  - `achievements`;
  - `weekly`: fechamentos semanais.
- Adicione `uid` e `updatedAt` a todos os registros, novos e antigos (a migração preenche os antigos).
- Registros apagados viram tombstone (`deleted: true`), para a consolidação no PC saber que sumiram.
- Exportar e importar continuam compatíveis com backups v1.
- Teste obrigatório: crie um banco v1 com dados de exemplo, rode o código v2 e confirme que tudo continua lá.

## 3. Alimentação (porte do Plano da Vic)

**Preserve a lógica, os números e os textos de orientação.** O visual se adapta ao design system do app, seguindo os princípios de interface do contexto alimentar (seção 7 de `privado/contexto-alimentacao.md`). Não altere metas, porções nem regras clínicas sem perguntar. A versão agressiva das metas não deve ser implementada.

- Separe os dados (`DAYS`, `SLOTS`, `OPTS`, `PROT`, `CARB`, `MOLHO`, listas de trocas) em `js/data/nutricao.js`. A interface fica em módulos próprios.
- Histórico por data: hoje o `done` guarda só o dia atual. Na v2, cada data guarda as escolhas, as refeições feitas, o psyllium e a água. Assim é possível calcular kcal e proteína consumidas em qualquer dia passado.
- Textos que citam exames da usuária (por exemplo, em "pontos para levar ao médico") passam a ler do store `profile`. Sem perfil importado, aparece uma versão genérica.
- Gere `privado/perfil-saude.json` a partir dos arquivos privados e crie em Mais a opção "Importar perfil de saúde".
- Fontes: use a Archivo, que já está local. Tire as Google Fonts da página original.

### 3.1 Tipo de dia (fonte única de verdade)

| Atividades do dia | Tipo |
| --- | --- |
| Musculação + cardio | A |
| Só cardio | B |
| Só musculação | C |
| Nenhuma | D |

- O **modelo semanal previsto** vem da ficha de treino: musculação seg/ter/qui/sex e cardio de segunda a sábado. Fica Seg A, Ter A, Qua B, Qui A, Sex A, Sáb B, Dom D. Esse modelo é editável em Mais.
- **Registrar** uma atividade não prevista eleva o tipo do dia (por exemplo, D → B ao registrar cardio).
- **Não registrar não rebaixa o tipo sozinho**, porque a musculação é só às 19h. Para rebaixar, há uma ação explícita: "Hoje não vou treinar" ou "Pular cardio de hoje".
- O override manual por data continua possível e sempre vence.
- A tela mostra de onde veio o tipo: "previsto pela ficha", "ajustado pelo registro" ou "escolhido por você".
- Os dados antigos do `plano-vic-v1` (`weights`, `week`, `sel`, `build`, `opt`, `psy`) podem ser importados. Em Mais, um campo de texto aceita o JSON colado. Adicione também um botão "Exportar dados" à cópia em `privado/Plano_da_Vic.html`, para a usuária extrair os dados de onde usava a página. Pesos vão para o store `body`.

## 4. Tela Hoje (centro do app)

Uma linha do tempo única do dia, juntando remédio, cardio, refeições, musculação e sono. O prato-relógio em SVG do Plano da Vic é o destaque visual.

- **Card "agora"**: o próximo item da linha do tempo, com a ação principal (escolher o café, começar o treino, registrar o cardio, marcar a refeição como feita).
- **Resumo do dia**: kcal consumidas vs. meta, proteína, água e status (±60 kcal conta como "dentro da meta").
- **Hábitos do dia**: checklist com contagem, por exemplo "4 de 6 hábitos". Num dia de descanso previsto, descansar conta como hábito cumprido.
- Atalhos para registrar peso e água.
- No desktop (≥ 900 px): 2 colunas, conforme o contexto alimentar.

## 5. Treino

### 5.1 Musculação (já existe; melhorias)

- Mantenha o registro por série (carga, repetições, Fácil/Médio/Difícil), o cronômetro e as sugestões de progressão.
- **Tendência por exercício**, com pelo menos 3 sessões. Esforço por sessão: fácil = 1, médio = 2, difícil = 3.

  | Tendência | Critério |
  | --- | --- |
  | Ficando mais fácil | Carga igual ou maior, e esforço médio caiu ≥ 0,5 ou o total de repetições subiu ≥ 2 |
  | Ficando mais difícil | Carga igual ou menor, e esforço subiu ≥ 0,5 ou as repetições caíram |
  | Estável | Nenhum dos dois |

  Mostre a tendência com texto e seta no card do exercício e no Progresso. Se 3 ou mais exercícios ficarem mais difíceis na mesma semana, mostre uma nota sobre recuperação (sono, alimentação, estresse), sem alarme.

### 5.2 Cardio e corrida (novo fluxo)

- A sessão de cardio do dia mostra a prescrição da semana (`cardioPlan`) com um **timer de intervalos**:
  - segmentos de trote e caminhada;
  - aviso sonoro e visual a cada troca;
  - tela ligada com a Screen Wake Lock API, quando disponível.
- **Registro**:
  - tipo e duração;
  - etapa concluída (sim, parcial ou não);
  - velocidades e inclinação (opcional);
  - distância (opcional);
  - esforço (leve, moderado ou forte);
  - observação.
- **Checagem no dia seguinte**: na primeira abertura do app após uma corrida, perguntar "Alguma dor da corrida de ontem?" com as opções nenhuma, canela, joelho, tendão de Aquiles ou outra.
- **Progressão**: a próxima etapa só é sugerida depois de 2 sessões da etapa atual concluídas sem dor no dia seguinte. Com dor, sugerir repetir ou voltar uma etapa.
- O gasto do cardio no modelo alimentar continua fixo, pelo tipo de dia. Não usar distância nem duração para aumentar a meta de comida.

## 6. Corpo

- Peso (com média de 7 dias), cintura e avaliações de composição separadas por método: dobras cutâneas, bioimpedância ou outro.
- Na bioimpedância, campos opcionais: massa muscular, gordura visceral, água corporal e taxa metabólica do aparelho.
- O gráfico compara cada método só com ele mesmo.
- Importar `privado/dados-iniciais-PRIVADO.json` continua funcionando.

## 7. Progresso e gráficos

Gráficos com Chart.js, com rótulos em pt-BR e datas com ano quando o período passa de 6 meses:

- treinos por semana vs. meta;
- séries por músculo na semana vs. meta;
- carga máxima e força estimada por exercício, com a tendência da seção 5.1;
- peso diário com média de 7 dias, em eixo de tempo real;
- % de gordura e massa livre de gordura por método;
- kcal consumidas vs. meta por dia, nos últimos 14 dias;
- proteína por dia vs. 130 g;
- água por dia vs. meta do tipo de dia;
- minutos de cardio por semana e etapa da corrida ao longo do tempo;
- estimativa de déficit semanal, sempre marcada como estimativa.

## 8. Gamificação (leve e sem culpa)

- **Hábitos do dia**, definidos pelo tipo de dia: treino previsto feito, cardio previsto feito, proteína ≥ 120 g, água na meta, refeições marcadas ≥ 80% e pesagem. Dia de descanso previsto não cobra treino.
- **Semana consistente**: ≥ 80% dos hábitos previstos. A sequência é contada em **semanas consistentes**, não em dias, para um dia ruim não zerar nada.
- **Conquistas**:
  - primeira semana completa;
  - 10, 25 e 50 treinos;
  - novo recorde de força estimada num exercício;
  - cada etapa da corrida concluída;
  - 4 semanas consistentes;
  - 4 fechamentos semanais seguidos com backup.
- **Nenhuma conquista ligada a peso ou % de gordura.** Nada de X vermelho em dia perdido.
- Visual com barras e números, sem imitar os anéis do Activity. Uma pequena celebração ao desbloquear uma conquista, respeitando `prefers-reduced-motion`.

## 9. Fechamento semanal e transferência para o PC

Uma "pull" automática do PC exigiria um servidor. Por isso, o fluxo é: o celular exporta, a usuária guarda o arquivo numa pasta sincronizada e o PC consolida.

- **No app**, no domingo ou na primeira abertura da semana seguinte, aparece o card "Fechar a semana" com:
  - resumo: treinos, cardio, média de kcal e de proteína, água, média de peso vs. semana anterior, cargas que subiram, exercícios mais fáceis e mais difíceis, conquistas;
  - um campo "Como foi a semana?" para energia, sono e dores;
  - o botão "Exportar semana".
- **Exportar semana**:
  - gera o backup completo em JSON com o nome `bem-estar-AAAA-Sww.json` (semana ISO);
  - abre a folha de compartilhamento do iOS (`navigator.share` com arquivo), para salvar no iCloud Drive ou no Google Drive, ou mandar por AirDrop;
  - registra a data do backup.
- **No PC**: crie `tools/consolidar.py`, em Python 3 só com a biblioteca padrão. Ele:
  - recebe uma pasta de backups (por exemplo, a pasta do iCloud Drive ou do Google Drive no computador);
  - deduplica por `uid` (vence o `updatedAt` mais recente) e respeita os tombstones;
  - gera `historico.json` e CSVs (`series.csv`, `treinos.csv`, `cardio.csv`, `refeicoes.csv`, `agua.csv`, `peso.csv`, `composicao.csv`), que abrem no Excel;
  - gera um `relatorio-semanal.md` com os números da última semana.

  A saída padrão é `privado/historico/`, que está no `.gitignore`.
- **Documente no README** como levar o arquivo do iPhone para Windows e para Mac.

## 10. Design

- Um único design system. Base: Archivo local, tokens claro e escuro do app atual.
- O tipo de dia define a cor de destaque da página via `data-day` no `<html>`, com as cores do contexto alimentar. As cores dos macros são fixas.
- **Navegação**: barra inferior com 5 abas: Hoje, Treino, Comida, Progresso e Mais.
  - Comida tem sub-abas em segmented control: Semana, Trocas, Refeição livre e Dicas.
  - Corpo fica dentro de Progresso.
  - Desktop ≥ 900 px: abas no topo.
- Revise a diagramação de todas as telas com screenshots no iPhone 17 (402×874) antes de considerar uma fase pronta.

## 11. Fases e critérios de aceite

Cada fase termina com commit, testes do `CLAUDE.md` e screenshots revisados:

1. Correções de layout, remoção de supersets e IndexedDB v2 com migração testada. O app continua funcionando igual, só mais bem diagramado.
2. Módulo de alimentação portado, tela Hoje integrada e tipo de dia vindo da ficha.
3. Cardio com timer de intervalos, registro, checagem de dor e progressão.
4. Progresso e gráficos, tendência dos exercícios, gamificação e fechamento semanal.
5. Exportação semanal, `tools/consolidar.py`, README atualizado, `CACHE` do service worker aumentado e teste offline.

**Antes do merge na `main`:**

- a usuária exporta um backup do app v1 no celular;
- você mostra o resumo das mudanças e espera aprovação;
- depois do deploy, ela abre o app e toca em "Nova versão disponível".

Para testar no iPhone antes do merge, sirva a branch na rede local com `python3 -m http.server 8000 --bind 0.0.0.0` e informe o endereço IP. O service worker não roda fora de HTTPS, e os dados nesse endereço ficam separados dos dados do app instalado.

## Fora do escopo da v2

- Sincronização automática entre aparelhos.
- Login.
- Servidor.
- Leitura de dados do Apple Saúde. Um PWA não tem acesso a ele.
