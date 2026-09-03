# video-lab

Laboratório em TypeScript para montar vídeos com **FFmpeg** a partir de um arquivo JSON de composição.

Você descreve cenas (imagem/vídeo), áudios, textos e overlays; o projeto valida a composição, monta um `RenderPlan` com tracks e gera o MP4.

## Requisitos

- Node.js
- [pnpm](https://pnpm.io)
- FFmpeg instalado no sistema (`ffmpeg` no PATH)
- Para `drawtext` nativo: FFmpeg compilado com libfreetype. Sem isso, o engine rasteriza o texto e aplica como overlay.

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
```

A saída padrão é `output/videos/output.mp4`.

Antes de renderizar, o programa imprime o comando FFmpeg montado.

## Lint e testes

```bash
pnpm lint
pnpm lint:fix
pnpm test
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
| `output` | `output/videos/` |

Defaults aplicados pelo parser quando o campo não vem no JSON:

| Campo | Default |
|---|---|
| `output` | `output.mp4` |
| `width` | `1920` |
| `height` | `1080` |
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
| `duration` | duração em segundos |
| `audio` | (opcional) áudios da cena |

### Áudio

Pode ser **global** (`audio` na raiz) ou **por cena** (`scenes[].audio`).

| Campo | Descrição |
|---|---|
| `source` | nome do arquivo em `input/audios/` |
| `role` | `background` (vol. 0.3) ou `focus` (vol. 1.0) |
| `start` | início na timeline (absoluto no global; relativo à cena no local) |
| `duration` | (opcional) duração do trecho |
| `volume` | (opcional) sobrescreve o volume do `role` |

### Textos e overlays

Textos e overlays entram no `RenderPlan` como tracks próprias e são desenhados no MP4.

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
      "color": "#FFFFFF"
    }
  ],
  "overlays": [
    {
      "source": "input.png",
      "start": 1,
      "duration": 5,
      "x": 80,
      "y": 80,
      "width": 280,
      "height": 280
    }
  ]
}
```

| Campo | Descrição |
|---|---|
| `texts[].content` | texto exibido |
| `texts[].start` / `duration` | posição absoluta na timeline |
| `texts[].x` / `y` | posição (`center` ou pixel) |
| `overlays[].source` | imagem em `input/images/` |
| `overlays[].start` / `duration` | posição absoluta na timeline |
| `overlays[].x` / `y` / `width` / `height` | caixa do overlay |

Camadas, de baixo para cima: vídeo → overlays de imagem → texto.

### Exemplos prontos

- `compositions/example.json` — áudios globais na timeline
- `compositions/scenes-with-audio.json` — áudio dentro de cada cena
- `compositions/background-and-scene-audio.json` — background global + focus na cena
- `compositions/texts.json` — títulos e legendas nas cenas
- `compositions/overlay.json` — imagem sobreposta em posições diferentes
- `compositions/text-and-overlay.json` — texto + overlay juntos
- `compositions/full-timeline.json` — cenas, áudio, texto e overlay

## Arquitetura

```text
CLI
 ↓
CompositionParser
 ↓
Renderer
 ↓
RenderPlan (tracks)
 ↓
FfmpegCommandBuilder
 ↓
FfmpegExecutor
 ↓
FFmpeg
```

O `RenderPlan` é uma timeline de tracks independentes:

```text
Video Track     cenas em sequência
Audio Track     clips com start absoluto
Overlay Track   imagens sobrepostas
Text Track      drawtext (ou PNG rasterizado)
```

O CLI só lê a composição e dispara o renderer. O `Renderer` orquestra as peças especializadas:

```text
Renderer
 ├── MediaResolver
 ├── FontResolver
 ├── AudioTimeline
 ├── VideoFilter
 ├── AudioFilter
 ├── OverlayFilter
 ├── TextFilter
 ├── FfmpegCommandBuilder
 └── FfmpegExecutor
```

## Estrutura

```text
input/
  images/                 # imagens das cenas
  audios/                 # áudios
  videos/                 # vídeos de cena
output/
  videos/                 # MP4s gerados
compositions/             # JSONs de composição
scripts/                  # fallback de texto (Swift) sem drawtext
src/
  cli/                    # entrada da aplicação
  composition/            # parser e timeline de áudio
  media/                  # resolução de arquivos e fontes
  renderer/               # orquestração e RenderPlan
  ffmpeg/                 # filtros, comando e executor
  interfaces/             # tipagens de domínio
```

## Documentação

- [flow-create-video.md](flow-create-video.md) — como o JSON vira comando FFmpeg
