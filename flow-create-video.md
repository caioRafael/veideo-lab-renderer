# Guia: JSON → MP4

Como a composição vira um vídeo no video-lab.

## Pipeline

```text
JSON de Composition
    ou  Template + input  → TemplateResolver
    ou  Template + N inputs → VideoFactory → N jobs
→ CompositionParser (já chamado no resolver)
→ Renderer.prepare
→ RenderPlan
→ Tracks
→ FfmpegCommandBuilder
→ FfmpegExecutor
→ FFmpeg
→ MP4
```

O JSON descreve a timeline. O parser valida e aplica defaults. Templates só produzem Composition. A Factory só orquestra jobs. O `Renderer` monta um `RenderPlan` com tracks independentes. Só então o `FfmpegCommandBuilder` gera argumentos de FFmpeg (spawn, não string concatenada).

```text
Video Track     cenas em sequência (image ou video)
Audio Track     clips com start absoluto
Overlay Track   imagens sobrepostas
Text Track      drawtext, ou PNG no bounding box se o FFmpeg não tiver libfreetype
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
- `source`, `duration` (duração da cena na timeline global)
- `mediaStart?`: só em `video`; offset no arquivo. Default `0`
- `shortMedia?`: só em `video`; `error` (default), `loop` ou `freeze` quando a mídia não preenche a cena
- `audio?`: áudios extras da cena (`start` relativo à cena)
- `keepAudio?`: só em `video`; mantém a faixa original do arquivo (timeline da cena, não de `mediaStart`)

### Áudio extra

- global (`audio` na raiz, `start` absoluto) ou por cena
- `role`: `background` (vol. 0.3) ou `focus` (vol. 1.0)
- `volume` opcional sobrescreve o `role`

### Textos e overlays

Opcionais, com `start` absoluto na timeline. `x`/`y` ou `position` são o ponto de referência da caixa. `style.align` / `style.verticalAlign` definem qual borda encosta nesse ponto. `box.width` dispara wrapping no Node. Ver `compositions/text-basic.json`, `text-full.json`, `texts.json`.

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

Vídeo (sem offset):

```bash
-t 8 -i input/videos/gloria-eterna.mp4
```

Vídeo com `mediaStart` / `shortMedia`:

```bash
-ss 20 -t 5 -i input/videos/gloria-eterna.mp4          # trim
-ss 164 -t 1.837 -i input/videos/gloria-eterna.mp4     # loop: lê o trecho disponível; split+concat no filtro
-ss 164 -t 6 -i input/videos/gloria-eterna.mp4         # freeze (tpad no filtro)
```

Depois do seek, o filtro zera PTS (`setpts=PTS-STARTPTS`) para a cena começar em `t = 0`. Animação e transição usam a duração da cena, não o relógio do arquivo.

### 2. Transformar, padronizar, aplicar efeitos e concatenar vídeo

Sem `transform` (ou só com `crop`), cada cena entra no canvas assim:

```text
[0:v]crop=…,   # só se houver crop
     scale=1920:1080:force_original_aspect_ratio=decrease,
     pad=1920:1080:(ow-iw)/2:(oh-ih)/2,
     setsar=1,fps=25,format=yuv420p[v0]
```

Com `scale` / `zoom` / `x` / `y` / `pan`, o `pad` vira overlay no canvas preto — o frame final continua 1920×1080, `yuv420p`, mesmo FPS e SAR 1, para o `xfade` receber streams compatíveis.

Valores estáticos (`scale: 1.2`) geram constantes no filtro. Valores animados (`scale: { from, to }`) viram expressões de `t` no FFmpeg. Sem `easing`, a curva é `linear`. Com `ease-in` / `ease-out` / `ease-in-out`, o `VideoFilter` traduz a curva para `pow` / `if` na expression; o Node não gera um frame por instante. O conteúdo passa por `setpts=PTS-STARTPTS` antes dessas expressões, para `t = 0` ser o primeiro frame.

`effects` entram depois do canvas (`format=yuv420p`) e antes da transição. O `EffectFilter` emite só os filtros dos valores não-default, nesta ordem:

```text
opacity (lutyuv → canvas preto)
 → brightness / contrast / saturation (`eq`)
 → grayscale / sepia (`format=gbrp` + `colorchannelmixer` + `format=yuv420p`)
 → blur (`boxblur`)
```

A ordem das chaves no JSON não muda o graph. `effects: {}` não adiciona filtro. Texto e overlay independentes não passam por essa cadeia.

```text
input → mediaStart/trim → shortMedia (loop/freeze/error) → crop → canvas fit → scale/zoom → position/pan → easing → effects → transition
```

`x`/`y` (e `pan`) são deslocamento a partir do centro, em pixels do canvas.

```text
[v0][v1][v2]concat=n=3:v=1:a=0[vout]
```

Se houver overlay ou texto, o concat sai em `[vbase]` e as camadas seguintes terminam em `[vout]`. Transformações da cena **não** se aplicam a texto nem overlay.

### 3. Áudio

Cada item da audio track vira `-i` + `atrim` / `adelay` / `volume` / `apad`. Vários itens entram em `amix`. Sem áudio, o builder usa `anullsrc`.

`keepAudio: true` coloca a faixa do próprio MP4 na audio track, no início **visual** da cena (com overlap no crossfade). Áudio declarado em `scenes[].audio` usa o mesmo início visual. `video.mediaStart` não atrasa esse áudio.

### 4. Overlays e textos

Overlays: `scale` + `overlay` com `enable='between(t,start,end)'`.

Textos: o `TextRenderer` normaliza linhas (wrap no Node). Com `drawtext`, o `TextFilter` emite `fontsize`, `x`/`y` pelo ponto de referência, `line_spacing`, `borderw`, `shadowx`/`shadowy`, `box`/`boxcolor`/`boxborderw`. Sem `drawtext`, o mesmo `TextItem` vira PNG via Swift.

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
scenes image/video ─► Video Track ─► media time ─► crop? ─► fit ─► transform ─► effects ─► concat/xfade ─► [vbase]
overlays            ─► Overlay Track ─► scale + overlay ────────────────────────────────────────► [vout]
texts               ─► Text Track ─► drawtext ou PNG overlay ───────────────────────────────────┘
audio / keepAudio   ─► Audio Track ─► atrim/adelay/amix ────────────────────────────────────────► [aout]
```

---

## Como rodar

```bash
pnpm dev
pnpm dev -- compositions/example.json
pnpm dev -- compositions/full-timeline.json
pnpm dev -- compositions/video-photos.json
pnpm dev -- compositions/transform-scale.json
pnpm dev -- compositions/transform-with-crossfade.json
pnpm dev -- compositions/ken-burns.json
pnpm dev -- compositions/easing-in-out.json
pnpm dev -- compositions/animated-with-fade.json
pnpm dev -- compositions/media-trim.json
pnpm dev -- compositions/media-loop.json
pnpm dev -- compositions/media-freeze.json
pnpm dev -- compositions/effect-brightness.json
pnpm dev -- compositions/effects-combined.json
pnpm dev -- compositions/effects-transform.json
pnpm dev -- compositions/effects-crossfade.json
pnpm dev -- compositions/effects-media-timing.json
```

A CLI imprime o comando FFmpeg antes de executar. Em erro, o processo termina com código `1`.

Transições (`fade` / `crossfade`) são declaradas na cena de destino. Transformações (`scale`, `position`, `crop`, `zoom`, `pan`) pertencem à mídia da cena e podem ser estáticas ou animadas (`from`/`to`, com `easing` opcional). Effects (`opacity`, `brightness`, `contrast`, `saturation`, `grayscale`, `sepia`, `blur`) são estáticos e entram depois do transform. Ver [README](README.md#transformações) e [README](README.md#efeitos).
