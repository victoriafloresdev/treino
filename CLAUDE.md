# Projeto: app de bem-estar (PWA)

App pessoal instalado na tela inicial de um iPhone 17. Reúne treino de musculação, cardio, alimentação, água, peso e composição corporal. Publicado no GitHub Pages, sem servidor: os dados ficam no aparelho.

Contexto pessoal e de saúde: ver `CLAUDE.local.md` (não versionado).
Especificação da versão atual em desenvolvimento: `docs/v2-especificacao.md`.

## Stack (não mudar sem perguntar)

- HTML, CSS e JavaScript puro com ES modules. Sem framework, sem bundler, sem etapa de build.
- Nada carregado de CDN em tempo de execução. Bibliotecas e fontes ficam em `vendor/` e `fonts/`, para funcionar offline.
- Dados em IndexedDB (`js/db.js`). `localStorage` só para preferências descartáveis.
- Gráficos com Chart.js já em `vendor/`. Não adicionar outra biblioteca de gráficos.
- Service worker em `sw.js`, com lista `ASSETS` explícita.

## Regras de dados (críticas)

- **Nunca perder dados existentes.** Mudanças no IndexedDB só por `DB_VERSION` + `onupgradeneeded` aditivo. Não apagar nem renomear stores ou campos já usados. Toda migração precisa de teste: criar um banco na versão anterior com dados de exemplo, abrir com o código novo e verificar que nada sumiu.
- Todo registro tem `uid` (`crypto.randomUUID()`), usado para deduplicar em importações e na consolidação no PC.
- Exportar e importar precisam continuar aceitando os backups das versões anteriores.
- A cada mudança em arquivo do app: aumentar `CACHE` em `sw.js` e atualizar `ASSETS` se houver arquivo novo.
- O `id` de cada exercício em `js/plan.js` é a chave do histórico. Exercício novo recebe id novo; nunca reaproveitar.

## Privacidade (o repositório pode ser público)

- Nenhum dado pessoal de saúde em arquivos versionados: valores de exames, diagnósticos, nomes de profissionais, peso ou medidas reais.
- Isso vale para o código também: textos que citam exames da usuária vêm de um perfil privado importado no aparelho, nunca escritos no código.
- A pasta `privado/` e o `CLAUDE.local.md` estão no `.gitignore`. Antes de cada commit, conferir com `git status` que nada de lá entrou.

## Regras de conteúdo (saúde e treino)

- Não sugerir mudança de medicação nem interpretar exames como diagnóstico.
- Não alterar metas calóricas, porções, macros, séries, faixas de repetição ou regras de progressão sem perguntar antes.
- Calorias e gasto são estimativas (cerca de ±200 kcal) e aparecem como estimativas. Nunca "devolver" na comida as calorias do exercício.
- Ajustes de plano só com base em médias de 2–3 semanas.
- Sem moralismo e sem alimento "proibido". Dia fora do plano não é fracasso.
- A gamificação premia hábitos (treinar, registrar, beber água, bater proteína), nunca a perda de peso em si. Nada que puna dia perdido.
- Sem supersets: todos os exercícios são feitos em séries normais, com descanso próprio.
- Sinais de alerta (dor ou aperto no peito, falta de ar desproporcional, palpitação forte, desmaio, tontura que não passa) sempre levam à orientação de parar e procurar avaliação médica.

## Interface

- Português do Brasil, frases em caixa normal, segunda pessoa ("você"), aspas “ ”, números em formato pt-BR (1.700; 0,5).
- Botões dizem exatamente o que fazem ("Salvar peso", "Marcar como feito").
- Seletores são radio groups nativos (`fieldset` + `input type="radio"`) estilizados como chips ou segmented control. Nada de dropdown para poucas opções.
- Área de toque ≥ 44 px, foco visível, `prefers-reduced-motion` respeitado.
- Cor nunca é o único indicador: sempre há texto ou número junto.
- Claro e escuro com tokens em `:root`. Safe areas com `viewport-fit=cover` e `env(safe-area-inset-*)`.
- Movimento só em resposta a ação. Sem animação de entrada.
- Não imitar os anéis do Apple Activity.

### Layout no celular (bug recorrente)

Caixas não podem sair da margem do bloco. Ao criar ou alterar CSS:

- `min-width: 0` em filhos de grid e flex que contêm texto ou inputs;
- inputs e selects com `width: 100%` e `box-sizing: border-box`;
- nenhuma largura mínima fixa maior que a coluna; tabelas largas dentro de um contêiner com `overflow-x: auto`;
- textos longos com `overflow-wrap: anywhere`;
- inputs com `font-size` ≥ 16 px, para o iOS não dar zoom.

## Testes antes de cada commit

1. Servir localmente com `python3 -m http.server 8000`. Módulos não funcionam via `file://`.
2. Rodar Playwright (Chromium) nas larguras 375×667, 402×874 (iPhone 17) e 440×956, em modo claro e escuro.
3. Verificar que não há erro no console nem rolagem horizontal da página: `document.documentElement.scrollWidth <= innerWidth`.
4. Tirar screenshots das telas alteradas e revisá-las antes de dizer que terminou.
5. Testar offline: recarregar com a rede desligada depois do primeiro carregamento.

## Fluxo de trabalho

- Trabalhar na branch indicada na especificação, nunca direto na `main`. A `main` é o que está publicado no celular.
- Commits pequenos, um por etapa, com mensagem em português.
- Antes de push na `main` ou merge: mostrar o resumo das mudanças e esperar aprovação.
- Diante de ambiguidade em regra de saúde, meta ou dado: perguntar em vez de supor.
