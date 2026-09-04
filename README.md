# video-lab

Engine local em TypeScript para montar e produzir vídeos com **FFmpeg**.

Você descreve cenas (imagem/vídeo), transformações, efeitos, transições (`fade` / `crossfade`), áudios, textos e overlays num JSON de composição — ou num **template** com variáveis. O projeto valida, monta um `RenderPlan` e gera o MP4. A **Video Factory** recebe um template + vários inputs e renderiza o lote com concorrência limitada.

## Requisitos

- Node.js
- [pnpm](https://pnpm.io)
- FFmpeg instalado no sistema (`ffmpeg` no PATH)
- Para `drawtext` nativo: FFmpeg compilado com libfreetype. Sem isso, o engine rasteriza o texto num PNG do tamanho do texto (bounding box) e aplica como overlay.

```bash
# macOS (Homebrew) — o formula padrão pode não incluir drawtext
brew install ffmpeg
```

## Setup

```bash
pnpm install
```

Coloque as mídias nas pastas de `input/`:

- imagens → `input/images/`
- áudios → `input/audios/`
- vídeos de cena → `input/videos/`
- fontes (opcional) → `input/fonts/`

**Guia rápido para gerar MP4s:** [docs/gerar-videos.md](docs/gerar-videos.md) — setup, primeiro JSON, template e lote (Factory).

## Uso

```bash
# composição padrão (compositions/example.json)
pnpm dev

# composição específica
pnpm dev -- compositions/scenes-with-audio.json
pnpm dev -- compositions/background-and-scene-audio.json
pnpm dev -- compositions/texts.json
pnpm dev -- compositions/overlay.json
pnpm dev -- compositions/text-and-overlay.json
pnpm dev -- compositions/full-timeline.json
pnpm dev -- compositions/video-and-photos.json
pnpm dev -- compositions/video-timeline.json
pnpm dev -- compositions/video-photos.json
pnpm dev -- compositions/fade.json
pnpm dev -- compositions/crossfade.json
pnpm dev -- compositions/crossfade-image-video.json
pnpm dev -- compositions/transform-scale.json
pnpm dev -- compositions/transform-position.json
pnpm dev -- compositions/transform-crop.json
pnpm dev -- compositions/transform-combined.json
pnpm dev -- compositions/transform-video.json
pnpm dev -- compositions/transform-with-crossfade.json
pnpm dev -- compositions/animated-scale.json
pnpm dev -- compositions/animated-pan.json
pnpm dev -- compositions/animated-position.json
pnpm dev -- compositions/animated-zoom.json
pnpm dev -- compositions/ken-burns.json
pnpm dev -- compositions/animated-video.json
pnpm dev -- compositions/animated-with-crossfade.json
pnpm dev -- compositions/animated-with-fade.json
pnpm dev -- compositions/easing-linear.json
pnpm dev -- compositions/easing-in.json
pnpm dev -- compositions/easing-out.json
pnpm dev -- compositions/easing-in-out.json
pnpm dev -- compositions/easing-ken-burns.json
pnpm dev -- compositions/effect-brightness.json
pnpm dev -- compositions/effects-combined.json
pnpm dev -- compositions/effects-transform.json
pnpm dev -- compositions/effects-crossfade.json
pnpm dev -- compositions/effects-media-timing.json
```

A saída padrão é `output/videos/output.mp4`.

```bash
pnpm render compositions/example.json
pnpm render compositions/example.json --verbose
pnpm render compositions/example.json --debug
pnpm render-template templates/quote.json --input templates/inputs/quote.json
pnpm factory render-template templates/youtube-short.json --input templates/inputs/batch-youtube-short.json --concurrency 2
pnpm benchmark
```

No modo normal a CLI imprime composição e caminho do MP4. `--verbose` mostra planejamento, barra de progresso do FFmpeg e o **render factor**. `--debug` inclui o comando FFmpeg. A Factory imprime totais do lote e grava `manifest.json`. Em erro (JSON inválido, asset ausente, FFmpeg, cancelamento), o processo termina com código `1`. Um job falho no lote **não** aborta os demais.

## Lint e testes

```bash
pnpm lint
pnpm lint:fix
pnpm test
pnpm typecheck
```

O projeto usa ESLint com `@rocketseat/eslint-config/node` (inclui Prettier). Os testes unitários usam o runner nativo do Node (`node:test`) via `tsx`.

## Composição JSON

Exemplo mínimo:

```json
{
  "output": "output.mp4",
  "width": 1920,
  "height": 1080,
  "fps": 25,
  "scenes": [
    { "type": "image", "source": "flamengo.png", "duration": 4 },
    { "type": "image", "source": "input.png", "duration": 4 }
  ],
  "audio": [
    {
      "source": "audio.mp3",
      "role": "background",
      "start": 0,
      "duration": 8
    }
  ]
}
```

Os `source` são só o nome do arquivo. A pasta é inferida pelo tipo:

| Tipo | Pasta |
|---|---|
| `image` | `input/images/` |
| `video` | `input/videos/` |
| áudio | `input/audios/` |
| fonte | `input/fonts/` (ou fonte do sistema) |
| `output` | `output/videos/` |

Defaults aplicados pelo parser quando o campo não vem no JSON:

| Campo | Default |
|---|---|
| `output` | `output.mp4` |
| `width` | `1920` (inteiro par) |
| `height` | `1080` (inteiro par) |
| `fps` | `25` |
| `texts[].start` | `0` |
| `texts[].x` / `y` | `center` |
| `texts[].fontSize` | `48` |
| `texts[].color` | `#FFFFFF` |

### Cenas (`scenes`)

| Campo | Descrição |
|---|---|
| `type` | `image` ou `video` |
| `source` | nome do arquivo na pasta correspondente |
| `duration` | duração da cena na timeline global, em segundos |
| `mediaStart` | (vídeo) offset no arquivo de origem, em segundos. Default `0`. Inválido em `image` |
| `shortMedia` | (vídeo) o que fazer se a mídia disponível for menor que a cena: `error` (default), `loop` ou `freeze`. Inválido em `image` |
| `audio` | (opcional) áudios extras da cena |
| `keepAudio` | (vídeo) mantém o áudio original do arquivo |
| `transition` | transição **a partir da cena anterior** (`fade` ou `crossfade`) |
| `transform` | transformação visual da mídia da cena (estática ou animada) |
| `effects` | efeitos visuais estáticos da mídia da cena (`opacity`, `brightness`, `contrast`, `saturation`, `grayscale`, `sepia`, `blur`) |

A posição da cena na composição (`scenePlacements`) é independente do ponto de leitura do arquivo:

```text
Timeline da composição  ≠  Timeline da mídia
```

```json
{
  "type": "video",
  "source": "gloria-eterna.mp4",
  "duration": 5,
  "mediaStart": 20
}
```

A cena ocupa 5s na timeline global e lê `media[20s → 25s)`. `mediaStart` não move a cena, não altera o total da composição e não muda o tempo da animação nem da transição.

Se a mídia restante for menor que `duration`:

| `shortMedia` | Comportamento |
|---|---|
| `error` (default) | o engine rejeita antes do FFmpeg, com source, mediaStart, duração pedida e disponível |
| `loop` | o trecho `[mediaStart, EOF)` se repete **dentro** da cena |
| `freeze` | o último frame permanece até o fim da cena |

Uma composition antiga sem esses campos continua significando `mediaStart = 0` e `shortMedia = error`. `keepAudio` e áudio de cena seguem a timeline da cena; `mediaStart` não atrasa o áudio.

### Transformações

`transform` descreve a intenção visual da mídia da cena. Não afeta áudio, texto nem overlay. `crop` é sempre estático. `scale`, `zoom`, `x`/`y` e `pan` aceitam um número (estático) ou `{ from, to }` (animação ao longo da duração da cena). O campo opcional `easing` altera só a progressão entre `from` e `to`. Sem `easing`, a interpolação é `linear`. Não há keyframes.

Estático:

```json
{
  "transform": {
    "scale": 1.2,
    "x": 100,
    "y": 50
  }
}
```

Animado (Ken Burns):

```json
{
  "transform": {
    "scale": { "from": 1, "to": 1.18, "easing": "ease-in-out" },
    "pan": {
      "from": { "x": -80, "y": 20 },
      "to": { "x": 100, "y": -30 },
      "easing": "ease-out"
    }
  }
}
```

A animação começa em `from`, termina em `to` e ocupa a duração da cena. `t` é limitado a `[0, duration]`. Depois o easing remapeia esse `t` normalizado:

| `easing` | Curva | Comportamento |
|---|---|---|
| `linear` (default) | `t` | velocidade constante |
| `ease-in` | `t²` | começa devagar, termina rápido |
| `ease-out` | `1 - (1 - t)²` | começa rápido, termina devagar |
| `ease-in-out` | quadrática por partes | devagar → rápido → devagar |

Cada campo animado tem a própria curva. `x` e `y` são independentes. No `pan` `{ from, to }`, um `easing` vale para os dois eixos.

```text
value(t) = from + (to - from) * easing(t_norm)
```

| Campo | Semântica |
|---|---|
| `scale` | multiplicador de tamanho. `1` = tamanho após o fit no canvas. Número ou `{ from, to, easing? }` (`from`/`to` > 0) |
| `zoom` | o mesmo multiplicador que `scale`. Se os dois existirem: `scale(t) * zoom(t)` em cada instante |
| `x` / `y` | deslocamento em pixels **a partir do centro do canvas**. Número ou `{ from, to, easing? }`. `x > 0` direita, `y > 0` baixo |
| `pan` | o mesmo deslocamento que `x`/`y`. Estático: `{ x, y }`. Animado: `{ from: { x, y }, to: { x, y }, easing? }`. Se coexistir com `x`/`y`, os valores **somam** |
| `crop` | recorte **estático** em pixels da mídia de origem |

`zoom` ≡ `scale` e `pan` ≡ `x`/`y`. A interpolação de `scale * zoom` é o produto das duas curvas, não o lerp do produto. `position + pan` somam depois de cada um aplicar o próprio easing.

Ordem aplicada:

```text
input
 ↓
crop          (estático; pixels da mídia)
 ↓
canvas fit
 ↓
scale / zoom  (estático ou animado)
 ↓
position / pan  (estático ou animado; overlay no canvas)
 ↓
setsar + fps + format=yuv420p
 ↓
effects      (estáticos; só a mídia da cena)
 ↓
transition
```

Exemplos estáticos: `compositions/transform-scale.json`, `transform-position.json`, `transform-crop.json`, `transform-combined.json`, `transform-video.json`, `transform-with-crossfade.json`.

Exemplos animados: `compositions/animated-scale.json`, `animated-pan.json`, `animated-position.json`, `animated-zoom.json`, `ken-burns.json`, `animated-video.json`, `animated-with-crossfade.json`, `animated-with-fade.json`.

Exemplos de easing: `compositions/easing-linear.json`, `easing-in.json`, `easing-out.json`, `easing-in-out.json`, `easing-ken-burns.json`.

### Efeitos

`effects` descreve ajustes visuais **estáticos** da mídia da cena. Não afeta áudio, texto nem overlay independente. Não há `from`/`to`, keyframes nem easing nesta fase. A ordem das chaves no JSON é ignorada.

```json
{
  "effects": {
    "opacity": 0.85,
    "brightness": 0.1,
    "contrast": 1.2,
    "saturation": 0.8,
    "grayscale": 0.1,
    "sepia": 0.15,
    "blur": 1
  }
}
```

Sem `effects`, ou com `effects: {}`, o comportamento é o mesmo de antes. Defaults não geram filtro.

| Campo | Default | Limite | Semântica |
|---|---|---|---|
| `opacity` | `1` | `[0, 1]` | `1` = opaco. `0` = transparente (mistura a cena com o canvas preto) |
| `brightness` | `0` | `[-1, 1]` | `0` = original. `> 0` mais clara. `< 0` mais escura |
| `contrast` | `1` | `[0, 4]` | `1` = original. `> 1` mais contraste. `0` imagem achatada |
| `saturation` | `1` | `[0, 3]` | `1` = original. `0` = cinza. `> 1` mais saturada |
| `grayscale` | `0` | `[0, 1]` | `0` = original. `1` = cinza Rec.601. `0.5` = 50% |
| `sepia` | `0` | `[0, 1]` | `0` = original. `1` = sepia máximo da matriz simples |
| `blur` | `0` | `[0, 64]` | raio em pixels (`boxblur`, um passe) |

Efeito desconhecido (`vignette`, `glow`, …) é rejeitado. Valores animados (`{ from, to }`), `NaN`, `Infinity`, strings e objetos inválidos também.

Ordem canônica (independente do JSON):

```text
opacity → brightness → contrast → saturation → grayscale → sepia → blur
```

Effects entram **depois** de crop / fit / transform e **antes** da transição. Cada cena chega no `fade`/`crossfade` já com os próprios efeitos. `mediaStart`, `shortMedia`, `scenePlacements` e a duração da animação não mudam.

O parser valida. O RenderPlan guarda a intenção (`VideoItem.effects`). O `EffectFilter` traduz para FFmpeg.

Exemplos: `compositions/effect-opacity.json`, `effect-brightness.json`, `effect-contrast.json`, `effect-saturation.json`, `effect-grayscale.json`, `effect-sepia.json`, `effect-blur.json`, `effects-combined.json`, `effects-transform.json`, `effects-crossfade.json`, `effects-media-timing.json`.

### Áudio

Pode ser **global** (`audio` na raiz) ou **por cena** (`scenes[].audio`).

| Campo | Descrição |
|---|---|
| `source` | nome do arquivo em `input/audios/` |
| `role` | `background` (vol. 0.3) ou `focus` (vol. 1.0) |
| `start` | início na timeline (absoluto no global; relativo ao **início visual** da cena no local, inclusive no overlap do crossfade) |
| `duration` | (opcional) duração do trecho |
| `volume` | (opcional) sobrescreve o volume do `role` |

### Textos e overlays

Textos e overlays entram no `RenderPlan` como tracks próprias e são desenhados no MP4. O timing (`start` / `duration`) é absoluto na timeline da composição — não segue `mediaStart` nem transições.

O JSON antigo continua válido:

```json
{
  "texts": [
    {
      "content": "Video Lab",
      "start": 0,
      "duration": 5,
      "x": "center",
      "y": 140,
      "fontSize": 72,
      "color": "#FFFFFF",
      "font": "Arial",
      "bold": true
    }
  ]
}
```

Campos novos são opcionais. `style` e `position` são aliases que o parser achata nos campos da clip:

```json
{
  "content": "Linha 1\nLinha 2",
  "start": 1,
  "duration": 6,
  "position": { "x": "center", "y": "center" },
  "box": { "width": 1100, "height": 420 },
  "style": {
    "font": "Arial",
    "size": 44,
    "color": "#FFFFFF",
    "align": "center",
    "verticalAlign": "middle",
    "lineSpacing": 1.25,
    "stroke": { "width": 2, "color": "#000000" },
    "shadow": { "x": 4, "y": 4, "color": "#000000" },
    "background": { "color": "#000000", "opacity": 0.55, "padding": 24 }
  }
}
```

`x` / `y` (ou `position`) são o **ponto de referência da caixa de texto**, não necessariamente o canto superior esquerdo.

| `align` | A caixa encosta nesse ponto em X |
|---|---|
| `left` (default se `x` é número) | borda esquerda |
| `center` (default se `x` é `"center"`) | centro |
| `right` | borda direita |

| `verticalAlign` | A caixa encosta nesse ponto em Y |
|---|---|
| `top` (default se `y` é número) | topo |
| `middle` (default se `y` é `"center"`) | meio |
| `bottom` | base |

`lineSpacing` é **multiplicador** da altura da linha (`fontSize × lineSpacing`). Default `1` preserva o texto antigo. `box.width` é a largura máxima; o wrapping é feito no Node, de forma determinística, antes do FFmpeg. `\\n` no `content` vira quebra explícita. O fundo envolve o texto real (+ padding), não o canvas.

Sem `drawtext` no FFmpeg, o `Renderer` rasteriza cada texto em PNG (Swift) com os mesmos estilos e trata como overlay.

| Campo | Descrição |
|---|---|
| `overlays[].source` | imagem em `input/images/` |
| `overlays[].start` / `duration` | posição absoluta na timeline |
| `overlays[].x` / `y` / `width` / `height` | caixa do overlay |

Camadas, de baixo para cima: vídeo → overlays de imagem → texto.

### Transições

A transição é declarada na **cena de destino** e descreve o corte entre a cena anterior e ela.

```json
{
  "scenes": [
    { "type": "image", "source": "flamengo.png", "duration": 5 },
    {
      "type": "image", "source": "input.png", "duration": 5,
      "transition": { "type": "crossfade", "duration": 1 }
    }
  ]
}
```

- `fade` — a cena anterior some para preto e a próxima nasce do preto (`A → black → B`). As cenas não se sobrepõem; a duração total continua a soma das cenas.
- `crossfade` — as duas cenas se misturam. Com 5s + 5s e 1s de crossfade, o MP4 dura **9s** (`B.start = 4`).

| JSON | Semântica | Duração final (5s + 5s, T=1s) | FFmpeg |
|---|---|---|---|
| `fade` | A → preto → B | 10s | `fade=t=out` + `fade=t=in` + `concat` |
| `crossfade` | mistura A e B | 9s | `settb=AVTB` + `xfade` |

A primeira cena não pode ter `transition`. A duração tem que ser **estritamente menor** que as duas cenas adjacentes. Só o Video Track é afetado; texto e overlay seguem a própria timeline absoluta. Áudio de cena e `keepAudio` usam o **início visual** da cena (no crossfade, entram no overlap).

A tradução para filtros acontece só no `FfmpegCommandBuilder`. O RenderPlan guarda `incomingTransition` (`type` + `duration`), sem sintaxe FFmpeg. Detalhes do filter graph: [ffmpeg-guide.md](ffmpeg-guide.md).

### Exemplos prontos

- `compositions/example.json` — áudios globais na timeline
- `compositions/scenes-with-audio.json` — áudio dentro de cada cena
- `compositions/background-and-scene-audio.json` — background global + focus na cena
- `compositions/texts.json` — títulos e legendas nas cenas
- `compositions/overlay.json` — imagem sobreposta em posições diferentes
- `compositions/text-and-overlay.json` — texto + overlay juntos
- `compositions/full-timeline.json` — cenas, áudio, texto e overlay
- `compositions/video-and-photos.json` — foto, clipe de vídeo e foto, com áudio e textos
- `compositions/video-timeline.json` — vídeo, fotos, áudio global/cena, texto e overlay
- `compositions/video-photos.json` — fotos e vídeo, com o áudio original do clipe
- `compositions/fade.json` — foto → preto → foto
- `compositions/crossfade.json` — dissolução de 1s entre duas fotos
- `compositions/crossfade-image-video.json` — foto → clipe de vídeo
- `compositions/transform-scale.json` — foto ampliada (scale 1.4)
- `compositions/transform-position.json` — foto deslocada no canvas
- `compositions/transform-crop.json` — recorte da mídia original
- `compositions/transform-combined.json` — crop + scale + position
- `compositions/transform-video.json` — clipe com crop, scale, pan e áudio original
- `compositions/transform-with-crossfade.json` — transform + crossfade
- `compositions/animated-scale.json` — scale 1 → 1.2
- `compositions/animated-pan.json` — pan da esquerda para a direita
- `compositions/animated-position.json` — x/y animados
- `compositions/animated-zoom.json` — zoom 1 → 1.2
- `compositions/ken-burns.json` — scale + pan simultâneos, com áudio
- `compositions/animated-video.json` — clipe com scale/pan animados
- `compositions/animated-with-crossfade.json` — transform animado + crossfade
- `compositions/animated-with-fade.json` — transform animado + fade
- `compositions/easing-linear.json` — scale 1 → 1.5, velocidade constante
- `compositions/easing-in.json` — scale 1 → 1.5, começa devagar
- `compositions/easing-out.json` — scale 1 → 1.5, termina devagar
- `compositions/easing-in-out.json` — scale 1 → 1.5, aceleração no meio
- `compositions/easing-ken-burns.json` — scale ease-in-out + pan ease-out
- `compositions/media-trim.json` — lê 5s a partir de `mediaStart: 20`
- `compositions/media-offset.json` — começa o arquivo em 45s
- `compositions/media-loop.json` — mídia curta repetida dentro da cena
- `compositions/media-freeze.json` — último frame até o fim da cena
- `compositions/media-trim-crossfade.json` — `mediaStart` em B sem mover o crossfade
- `compositions/media-trim-animated.json` — trim + scale/x animados na duração da cena
- `compositions/text-basic.json` — texto antigo (x/y/fontSize)
- `compositions/text-multiline.json` — quebras explícitas
- `compositions/text-wrapping.json` — `box.width` com wrap automático
- `compositions/text-alignment.json` — left/center/right e top/middle/bottom
- `compositions/text-background.json` — fundo + padding
- `compositions/text-stroke.json` — contorno
- `compositions/text-shadow.json` — sombra (sem blur)
- `compositions/text-styled.json` — `style` + `position`
- `compositions/text-multiple.json` — título, subtítulo, legenda e watermark
- `compositions/text-full.json` — wrap, alinhamento, fundo, stroke e sombra
- `compositions/effect-opacity.json` — opacidade 0.6 (mistura com o canvas preto)
- `compositions/effect-brightness.json` — cena mais clara
- `compositions/effect-contrast.json` — contraste 1.4
- `compositions/effect-saturation.json` — saturação reduzida
- `compositions/effect-grayscale.json` — cinza completo
- `compositions/effect-sepia.json` — sepia 0.85
- `compositions/effect-blur.json` — blur de 4px
- `compositions/effects-combined.json` — os sete efeitos juntos
- `compositions/effects-transform.json` — scale/pan animados + brightness/contrast/saturation
- `compositions/effects-crossfade.json` — A escura + B clara, crossfade 1s (total 9s)
- `compositions/effects-media-timing.json` — mediaStart 30 + freeze + effects
- `templates/quote.json` — fundo + título + autor
- `templates/youtube-short.json` — 9:16, título, subtítulo, overlay
- `templates/slideshow.json` — três cenas, fade e crossfade
- `templates/full.json` — vídeo, transform, effects, texto, áudio, overlay
- `templates/inputs/batch-youtube-short.json` — três inputs para `pnpm factory`

## Limitações conhecidas

- Não há keyframes: cada campo animado tem só `from` → `to` e uma curva (`linear`, `ease-in`, `ease-out`, `ease-in-out`).
- O último frame da animação cai em `t ≈ duration - 1/fps`, não exatamente em `t = duration`. A expressão FFmpeg chega em `to` quando `t = duration`.
- `crop` não é conferido contra a resolução real do arquivo (o probe lê só a duração).
- `mediaStart` além do fim do arquivo e `shortMedia: error` com mídia curta são validados com `ffprobe` da duração do container. Sem duração legível, o render falha com mensagem clara.
- Inputs de imagem usam o framerate padrão do demuxer `image2` (25). Composições com `fps` diferente dependem do filtro `fps` na normalização.
- Fade visual não insere um segmento extra de preto: 5s + 5s com fade de 1s continua durando **10s**.
- Áudio não faz crossfade; no overlap visual, `keepAudio` e áudio de cena podem se misturar no `amix`.
- `keepAudio` e áudio de cena não herdam `mediaStart` do vídeo.
- Sombra de texto não tem blur (`shadow.blur` só aceita `0`). Fundo de texto não tem radius.
- O wrapping e o bounding box do PNG usam uma estimativa de largura por caractere; o desenho Swift pode ser um pouco mais estreito ou largo que a caixa.
- Effects são estáticos. `opacity` mistura a cena com o canvas preto (YUV); não fura a cena seguinte fora do `crossfade`.
- `grayscale` e `sepia` passam por `format=gbrp` + `colorchannelmixer` e voltam para `yuv420p`.
- A Factory é só em memória: se o processo morre, a fila some. Não há API HTTP, banco nem retry de erros determinísticos (template, asset, composition).

## Templates

Uma camada opcional **antes** do parser. O template declara variáveis; o resolver produz a mesma `Composition` que um JSON escrito à mão.

```bash
pnpm render-template templates/quote.json --input templates/inputs/quote.json
pnpm render-template templates/full.json --input templates/inputs/full.json --verbose
```

Documentação: [docs/templates.md](docs/templates.md).

## Video Factory

Produção em lote: um template + vários inputs, fila in-memory, concorrência limitada, retry só para falha de FFmpeg, cancelamento via AbortSignal e `manifest.json`.

```bash
pnpm factory render-template \
  templates/youtube-short.json \
  --input templates/inputs/batch-youtube-short.json \
  --concurrency 2
```

Documentação: [docs/factory.md](docs/factory.md).


## Arquitetura

```text
CLI
 ├── pnpm render            Composition JSON
 ├── pnpm render-template   Template + 1 input
 └── pnpm factory           Template + N inputs
         ↓
TemplateResolver → Composition (já validada pelo parser)
         ↓
RenderJob / RenderManager   ← somente factory
         ↓
Renderer
         ↓
RenderPlan → FfmpegCommandBuilder → FfmpegExecutor → FFmpeg
```

O `RenderPlan` é uma timeline de tracks independentes:

```text
Video Track     cenas em sequência (transform e effects opcionais); overlap só com crossfade
Audio Track     clips com start absoluto
Overlay Track   imagens sobrepostas
Text Track      drawtext (ou PNG rasterizado)
```

O CLI lê a composição, valida, imprime o comando FFmpeg e dispara o renderer. O `Renderer` orquestra as peças especializadas:

```text
Renderer
 ├── MediaResolver
 ├── FontResolver
 ├── AudioTimeline
 ├── FfmpegCommandBuilder
 └── FfmpegExecutor
```

O fallback de texto (PNG no bounding box) é escolhido pelo `Renderer` quando o FFmpeg não tem `drawtext`. A CLI e a Factory não precisam saber qual estratégia foi usada.

## Estrutura

```text
input/
  images/                 # imagens das cenas
  audios/                 # áudios
  videos/                 # vídeos de cena
  fonts/                  # TTFs opcionais dos textos
output/
  videos/                 # MP4s; na factory: job-001/video.mp4 + manifest.json
compositions/             # JSONs de composição
compositions/benchmark/   # cargas para pnpm benchmark
templates/                # templates reutilizáveis
templates/inputs/         # variáveis e batches
templates/presets/        # presets de proporção (templates comuns)
docs/                     # pipeline, factory, templates, performance
scripts/                  # fallback de texto (Swift) sem drawtext
src/
  cli/                    # entrada da aplicação
  benchmark/              # suíte de medição
  composition/            # parser e timeline de áudio
  template/               # resolver, validação e loader (sem FFmpeg)
  factory/                # jobs, fila, concorrência e manifest
  media/                  # resolução de arquivos e fontes
  renderer/               # orquestração, contexto e métricas
  ffmpeg/                 # filtros, comando e executor
  interfaces/             # tipagens de domínio
```

## Documentação

- [docs/gerar-videos.md](docs/gerar-videos.md) — como gerar vídeos (setup, JSON, template, lote)
- [flow-create-video.md](flow-create-video.md) — como o JSON vira comando FFmpeg
- [ffmpeg-guide.md](ffmpeg-guide.md) — flags, filtros e o filter graph que o engine monta (`fade`, `xfade`, concat, overlay, transform, effects, áudio)
- [docs/render-pipeline.md](docs/render-pipeline.md) — ciclo de vida do render
- [docs/performance.md](docs/performance.md) — render factor e benchmark
- [docs/progress.md](docs/progress.md) — callback de progresso
- [docs/cancellation.md](docs/cancellation.md) — AbortSignal e cleanup
- [docs/templates.md](docs/templates.md) — Template Engine (variáveis, CLI e API)
- [docs/factory.md](docs/factory.md) — Video Factory (batch, jobs, concorrência)
