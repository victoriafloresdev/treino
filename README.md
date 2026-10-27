# Treino e bem-estar

App web instalável (PWA) para o dia a dia: musculação, cardio, refeições, água, peso, composição corporal e progresso. Funciona offline, foi pensado para o iPhone e não precisa de servidor nem de conta: tudo fica salvo no próprio aparelho.

## O que o app faz

- **Hoje.** Resumo e acesso rápido:
  - **Tipo do dia:** A, B, C ou D, com a origem ("previsto pela ficha", "ajustado pelo registro" ou "escolhido por você").
  - **Mensagem do dia**, sobre hábito e sem culpa.
  - **Próxima refeição:** a seguinte à última marcada como feita (ou a da hora, se nada foi marcado), com "Marcar como feito".
  - **Anéis** de calorias, proteína e água. Tocar no da água soma um copo.
  - **Treinos de hoje:** musculação e cardio, com atalho para começar.
  - **Hábitos do dia** e da semana, e o peso.
- **Treino**
  - **Musculação:** seletor dos 4 treinos, que abre no do dia ou no próximo da sequência. Registro série por série (carga com ± 2,5 kg, repetições, fácil/médio/difícil), cronômetro de descanso, desenho dos músculos, sugestão de progressão e tendência de cada exercício.
  - **Cardio:** timer de intervalos com bip e tela ligada, registro, pergunta sobre dor no dia seguinte e progressão da corrida por etapas.
- **Comida**
  - **Dia:** o plano alimentar do dia. Prato-relógio, macros, água e psyllium; refeições em linhas com check de um toque e troca de opção.
  - **Semana:** tipo de cada dia e médias.
  - **Trocas:** porções equivalentes e calculadora.
  - **Refeição livre:** impacto na semana sem culpa.
  - **Dicas.**
- **Progresso**
  - **Gráficos:** treinos, séries por músculo, cargas, calorias, proteína, água, déficit estimado, peso, composição e cardio.
  - **Corpo:** peso, cintura e avaliações.
  - **Conquistas e fechamentos semanais.**
- **Mais.** Data de início, semana modelo, perfil de saúde, backup e o guia rápido.

O tipo de dia vem da ficha de treino: musculação + cardio = A, só cardio = B, só musculação = C, descanso = D. Ele define a meta de calorias, o jantar, a água e a cor do app.

Calorias e gasto são **estimativas** (cerca de ±200 kcal). A gamificação premia hábitos, nunca o peso.

---

## 1. Atualizar da versão 1 para a 2

1. **Antes de tudo, exporte um backup** no app atual: **Mais → Exportar dados** → salve em Arquivos.
2. Depois que a nova versão for publicada, abra o app pelo ícone. Vai aparecer "Nova versão disponível". Toque para atualizar.
3. Os dados antigos (treinos, séries, peso, avaliações, cardio) migram sozinhos. Nada é apagado.
4. Importe o **perfil de saúde** (próxima seção).

## 2. Perfil de saúde (só no aparelho)

O repositório é público, então textos com dados de saúde (nome do remédio, pontos dos exames, metas pessoais) **não ficam no código**. Eles ficam no arquivo `privado/perfil-saude.json`, que só existe no seu computador.

1. Mande o arquivo para o iPhone por AirDrop (ou iCloud Drive) e salve em **Arquivos**.
2. No app, toque em **Importar perfil de saúde**. O botão aparece na tela Hoje até você importar, e fica sempre em **Mais**.
3. É uma vez só. O perfil vai junto nos backups: restaurar um backup traz o perfil de volta.

Sem o perfil, o app funciona igual, com textos genéricos.

## 3. Fechamento semanal e backup

No domingo, ou na primeira abertura da semana seguinte, a tela Hoje mostra **Fechar a semana**. Ele traz o resumo (treinos, cardio, médias de kcal, proteína e água, peso médio, cargas que subiram) e o campo "Como foi a semana?".

**Fechar e exportar semana** gera o arquivo `bem-estar-AAAA-Sww.json` (ano e semana) com todos os dados e abre o compartilhar do iPhone. Escolha **Salvar em Arquivos** e uma pasta do iCloud Drive ou do Google Drive. Use sempre a mesma pasta, por exemplo `Bem-estar`.

**Mais → Exportar dados** continua gerando um backup completo a qualquer momento.

## 4. Levar os dados para o computador

Os arquivos que você salvou no iCloud Drive ou no Google Drive aparecem no computador.

**Windows**
- iCloud Drive: instale o app **iCloud para Windows** (Microsoft Store) e entre com seu Apple ID. A pasta fica em `C:\Users\<seu usuário>\iCloudDrive\Bem-estar`.
- Google Drive: instale o **Google Drive para computador**. A pasta fica em `G:\Meu Drive\Bem-estar`.
- Sem nenhum dos dois: no iPhone, abra o arquivo em Arquivos → Compartilhar → envie por e-mail para você mesma e salve numa pasta do PC.

**Mac**
- iCloud Drive: aparece no Finder, na barra lateral. O caminho é `~/Library/Mobile Documents/com~apple~CloudDocs/Bem-estar`.
- AirDrop: os arquivos vão para **Downloads**. Mova para uma pasta só deles.

**Juntar tudo em planilhas.** Precisa do Python 3. No Windows, use `python`; no Mac, `python3`.

```bash
python tools/consolidar.py "C:\Users\<seu usuário>\iCloudDrive\Bem-estar"
```

O programa lê todos os backups da pasta, deduplica (vale o registro mais recente), respeita o que foi apagado no celular e grava em `privado/historico/`:

- `historico.json`: tudo junto;
- `series.csv`, `treinos.csv`, `cardio.csv`, `refeicoes.csv`, `agua.csv`, `peso.csv`, `composicao.csv`: abrem no Excel (separador `;`, vírgula decimal);
- `relatorio-semanal.md`: os números da última semana.

A pasta `privado/` está no `.gitignore` e não vai para o GitHub.

## 5. Instalar no iPhone

Instale pelo **Safari**: abra o endereço do site → **Compartilhar** → **Adicionar à Tela de Início**. Use sempre o ícone.

- O app instalado guarda os dados separados da aba do Safari.
- **Se você apagar o ícone, o iOS apaga os dados junto.** Exporte um backup antes.
- Funciona sem internet depois de aberto uma vez.

## 6. Publicar e atualizar

O site é publicado pelo GitHub Pages a partir da branch `main` (pasta raiz). A cada mudança em arquivo do app:

1. aumente `CACHE` em `sw.js` (sem isso, o celular continua na versão antiga);
2. se criou um arquivo novo, inclua o caminho em `ASSETS` no `sw.js`;
3. faça o commit e o push. Em 1–2 minutos o Pages atualiza, e o app mostra "Nova versão disponível".

O trabalho novo é feito numa branch separada. A `main` é o que está no celular.

**Mudar a ficha:** exercícios, séries e textos ficam em `js/plan.js`. O `id` de cada exercício é a chave do histórico: exercício novo recebe id novo, e um id nunca é reaproveitado.

**Mudar o plano alimentar:** opções, porções e textos ficam em `js/data/nutricao.js`.

## 7. Testar no computador

Módulos JavaScript não funcionam abrindo o `index.html` direto do disco. Sirva a pasta:

```bash
python -m http.server 8000
```

e abra `http://localhost:8000`.

**Testes automáticos** (Node e Playwright, na pasta `tests/`; nada disso vai para o site):

```bash
cd tests
npm install
npx playwright install chromium webkit
npm test
```

- `npm run unit` roda os testes de lógica, entre eles os números do plano alimentar, o tipo de dia, o cardio, as conquistas, o `consolidar.py` e uma varredura de dados de saúde nos arquivos versionados. Essa varredura usa a lista em `privado/termos-proibidos.txt`.
- `npm run e2e` roda os testes de tela em 375, 402 e 440 px, claro e escuro, no Chromium e no WebKit (o motor do Safari). Eles cobrem layout, fluxos, migração v1 → v2 e uso offline.

**Testar no iPhone antes de publicar:** sirva na rede de casa com `python -m http.server 8000 --bind 0.0.0.0` e abra `http://<IP do computador>:8000` no Safari. Nesse endereço o service worker não roda (precisa de HTTPS), e os dados ficam separados dos do app instalado.

## Estrutura

```
index.html               casca do app, navegação, cronômetro
sw.js                    cache offline e atualização
css/tokens.css           tokens de design (OKLCH, claro/escuro, cor do tipo de dia)
css/app.css              base e componentes
css/telas.css            estilos de cada tela
docs/design.md           regras de design (tipografia, cor, forma, ícones, movimento)
icons/sprite.svg         ícones Phosphor (gerados por tools/icones.py)
js/app.js                rotas e eventos globais
js/db.js                 IndexedDB v2: migração, uid, registros apagados, exportar e importar
js/plan.js               a ficha de musculação
js/data/nutricao.js      o plano alimentar (dados e textos)
js/nutri.js              cálculos do plano alimentar
js/daytype.js            tipo de dia (ficha, registro, escolha)
js/days.js               refeições, água e tipo de dia por data
js/cardio.js             etapas da corrida, timer e progressão
js/progress.js           tendência, recordes, semanas consistentes, conquistas
js/stats.js              números agregados para gráficos e fechamento
js/habitos.js            hábitos do dia
js/proximo.js            próxima refeição e mensagem do dia
js/views/                uma tela por arquivo
tools/consolidar.py      junta os backups no PC
tests/                   testes (Node e Playwright)
privado/                 dados pessoais; fora do git
```

## Créditos

- Fotos dos exercícios: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), domínio público (Unlicense).
- Gráficos: [Chart.js](https://www.chartjs.org/), licença MIT (`vendor/chartjs-LICENSE.md`).
- Fontes: Bricolage Grotesque e Atkinson Hyperlegible Next, SIL Open Font License (`fonts/OFL-*.txt`).
- Ícones: [Phosphor Icons](https://phosphoricons.com), licença MIT (`vendor/phosphor-LICENSE.txt`).

Este app organiza treino e alimentação; não substitui nutricionista nem médico. Dor ou aperto no peito, falta de ar desproporcional, palpitação forte, desmaio ou tontura que não passa: pare e procure avaliação médica.
