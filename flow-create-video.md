# Guide: Composition → MP4

**English** | [Português](docs/pt-BR/flow-create-video.md)

How a composition object becomes a video in Patchwork. The entry point is `render({ composition, assets, output })`. There is no required JSON file and no CLI.

## Pipeline

```text
render({ composition, assets, output })
→ CompositionParser
→ Renderer.prepare
    → SourceResolver (file / asset / url → local path)
    → MediaResolver  (already-resolved path)
→ RenderPlan
→ Tracks
→ FfmpegCommandBuilder
→ FfmpegExecutor
→ FFmpeg
→ MP4
```

The object describes the timeline. The parser validates it and applies defaults. Structured sources become a local file during `prepare`. `Renderer` builds a `RenderPlan` with independent tracks. Only then `FfmpegCommandBuilder` produces FFmpeg arguments (`spawn`, not a concatenated string).

```text
Video Track     sequential scenes (image or video)
Audio Track     clips with an absolute start
Overlay Track   overlaid images
Text Track      drawtext, or a bounding-box PNG if FFmpeg has no libfreetype
```

Visual layers, bottom to top: video → overlays → text.

---

## JSON schema

Example in `compositions/example.json`. `source` strings are ids from the `assets` map passed to `render({ assets })`.

```ts
await render({
  composition: {
    width: 1920,
    height: 1080,
    fps: 25,
    scenes: [
      { type: 'image', source: 'flamengo.png', duration: 4 },
      { type: 'image', source: 'input.png', duration: 4 },
      { type: 'image', source: 'flamengo.png', duration: 6 },
    ],
    audio: [
      { source: 'audio2.mp3', role: 'background', start: 0, duration: 8 },
      { source: 'audio.mp3', role: 'focus', start: 8, duration: 6 },
    ],
  },
  assets: {
    'flamengo.png': '/path/flamengo.png',
    'input.png': '/path/input.png',
    'audio.mp3': '/path/audio.mp3',
    'audio2.mp3': '/path/audio2.mp3',
  },
  output: '/path/output.mp4',
})
```

`source` also accepts `{ type: "file" }`, `{ type: "asset", id }`, or `{ type: "url" }`. After `SourceResolver`, FFmpeg receives a local path — `RenderPlan` does not know about URLs or asset ids. See [docs/assets.md](docs/assets.md) and [docs/api.md](docs/api.md).

### Scenes

- `type`: `image` or `video`
- `source`, `duration` (scene duration on the global timeline)
- `mediaStart?`: `video` only; offset in the file. Default `0`
- `shortMedia?`: `video` only; `error` (default), `loop`, or `freeze` when the media does not fill the scene
- `audio?`: extra scene audio (`start` relative to the scene)
- `keepAudio?`: `video` only; keeps the file's original track (scene timeline, not `mediaStart`)

### Extra audio

- global (`audio` at the root, absolute `start`) or per scene
- `role`: `background` (vol. 0.3) or `focus` (vol. 1.0)
- optional `volume` overrides the `role`

### Texts and overlays

Optional, with an absolute `start` on the timeline. `x`/`y` or `position` is the box reference point. `style.align` / `style.verticalAlign` decide which edge sits on that point. `box.width` triggers wrapping in Node. See `compositions/text-basic.json`, `text-full.json`, `texts.json`.

Examples with a video scene: `compositions/video-photos.json`, `video-and-photos.json`, `video-timeline.json`.

### `example.json` timeline

```text
0s ──────── 4s ──────── 8s ────────────── 14s
│ flamengo  │  input   │    flamengo     │
│         audio2 (bg)  │   audio (focus) │
└───────────┴──────────┴─────────────────┘
```

---

## How RenderPlan becomes FFmpeg

`RenderPlan` does not contain `-filter_complex` or `drawtext`. That lives in the builder.

### 1. Scene inputs

Image:

```bash
-loop 1 -t 4 -i /path/flamengo.png
```

Video (no offset):

```bash
-t 8 -i /path/gloria-eterna.mp4
```

Video with `mediaStart` / `shortMedia`:

```bash
-ss 20 -t 5 -i /path/gloria-eterna.mp4          # trim
-ss 164 -t 1.837 -i /path/gloria-eterna.mp4     # loop: reads the available segment; split+concat in the filter
-ss 164 -t 6 -i /path/gloria-eterna.mp4         # freeze (tpad in the filter)
```

After the seek, the filter zeros PTS (`setpts=PTS-STARTPTS`) so the scene starts at `t = 0`. Animation and transition use the scene duration, not the file clock.

### 2. Transform, normalize, apply effects, and concatenate video

Without `transform` (or with `crop` only), each scene enters the canvas like this:

```text
[0:v]crop=…,   # only if there is a crop
     scale=1920:1080:force_original_aspect_ratio=decrease,
     pad=1920:1080:(ow-iw)/2:(oh-ih)/2,
     setsar=1,fps=25,format=yuv420p[v0]
```

With `scale` / `zoom` / `x` / `y` / `pan`, `pad` becomes an overlay on a black canvas — the final frame stays 1920×1080, `yuv420p`, same FPS and SAR 1, so `xfade` receives compatible streams.

Static values (`scale: 1.2`) become constants in the filter. Animated values (`scale: { from, to }`) become FFmpeg `t` expressions. Without `easing`, the curve is `linear`. With `ease-in` / `ease-out` / `ease-in-out`, `VideoFilter` translates the curve to `pow` / `if` in the expression; Node does not generate one frame per instant. The content goes through `setpts=PTS-STARTPTS` before those expressions, so `t = 0` is the first frame.

`effects` enter after the canvas (`format=yuv420p`) and before the transition. `EffectFilter` emits only filters for non-default values, in this order:

```text
opacity (lutyuv → black canvas)
 → brightness / contrast / saturation (`eq`)
 → grayscale / sepia (`format=gbrp` + `colorchannelmixer` + `format=yuv420p`)
 → blur (`boxblur`)
```

JSON key order does not change the graph. `effects: {}` adds no filter. Independent text and overlays do not go through this chain.

```text
input → mediaStart/trim → shortMedia (loop/freeze/error) → crop → canvas fit → scale/zoom → position/pan → easing → effects → transition
```

`x`/`y` (and `pan`) are offsets from the center, in canvas pixels.

```text
[v0][v1][v2]concat=n=3:v=1:a=0[vout]
```

If there is an overlay or text, concat exits as `[vbase]` and the following layers end as `[vout]`. Scene transforms **do not** apply to text or overlays.

### 3. Audio

Each audio-track item becomes `-i` + `atrim` / `adelay` / `volume` / `apad`. Multiple items go into `amix`. With no audio, the builder uses `anullsrc`.

`keepAudio: true` puts the MP4's own track on the audio track at the scene's **visual** start (with overlap on crossfade). Audio declared in `scenes[].audio` uses the same visual start. `video.mediaStart` does not delay that audio.

### 4. Overlays and texts

Overlays: `scale` + `overlay` with `enable='between(t,start,end)'`.

Texts: `TextRenderer` normalizes lines (wrap in Node). With `drawtext`, `TextFilter` emits `fontsize`, `x`/`y` from the reference point, `line_spacing`, `borderw`, `shadowx`/`shadowy`, `box`/`boxcolor`/`boxborderw`. Without `drawtext`, the same `TextItem` becomes a PNG via Swift.

### 5. Export

```bash
-map "[vout]" -map "[aout]"
-c:v libx264 -c:a aac
-t TOTAL -pix_fmt yuv420p
/path/output.mp4
```

---

## Diagram

```text
render({ composition, assets, output })
 ↓
CompositionParser
 ↓
Renderer.prepare
  SourceResolver → local path
  MediaResolver  → already-resolved path
 ↓
RenderPlan (tracks)
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
texts               ─► Text Track ─► drawtext or PNG overlay ───────────────────────────────────┘
audio / keepAudio   ─► Audio Track ─► atrim/adelay/amix ────────────────────────────────────────► [aout]
```

---

## How to use it

```ts
import { render } from '@caiorafael/patchwork'

await render({
  composition,
  assets,
  output: './output/video.mp4',
})
```

Install: `pnpm add @caiorafael/patchwork`. The npm package ships the build in `dist/`.

Composition examples live in `compositions/`. `source` strings in those files are asset ids. Transitions (`fade` / `crossfade`) are declared on the destination scene. Transforms (`scale`, `position`, `crop`, `zoom`, `pan`) belong to the scene media and can be static or animated (`from`/`to`, with optional `easing`). Effects (`opacity`, `brightness`, `contrast`, `saturation`, `grayscale`, `sepia`, `blur`) are static and enter after the transform. See [README](README.md#transforms), [README](README.md#effects), and [docs/api.md](docs/api.md).
