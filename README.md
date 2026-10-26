# Treino

App web instalável (PWA) para seguir a ficha de musculação Upper/Lower 4x, registrar cargas e acompanhar a evolução. Funciona offline, foi pensado para o celular e não precisa de servidor nem de conta: tudo fica salvo no próprio aparelho.

## O que o app faz

- **Hoje:** mostra o treino do dia (ou o próximo da sequência, se você perdeu um), o cardio planejado para a manhã e um campo rápido para registrar o peso.
- **Treino:** cada exercício tem foto animada, séries, faixa de repetições, RIR e descanso da fase atual. Você registra carga, repetições e dificuldade (fácil, médio, difícil) série por série. O cronômetro de descanso começa sozinho, e o app sugere se é hora de subir, manter ou reduzir a carga.
- **Como fazer:** mapa dos músculos trabalhados, onde sentir, execução, cuidados de postura, alternativa se o aparelho estiver ocupado e link para vídeos.
- **Progresso:** treinos por semana, aderência, séries por músculo contra a meta, evolução de carga e força estimada por exercício, peso com média de 7 dias, % de gordura por método e minutos de cardio.
- **Corpo:** registro de peso, cintura e avaliações de composição (dobras cutâneas ou bioimpedância).
- **Mais:** data de início do programa, backup (exportar e importar), guia rápido.

A dificuldade de cada série corresponde ao RIR da ficha: **Fácil** = sobrariam 4 ou mais repetições; **Médio** = 2–3; **Difícil** = 0–1.

---

## 1. Publicar no GitHub Pages

1. Crie uma conta em [github.com](https://github.com), se ainda não tiver.
2. Clique em **New repository**. Dê um nome curto, por exemplo `treino`, e deixe-o **Public**. Não marque a opção de criar README.
3. Na página do repositório vazio, clique em **uploading an existing file**.
4. Arraste **o conteúdo** desta pasta (os arquivos `index.html`, `sw.js`, `manifest.webmanifest`, `.nojekyll` e as pastas `css`, `js`, `img`, `icons`, `fonts`, `vendor`), não a pasta em si. Clique em **Commit changes**.
   - O arquivo `.nojekyll` começa com ponto e pode ficar oculto no Finder ou no Explorer. No Mac, `Cmd + Shift + .` mostra arquivos ocultos. Se ele não subir, o app funciona do mesmo jeito.
5. Vá em **Settings → Pages**. Em *Build and deployment*, escolha **Deploy from a branch**, branch **main**, pasta **/ (root)**, e clique em **Save**.
6. Espere 1–2 minutos e recarregue a página de configurações. O endereço vai aparecer, no formato:
   `https://SEU-USUARIO.github.io/treino/`

**Pelo terminal**, se preferir:

```bash
cd treino-app
git init
git add .
git commit -m "Primeira versão do app de treino"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/treino.git
git push -u origin main
```

Depois, ative o Pages como no passo 5.

**Repositório privado:** no plano gratuito, o GitHub Pages só publica repositórios públicos. Com o [GitHub Student Developer Pack](https://education.github.com/pack), disponível para estudantes com e-mail da universidade, você ganha o GitHub Pro e pode publicar a partir de um repositório privado. O endereço do site continua acessível a quem tiver o link, mas o código fica privado.

## 2. Instalar no iPhone

Instale pelo **Safari**. No iPhone, o Chrome usa o mesmo motor do Safari, então não há vantagem em usá-lo, e o caminho de instalação do Safari é o mais confiável.

1. Abra o endereço do seu GitHub Pages no Safari.
2. Toque em **Compartilhar** (o quadrado com a seta para cima).
3. Escolha **Adicionar à Tela de Início** e confirme.
4. A partir daí, **abra sempre pelo ícone da tela inicial**.

**Importante sobre os dados no iPhone:**

- O app instalado guarda os dados separados da aba do Safari. O que você registrar pelo ícone não aparece se abrir o site no navegador, e vice-versa.
- **Se você apagar o ícone da tela inicial, o iOS apaga os dados junto.** Exporte um backup antes.
- O app funciona sem internet depois de aberto uma vez.

## 3. Primeiro uso

1. Na tela **Hoje**, defina a **data de início** do programa. Ela calcula a semana atual, a fase (semanas 1–2 com volume reduzido) e o cardio do dia.
2. **Opcional:** importe suas avaliações anteriores. O arquivo `dados-iniciais-PRIVADO.json`, que veio fora desta pasta, tem as duas avaliações por dobras cutâneas (fev/2025 e jan/2026).
   - Mande o arquivo para o iPhone (AirDrop, iCloud Drive ou e-mail para você mesma) e salve em **Arquivos**.
   - No app: **Mais → Importar arquivo →** escolha o arquivo **→ Juntar com os dados atuais**.
   - **Não suba esse arquivo para o GitHub.** O `.gitignore` já ajuda a evitar isso.

## 4. Backup (faça a cada 1–2 semanas)

**Mais → Exportar dados.** No iPhone, abre o menu de compartilhamento: escolha **Salvar em Arquivos** e uma pasta do iCloud Drive. O app avisa na tela Hoje quando faz mais de 14 dias desde o último backup.

Para restaurar em outro aparelho: instale o app, vá em **Mais → Importar arquivo →** escolha o backup **→ Substituir tudo**.

## 5. Atualizar o app

1. Edite os arquivos (no próprio site do GitHub ou no seu computador).
2. Em `sw.js`, aumente a versão do cache: `const CACHE = 'treino-v1';` passa para `'treino-v2'`. **Sem isso, o celular continua mostrando a versão antiga.**
3. Faça o commit. Em 1–2 minutos o Pages atualiza.
4. Abra o app: aparece "Nova versão disponível". Toque para atualizar. Seus dados não são afetados.

Se acrescentar arquivos novos (por exemplo, uma imagem), inclua o caminho na lista `ASSETS` do `sw.js` para que funcione offline.

**Mudar a ficha:** exercícios, séries, faixas de repetição, descanso e textos ficam em `js/plan.js`. Cada exercício tem um `id`, como `ia1`. Se trocar um exercício por outro, **dê a ele um id novo**: o histórico fica ligado ao id, e reaproveitar um id misturaria cargas de exercícios diferentes.

## 6. Testar no computador

Módulos JavaScript não funcionam abrindo o `index.html` direto do disco. Rode um servidor local dentro da pasta:

```bash
cd treino-app
python3 -m http.server 8000
```

Depois, abra `http://localhost:8000` no navegador. No Chrome, as ferramentas de desenvolvedor (F12) mostram o banco em **Application → IndexedDB → treino-app**.

## 7. Privacidade

- Nenhum dado pessoal está no código. Peso, cargas e avaliações ficam no IndexedDB do seu aparelho e só saem dele quando você exporta.
- O app não envia nada para servidores. A única saída é o botão de vídeos, que abre uma busca no YouTube.
- Os textos de postura da ficha são genéricos, mas, se o repositório for público, qualquer pessoa pode ler a ficha.

## Estrutura

```
index.html             casca do app, navegação e cronômetro
manifest.webmanifest   nome, ícone e modo de tela cheia
sw.js                  cache offline e atualização
css/app.css            estilos (claro e escuro)
js/app.js              telas e lógica
js/db.js               banco local (IndexedDB), exportar e importar
js/plan.js             a ficha: exercícios, séries, textos
js/bodymap.js          mapa muscular em SVG
img/ex/                fotos dos exercícios (2 quadros cada)
icons/                 ícones do app
fonts/                 fonte Archivo (OFL)
vendor/chart.umd.js    Chart.js 4.4.1 (MIT)
```

## Créditos

- Fotos dos exercícios: [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), domínio público (Unlicense).
- Gráficos: [Chart.js](https://www.chartjs.org/), licença MIT (`vendor/chartjs-LICENSE.md`).
- Fonte: Archivo, SIL Open Font License (`fonts/OFL-LICENSE.txt`).

Este app organiza o treino; não substitui avaliação profissional. Dor articular, tontura, dor no peito ou falta de ar fora do normal são motivo para parar e procurar avaliação médica.
