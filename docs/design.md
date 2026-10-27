# Design do app

Direção: **orgânico suave**. Calmo e tátil, para uso diário. As cores vêm do próprio assunto: os quatro tipos de dia são cores de comida. Treino e timer são mais densos e precisos. Tokens em `css/tokens.css`; componentes em `css/app.css`; telas em `css/telas.css`.

## Tipografia

- **Atkinson Hyperlegible Next** (OFL): texto e interface. Corpo de 16,5 px.
- **Bricolage Grotesque** (OFL): títulos e números grandes, sempre com `font-variant-numeric: tabular-nums` (classe `.num`).
- Número grande, unidade menor e mais leve: "82,4 kg", "1.710 kcal".
- Nada de caixa alta espaçada, nada de monoespaçada em rótulo pequeno.

## Cor

- Tudo em OKLCH, com `light-dark()` para claro e escuro.
- Neutros levemente tingidos pelo matiz do tipo de dia (`--h`).
- No escuro, a elevação vem da luminosidade da superfície (`--surface`, `--surface2`, `--surface3`), não de sombra. Nada de preto puro.
- **Cor do dia** (`--day`, e `--accent` para texto e botão com contraste AA) só em três papéis:
  1. ação principal;
  2. preenchimento de progresso;
  3. marcador de "hoje".
- Nunca como fundo inteiro de card, borda lateral colorida ou gradiente. Para um fundo suave, use `--tint` (12% da cor do dia).
- Macros com cores fixas (`--p`, `--c`, `--g`, `--f`), sempre acompanhadas de texto ou número.

## Forma

| Elemento | Raio |
| --- | --- |
| Campo | 8 px (`--r-field`) |
| Bloco, card, linha | 14 px (`--r-block`) |
| Sheet, card de destaque | 24 px (`--r-hero`) |
| Chip, controle segmentado | pílula |
| Botão | 12 px |

Separação por degrau de superfície e linha fina, não por sombra. Sombra só no que flutua: sheet, toast e cronômetro.

## Ícones

- Phosphor (MIT), em `icons/sprite.svg`, gerado por `tools/icones.py`. Use pelo helper `icon(nome)` (`js/ui/icons.js`).
- Peso regular = pendente; peso preenchido (`-fill`) = feito ou ativo.
- **Emoji só em comida** (prato-relógio, opções de refeição, trocas). Nunca como ícone de navegação, seção ou estado.

## Movimento

Só em resposta a uma ação, e só com `prefers-reduced-motion: no-preference`:
- troca de tela com view transition;
- sheet entrando com `@starting-style`;
- check de "feito";
- anéis e barras preenchendo.

Nada de animação de entrada.

## Texto

- Português do Brasil, segunda pessoa, frases em caixa normal, aspas “ ”, números em pt-BR.
- Botões dizem o que fazem.
- Mensagens focadas em hábito e sem culpa. Nada de "deveria", "falhou" nem julgamento de comida.

## O que não fazer (sinais de "cara de IA")

- Emoji como ícone.
- O mesmo raio e a mesma sombra em tudo.
- Card com borda colorida de um lado.
- Selos e pílulas de status em excesso.
- Rótulo em caixa alta espaçada.
- Gradiente ou brilho.
- Animação de entrada em cada seção.
- Grade de cards idênticos.
- Seta "→" ou "›" decorando botão.
- Frases motivacionais genéricas.
