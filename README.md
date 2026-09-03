# video-lab

Laboratório em TypeScript para montar vídeos com **FFmpeg** a partir de um arquivo JSON de composição.

Você descreve cenas (imagem/vídeo) e áudios (globais ou por cena); o projeto valida a composição, resolve as mídias, monta um plano de render e gera o MP4.

## Requisitos

- Node.js
- [pnpm](https://pnpm.io)
- FFmpeg instalado no sistema (`ffmpeg` no PATH)

```bash
# macOS (Homebrew)
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

### Exemplos prontos

- `compositions/example.json` — áudios globais na timeline
- `compositions/scenes-with-audio.json` — áudio dentro de cada cena
- `compositions/background-and-scene-audio.json` — background global + focus na cena

## Arquitetura

```text
CLI
 ↓
CompositionParser
 ↓
Renderer
 ↓
RenderPlan
 ↓
FfmpegCommandBuilder
 ↓
FfmpegExecutor
 ↓
FFmpeg
```

O CLI só lê a composição e dispara o renderer. O `Renderer` orquestra as peças especializadas:

```text
Renderer
 ├── MediaResolver
 ├── AudioTimeline
 ├── VideoFilter
 ├── AudioFilter
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
src/
  cli/                    # entrada da aplicação
  composition/            # parser e timeline de áudio
  media/                  # resolução de arquivos
  renderer/               # orquestração e RenderPlan
  ffmpeg/                 # filtros, comando e executor
  interfaces/             # tipagens de domínio
```

## Documentação

- [flow-create-video.md](flow-create-video.md) — como o JSON vira comando FFmpeg
