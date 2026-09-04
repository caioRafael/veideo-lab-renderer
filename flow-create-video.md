# Guia: JSON → MP4

Como a composição vira um vídeo no video-lab.

## Pipeline

```text
JSON
→ loadComposition / CompositionParser
→ Renderer.prepare
→ RenderPlan
→ Tracks
→ FfmpegCommandBuilder
→ FfmpegExecutor
→ FFmpeg
→ MP4
```

O JSON descreve a timeline. O parser valida e aplica defaults. O `Renderer` monta um `RenderPlan` com tracks independentes. Só então o `FfmpegCommandBuilder` gera argumentos de FFmpeg (spawn, não string concatenada).

```text
Video Track     cenas em sequência (image ou video)
Audio Track     clips com start absoluto
Overlay Track   imagens sobrepostas
Text Track      drawtext, ou PNG rasterizado se o FFmpeg não tiver libfreetype
```

Camadas visuais, de baixo para cima: vídeo → overlays → texto.

---

## Schema do JSON

Arquivo exemplo: `compositions/example.json`

```json
{
  "output": "output.mp4",
  "width": 1920,
  "height": 1080,
  "fps": 25,
  "scenes": [
    { "type": "image", "source": "flamengo.png", "duration": 4 },
    { "type": "image", "source": "input.png", "duration": 4 },
    { "type": "image", "source": "flamengo.png", "duration": 6 }
  ],
  "audio": [
    { "source": "audio2.mp3", "role": "background", "start": 0, "duration": 8 },
    { "source": "audio.mp3", "role": "focus", "start": 8, "duration": 6 }
  ]
}
```

Os `source` são só o nome do arquivo. A pasta vem do tipo:

| Tipo | Pasta |
|---|---|
| `image` / overlay | `input/images/` |
| `video` | `input/videos/` |
| áudio extra | `input/audios/` |
| fonte | `input/fonts/` ou fonte do sistema |
| `output` | `output/videos/` |

### Cenas

- `type`: `image` ou `video`
- `source`, `duration`
- `audio?`: áudios extras da cena (`start` relativo à cena)
- `keepAudio?`: só em `video`; mantém a faixa original do arquivo

### Áudio extra

- global (`audio` na raiz, `start` absoluto) ou por cena
- `role`: `background` (vol. 0.3) ou `focus` (vol. 1.0)
- `volume` opcional sobrescreve o `role`

### Textos e overlays

Opcionais, com `start` absoluto na timeline. Ver `compositions/texts.json`, `overlay.json` e `full-timeline.json`.

Exemplos com cena de vídeo: `compositions/video-photos.json`, `video-and-photos.json`, `video-timeline.json`.

### Timeline de `example.json`

```text
0s ──────── 4s ──────── 8s ────────────── 14s
│ flamengo  │  input   │    flamengo     │
│         audio2 (bg)  │   audio (focus) │
└───────────┴──────────┴─────────────────┘
```

---

## Como o RenderPlan vira FFmpeg

O `RenderPlan` não contém `-filter_complex` nem `drawtext`. Isso fica no builder.

### 1. Inputs de cena

Imagem:

```bash
-loop 1 -t 4 -i input/images/flamengo.png
```

Vídeo:

```bash
-t 8 -i input/videos/gloria-eterna.mp4
```

### 2. Padronizar e concatenar vídeo

```text
[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,
     pad=1920:1080:(ow-iw)/2:(oh-ih)/2,
     setsar=1,fps=25,format=yuv420p[v0]
```

```text
[v0][v1][v2]concat=n=3:v=1:a=0[vout]
```

Se houver overlay ou texto, o concat sai em `[vbase]` e as camadas seguintes terminam em `[vout]`.

### 3. Áudio

Cada item da audio track vira `-i` + `atrim` / `adelay` / `volume` / `apad`. Vários itens entram em `amix`. Sem áudio, o builder usa `anullsrc`.

`keepAudio: true` coloca a faixa do próprio MP4 na audio track, no `start` da cena.

### 4. Overlays e textos

Overlays: `scale` + `overlay` com `enable='between(t,start,end)'`.

Textos: `drawtext` quando o FFmpeg tem o filtro. Sem `drawtext`, o `Renderer` rasteriza cada texto em PNG temporário, trata como overlay e apaga os arquivos depois do FFmpeg (também se o render falhar).

### 5. Exportar

```bash
-map "[vout]" -map "[aout]"
-c:v libx264 -c:a aac
-t TOTAL -pix_fmt yuv420p
output/videos/output.mp4
```

---

## Diagrama

```text
CLI
 ↓
loadComposition / CompositionParser
 ↓
Renderer.prepare → RenderPlan (tracks)
 ↓
FfmpegCommandBuilder → args[]
 ↓
FfmpegExecutor (spawn)
 ↓
MP4
```

```text
scenes image/video ─► Video Track ─► scale/pad/fps ─► concat ─► [vbase]
overlays            ─► Overlay Track ─► scale + overlay ───────► [vout]
texts               ─► Text Track ─► drawtext ou PNG overlay ──┘
audio / keepAudio   ─► Audio Track ─► atrim/adelay/amix ───────► [aout]
```

---

## Como rodar

```bash
pnpm dev
pnpm dev -- compositions/example.json
pnpm dev -- compositions/full-timeline.json
pnpm dev -- compositions/video-photos.json
```

A CLI imprime o comando FFmpeg antes de executar. Em erro, o processo termina com código `1`.

Transições (`fade` / `crossfade`) são declaradas na cena de destino. Ver [README](README.md#transições).
