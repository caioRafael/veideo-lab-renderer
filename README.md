# video-lab

Laboratório em TypeScript para montar vídeos com **FFmpeg** a partir de um arquivo JSON de composição.

Você descreve cenas (imagem/vídeo) e áudios (globais ou por cena); o projeto monta o comando FFmpeg e gera o MP4.

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

Coloque as mídias em `src/assets/` (imagens, vídeos, áudios).

## Uso

```bash
# composição padrão (src/compositions/example.json)
pnpm dev

# composição específica
pnpm dev -- src/compositions/scenes-with-audio.json
pnpm dev -- src/compositions/background-and-scene-audio.json
```

A saída padrão é `src/assets/output.mp4`.

Antes de renderizar, o programa imprime o comando FFmpeg montado.

## Lint

```bash
pnpm lint
pnpm lint:fix
```

O projeto usa ESLint com `@rocketseat/eslint-config/node` (inclui Prettier).

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

### Cenas (`scenes`)

| Campo | Descrição |
|---|---|
| `type` | `image` ou `video` |
| `source` | arquivo em `src/assets/` |
| `duration` | duração em segundos |
| `audio` | (opcional) áudios da cena |

### Áudio

Pode ser **global** (`audio` na raiz) ou **por cena** (`scenes[].audio`).

| Campo | Descrição |
|---|---|
| `source` | arquivo em `src/assets/` |
| `role` | `background` (vol. 0.3) ou `focus` (vol. 1.0) |
| `start` | início na timeline (absoluto no global; relativo à cena no local) |
| `duration` | (opcional) duração do trecho |
| `volume` | (opcional) sobrescreve o volume do `role` |

### Exemplos prontos

- `src/compositions/example.json` — áudios globais na timeline
- `src/compositions/scenes-with-audio.json` — áudio dentro de cada cena
- `src/compositions/background-and-scene-audio.json` — background global + focus na cena

## Estrutura

```text
src/
  assets/           # mídias de entrada/saída
  compositions/     # JSONs de composição
  interfaces/       # tipagens (Composition, Scene, Audio, ...)
  ffmpeg/
    buildCommand.ts # JSON → args do FFmpeg
  index.ts          # entrada (lê JSON e executa)
flow-create-video.md
```

## Documentação

- [flow-create-video.md](flow-create-video.md) — como o JSON vira comando FFmpeg
