# Patchwork

**English** | [Português](README.pt-BR.md)

[![npm version](https://img.shields.io/npm/v/@caiorafael/patchwork.svg)](https://www.npmjs.com/package/@caiorafael/patchwork)
[![CI](https://github.com/caioRafael/veideo-lab-renderer/actions/workflows/ci.yml/badge.svg)](https://github.com/caioRafael/veideo-lab-renderer/actions/workflows/ci.yml)

Node.js/TypeScript library for **composing and rendering videos** with FFmpeg.

The consuming app builds a `Composition` in memory and passes the assets. Patchwork parses, validates, builds the pipeline, and writes the MP4. It does not know about CLI, HTTP, templates, factory, editor, or a database.

```text
External application
       │
       │ Composition + Assets
       ▼
┌─────────────────────┐
│      PATCHWORK      │
│ Composition Engine  │
│ Render Engine       │
└──────────┬──────────┘
           ▼
         FFmpeg
           ▼
      Final video
```

## Requirements

- Node.js 20+
- FFmpeg on PATH
- For native `drawtext`: FFmpeg built with libfreetype. Without it, the engine rasterizes text to PNG and applies it as an overlay.

## Installation

```bash
pnpm add @caiorafael/patchwork
```

`npm install @caiorafael/patchwork` also works.

FFmpeg is a **system** dependency, not a package dependency:

```bash
brew install ffmpeg
```

Local development of this repository:

```bash
pnpm install
pnpm build
```

The published package exposes `dist/`. Consuming via `file:` (playground) needs `pnpm build` in this repo. Publishing to npm: [docs/publishing.md](docs/publishing.md).

Full API contract: [docs/api.md](docs/api.md).

## Usage

```ts
import { render } from '@caiorafael/patchwork'

const result = await render({
  composition: {
    width: 1920,
    height: 1080,
    fps: 25,
    scenes: [
      { type: 'image', source: 'background', duration: 4 },
      { type: 'image', source: 'cover', duration: 4 },
    ],
    audio: [
      { source: 'music', role: 'background', start: 0, duration: 8 },
    ],
  },
  assets: {
    background: './assets/background.png',
    cover: './assets/cover.png',
    music: './assets/music.mp3',
  },
  output: './output/video.mp4',
})

console.log(result.outputPath, result.duration)
```

`composition` is the composition JSON object — not a file. `assets` maps logical ids to disk paths. `output` is the MP4 path (`string` or `{ path }`).

Optional: `fonts`, `signal` (`AbortSignal`), and `onProgress`.

```ts
import { parseComposition } from '@caiorafael/patchwork'

const composition = parseComposition(rawObject)
```

The result includes `outputPath`, `duration`, and `metrics` (time, render factor, size, counts). On error, `render` throws.

Contract, types, and defaults: [docs/api.md](docs/api.md). Sources: [docs/assets.md](docs/assets.md).

## Lint and tests

```bash
pnpm lint
pnpm lint:fix
pnpm test
pnpm test:render
pnpm typecheck
pnpm build
```

`pnpm test` is the unit suite (FFmpeg mocked). `pnpm test:render` generates two fixture images and renders a real MP4 at `tmp/smoke/video.mp4` — requires `ffmpeg` on PATH.

The project uses ESLint with `@rocketseat/eslint-config/node` (includes Prettier). Unit tests use Node's native runner (`node:test`) via `tsx`.

## Composition JSON

Minimal example:

```json
{
  "width": 1920,
  "height": 1080,
  "fps": 25,
  "scenes": [
    { "type": "image", "source": "background", "duration": 4 },
    { "type": "image", "source": "cover", "duration": 4 }
  ],
  "audio": [
    {
      "source": "music",
      "role": "background",
      "start": 0,
      "duration": 8
    }
  ]
}
```

### Sources

The `source` field (scenes, audio, and overlays) accepts a **string** or an **object**.

| `source` | Origin | What happens |
|---|---|---|
| `"background"` | `assets` map | resolves `assets.background` to a local path |
| `{ "type": "asset", "id": "background" }` | `assets` map | the same, explicit |
| `{ "type": "file", "path": "/…" }` | local file | uses the file in place; does not copy |
| `{ "type": "url", "url": "https://…" }` | HTTP/HTTPS | downloads into the render temp dir and deletes it afterwards |

A string that is not in `assets` and is not an absolute path fails. The core does not look in repository `input/` folders. Fonts come from the system, from the package `assets/fonts`, or from the directory passed in `fonts`. The MP4 path comes from `output` on the API.

Details: [docs/assets.md](docs/assets.md).

Defaults applied by the parser when the field is missing from the JSON:

| Field | Default |
|---|---|
| `output` | `output.mp4` (the `render({ output })` API replaces this value) |
| `width` | `1920` (even integer) |
| `height` | `1080` (even integer) |
| `fps` | `25` |
| `texts[].start` | `0` |
| `texts[].x` / `y` | `center` |
| `texts[].fontSize` | `48` |
| `texts[].color` | `#FFFFFF` |

### Scenes

| Field | Description |
|---|---|
| `type` | `image` or `video` |
| `source` | id in `assets`, absolute path, or `file` / `asset` / `url` object |
| `duration` | scene duration on the global timeline, in seconds |
| `mediaStart` | (video) offset in the source file, in seconds. Default `0`. Invalid on `image` |
| `shortMedia` | (video) what to do if available media is shorter than the scene: `error` (default), `loop`, or `freeze`. Invalid on `image` |
| `audio` | (optional) extra scene audio |
| `keepAudio` | (video) keeps the file's original audio |
| `transition` | transition **from the previous scene** (`fade` or `crossfade`) |
| `transform` | visual transform of the scene media (static or animated) |
| `effects` | static visual effects on the scene media (`opacity`, `brightness`, `contrast`, `saturation`, `grayscale`, `sepia`, `blur`) |

The scene position in the composition (`scenePlacements`) is independent of the file read point:

```text
Composition timeline  ≠  Media timeline
```

```json
{
  "type": "video",
  "source": "clip",
  "duration": 5,
  "mediaStart": 20
}
```

The scene occupies 5s on the global timeline and reads `media[20s → 25s)`. `mediaStart` does not move the scene, does not change the composition total, and does not change animation or transition timing.

If remaining media is shorter than `duration`:

| `shortMedia` | Behavior |
|---|---|
| `error` (default) | the engine rejects before FFmpeg, with source, mediaStart, requested and available duration |
| `loop` | the `[mediaStart, EOF)` segment repeats **inside** the scene |
| `freeze` | the last frame holds until the end of the scene |

An older composition without these fields still means `mediaStart = 0` and `shortMedia = error`. `keepAudio` and scene audio follow the scene timeline; `mediaStart` does not delay audio.

### Transforms

`transform` describes the visual intent of the scene media. It does not affect audio, text, or overlays. `crop` is always static. `scale`, `zoom`, `x`/`y`, and `pan` accept a number (static) or `{ from, to }` (animation over the scene duration). Optional `easing` only changes the progression from `from` to `to`. Without `easing`, interpolation is `linear`. There are no keyframes.

Static:

```json
{
  "transform": {
    "scale": 1.2,
    "x": 100,
    "y": 50
  }
}
```

Animated (Ken Burns):

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

The animation starts at `from`, ends at `to`, and occupies the scene duration. `t` is clamped to `[0, duration]`. Then easing remaps that normalized `t`:

| `easing` | Curve | Behavior |
|---|---|---|
| `linear` (default) | `t` | constant speed |
| `ease-in` | `t²` | starts slow, ends fast |
| `ease-out` | `1 - (1 - t)²` | starts fast, ends slow |
| `ease-in-out` | piecewise quadratic | slow → fast → slow |

Each animated field has its own curve. `x` and `y` are independent. On `pan` `{ from, to }`, one `easing` applies to both axes.

```text
value(t) = from + (to - from) * easing(t_norm)
```

| Field | Semantics |
|---|---|
| `scale` | size multiplier. `1` = size after canvas fit. Number or `{ from, to, easing? }` (`from`/`to` > 0) |
| `zoom` | the same multiplier as `scale`. If both exist: `scale(t) * zoom(t)` at each instant |
| `x` / `y` | offset in pixels **from the canvas center**. Number or `{ from, to, easing? }`. `x > 0` right, `y > 0` down |
| `pan` | the same offset as `x`/`y`. Static: `{ x, y }`. Animated: `{ from: { x, y }, to: { x, y }, easing? }`. If it coexists with `x`/`y`, the values **add** |
| `crop` | **static** crop in pixels of the source media |

`zoom` ≡ `scale` and `pan` ≡ `x`/`y`. Interpolation of `scale * zoom` is the product of the two curves, not a lerp of the product. `position + pan` add after each one applies its own easing.

Applied order:

```text
input
 ↓
crop          (static; media pixels)
 ↓
canvas fit
 ↓
scale / zoom  (static or animated)
 ↓
position / pan  (static or animated; overlay on the canvas)
 ↓
setsar + fps + format=yuv420p
 ↓
effects      (static; scene media only)
 ↓
transition
```

Static examples: `compositions/transform-scale.json`, `transform-position.json`, `transform-crop.json`, `transform-combined.json`, `transform-video.json`, `transform-with-crossfade.json`.

Animated examples: `compositions/animated-scale.json`, `animated-pan.json`, `animated-position.json`, `animated-zoom.json`, `ken-burns.json`, `animated-video.json`, `animated-with-crossfade.json`, `animated-with-fade.json`.

Easing examples: `compositions/easing-linear.json`, `easing-in.json`, `easing-out.json`, `easing-in-out.json`, `easing-ken-burns.json`.

### Effects

`effects` describes **static** visual adjustments of the scene media. It does not affect audio, text, or independent overlays. There is no `from`/`to`, keyframes, or easing in this phase. JSON key order is ignored.

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

Without `effects`, or with `effects: {}`, behavior matches the previous version. Defaults do not emit a filter.

| Field | Default | Range | Semantics |
|---|---|---|---|
| `opacity` | `1` | `[0, 1]` | `1` = opaque. `0` = transparent (mixes the scene with the black canvas) |
| `brightness` | `0` | `[-1, 1]` | `0` = original. `> 0` brighter. `< 0` darker |
| `contrast` | `1` | `[0, 4]` | `1` = original. `> 1` more contrast. `0` flattened image |
| `saturation` | `1` | `[0, 3]` | `1` = original. `0` = gray. `> 1` more saturated |
| `grayscale` | `0` | `[0, 1]` | `0` = original. `1` = Rec.601 gray. `0.5` = 50% |
| `sepia` | `0` | `[0, 1]` | `0` = original. `1` = full simple-matrix sepia |
| `blur` | `0` | `[0, 64]` | radius in pixels (`boxblur`, one pass) |

Unknown effects (`vignette`, `glow`, …) are rejected. Animated values (`{ from, to }`), `NaN`, `Infinity`, strings, and invalid objects are rejected too.

Canonical order (independent of JSON):

```text
opacity → brightness → contrast → saturation → grayscale → sepia → blur
```

Effects enter **after** crop / fit / transform and **before** the transition. Each scene reaches `fade`/`crossfade` already with its own effects. `mediaStart`, `shortMedia`, `scenePlacements`, and animation duration do not change.

The parser validates. RenderPlan stores the intent (`VideoItem.effects`). `EffectFilter` translates it to FFmpeg.

Examples: `compositions/effect-opacity.json`, `effect-brightness.json`, `effect-contrast.json`, `effect-saturation.json`, `effect-grayscale.json`, `effect-sepia.json`, `effect-blur.json`, `effects-combined.json`, `effects-transform.json`, `effects-crossfade.json`, `effects-media-timing.json`.

### Audio

Audio can be **global** (`audio` at the root) or **per scene** (`scenes[].audio`).

| Field | Description |
|---|---|
| `source` | id in `assets`, absolute path, or `file` / `asset` / `url` object |
| `role` | `background` (vol. 0.3) or `focus` (vol. 1.0) |
| `start` | start on the timeline (absolute when global; relative to the scene **visual start** when local, including crossfade overlap) |
| `duration` | (optional) clip duration |
| `volume` | (optional) overrides the `role` volume |

### Texts and overlays

Texts and overlays enter `RenderPlan` as their own tracks and are drawn into the MP4. Timing (`start` / `duration`) is absolute on the composition timeline — it does not follow `mediaStart` or transitions.

The older JSON remains valid:

```json
{
  "texts": [
    {
      "content": "Patchwork",
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

New fields are optional. `style` and `position` are aliases that the parser flattens onto the clip fields:

```json
{
  "content": "Line 1\nLine 2",
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

`x` / `y` (or `position`) are the **text-box reference point**, not necessarily the top-left corner.

| `align` | The box sits on this point on X |
|---|---|
| `left` (default if `x` is a number) | left edge |
| `center` (default if `x` is `"center"`) | center |
| `right` | right edge |

| `verticalAlign` | The box sits on this point on Y |
|---|---|
| `top` (default if `y` is a number) | top |
| `middle` (default if `y` is `"center"`) | middle |
| `bottom` | bottom |

`lineSpacing` is a **multiplier** of line height (`fontSize × lineSpacing`). Default `1` preserves older text. `box.width` is the max width; wrapping is done in Node, deterministically, before FFmpeg. `\\n` in `content` becomes an explicit break. The background wraps the real text (+ padding), not the canvas.

Without `drawtext` in FFmpeg, `Renderer` rasterizes each text to PNG (Swift) with the same styles and treats it as an overlay.

| Field | Description |
|---|---|
| `overlays[].source` | id in `assets`, absolute path, or `file` / `asset` / `url` object |
| `overlays[].start` / `duration` | absolute position on the timeline |
| `overlays[].x` / `y` / `width` / `height` | overlay box |

Layers, bottom to top: video → image overlays → text.

### Transitions

The transition is declared on the **destination scene** and describes the cut between the previous scene and this one.

```json
{
  "scenes": [
    { "type": "image", "source": "scene-a", "duration": 5 },
    {
      "type": "image",
      "source": "scene-b",
      "duration": 5,
      "transition": { "type": "crossfade", "duration": 1 }
    }
  ]
}
```

- `fade` — the previous scene fades to black and the next one fades in from black (`A → black → B`). Scenes do not overlap; total duration stays the sum of the scenes.
- `crossfade` — the two scenes mix. With 5s + 5s and a 1s crossfade, the MP4 lasts **9s** (`B.start = 4`).

| JSON | Semantics | Final duration (5s + 5s, T=1s) | FFmpeg |
|---|---|---|---|
| `fade` | A → black → B | 10s | `fade=t=out` + `fade=t=in` + `concat` |
| `crossfade` | mix A and B | 9s | `settb=AVTB` + `xfade` |

The first scene cannot have `transition`. Duration must be **strictly smaller** than both adjacent scenes. Only the Video Track is affected; text and overlays follow their own absolute timeline. Scene audio and `keepAudio` use the scene **visual start** (on crossfade, they enter during the overlap).

Translation to filters happens only in `FfmpegCommandBuilder`. RenderPlan stores `incomingTransition` (`type` + `duration`), with no FFmpeg syntax. Filter graph details: [ffmpeg-guide.md](ffmpeg-guide.md).

### Ready-made examples

Files in `compositions/` are the composition schema. `source` strings (`"flamengo.png"`, `"audio.mp3"`, …) are **asset ids**. To render one of them, pass the parsed object and an `assets` map with the real path for each id.

- `compositions/example.json` — global audio on the timeline
- `compositions/scenes-with-audio.json` — audio inside each scene
- `compositions/background-and-scene-audio.json` — global background + scene focus
- `compositions/texts.json` — titles and captions on scenes
- `compositions/overlay.json` — overlaid image in different positions
- `compositions/text-and-overlay.json` — text + overlay together
- `compositions/full-timeline.json` — scenes, audio, text, and overlay
- `compositions/video-and-photos.json` — photo, video clip, and photo, with audio and texts
- `compositions/video-timeline.json` — video, photos, global/scene audio, text, and overlay
- `compositions/video-photos.json` — photos and video, with the clip's original audio
- `compositions/fade.json` — photo → black → photo
- `compositions/crossfade.json` — 1s dissolve between two photos
- `compositions/crossfade-image-video.json` — photo → video clip
- `compositions/transform-scale.json` — enlarged photo (scale 1.4)
- `compositions/transform-position.json` — photo offset on the canvas
- `compositions/transform-crop.json` — crop of the source media
- `compositions/transform-combined.json` — crop + scale + position
- `compositions/transform-video.json` — clip with crop, scale, pan, and original audio
- `compositions/transform-with-crossfade.json` — transform + crossfade
- `compositions/animated-scale.json` — scale 1 → 1.2
- `compositions/animated-pan.json` — pan left to right
- `compositions/animated-position.json` — animated x/y
- `compositions/animated-zoom.json` — zoom 1 → 1.2
- `compositions/ken-burns.json` — simultaneous scale + pan, with audio
- `compositions/animated-video.json` — clip with animated scale/pan
- `compositions/animated-with-crossfade.json` — animated transform + crossfade
- `compositions/animated-with-fade.json` — animated transform + fade
- `compositions/easing-linear.json` — scale 1 → 1.5, constant speed
- `compositions/easing-in.json` — scale 1 → 1.5, starts slow
- `compositions/easing-out.json` — scale 1 → 1.5, ends slow
- `compositions/easing-in-out.json` — scale 1 → 1.5, acceleration in the middle
- `compositions/easing-ken-burns.json` — scale ease-in-out + pan ease-out
- `compositions/media-trim.json` — reads 5s from `mediaStart: 20`
- `compositions/media-offset.json` — starts the file at 45s
- `compositions/media-loop.json` — short media repeated inside the scene
- `compositions/media-freeze.json` — last frame until the end of the scene
- `compositions/media-trim-crossfade.json` — `mediaStart` on B without moving the crossfade
- `compositions/media-trim-animated.json` — trim + animated scale/x over the scene duration
- `compositions/text-basic.json` — older text (x/y/fontSize)
- `compositions/text-multiline.json` — explicit line breaks
- `compositions/text-wrapping.json` — `box.width` with automatic wrap
- `compositions/text-alignment.json` — left/center/right and top/middle/bottom
- `compositions/text-background.json` — background + padding
- `compositions/text-stroke.json` — stroke
- `compositions/text-shadow.json` — shadow (no blur)
- `compositions/text-styled.json` — `style` + `position`
- `compositions/text-multiple.json` — title, subtitle, caption, and watermark
- `compositions/text-full.json` — wrap, alignment, background, stroke, and shadow
- `compositions/effect-opacity.json` — opacity 0.6 (mixes with the black canvas)
- `compositions/effect-brightness.json` — brighter scene
- `compositions/effect-contrast.json` — contrast 1.4
- `compositions/effect-saturation.json` — reduced saturation
- `compositions/effect-grayscale.json` — full gray
- `compositions/effect-sepia.json` — sepia 0.85
- `compositions/effect-blur.json` — 4px blur
- `compositions/effects-combined.json` — all seven effects together
- `compositions/effects-transform.json` — animated scale/pan + brightness/contrast/saturation
- `compositions/effects-crossfade.json` — dark A + bright B, 1s crossfade (total 9s)
- `compositions/effects-media-timing.json` — mediaStart 30 + freeze + effects
- `compositions/joao-e-maria.json` — two assets + audio

## Known limitations

- There are no keyframes: each animated field has only `from` → `to` and one curve (`linear`, `ease-in`, `ease-out`, `ease-in-out`).
- The last animation frame lands at `t ≈ duration - 1/fps`, not exactly at `t = duration`. The FFmpeg expression reaches `to` when `t = duration`.
- `crop` is not checked against the real file resolution (probe reads duration only).
- `mediaStart` past EOF and `shortMedia: error` with short media are validated with `ffprobe` of the container duration. Without a readable duration, the render fails with a clear message.
- Image inputs use the `image2` demuxer default framerate (25). Compositions with a different `fps` depend on the `fps` filter during normalization.
- Visual fade does not insert an extra black segment: 5s + 5s with a 1s fade still lasts **10s**.
- Audio does not crossfade; on visual overlap, `keepAudio` and scene audio can mix in `amix`.
- `keepAudio` and scene audio do not inherit `mediaStart` from the video.
- Text shadow has no blur (`shadow.blur` only accepts `0`). Text background has no radius.
- PNG wrapping and bounding box use a per-character width estimate; the Swift drawing can be slightly narrower or wider than the box.
- Effects are static. `opacity` mixes the scene with the black canvas (YUV); it does not punch through the next scene outside `crossfade`.
- `grayscale` and `sepia` go through `format=gbrp` + `colorchannelmixer` and back to `yuv420p`.
- `url` sources accept only HTTP/HTTPS, download into the render temp dir, and delete afterwards.
- `file` sources do not copy the file; if the original disappears, the next render fails.
- A `source` string must exist in `assets` or be an absolute path.

## Architecture

```text
render({ composition, assets, output })
         ↓
CompositionParser
         ↓
Renderer.prepare
 ├── SourceResolver → local file (asset / file / url)
 └── MediaResolver  → already-resolved path
         ↓
RenderPlan → FfmpegCommandBuilder → FfmpegExecutor → FFmpeg
```

`RenderPlan` is a timeline of independent tracks:

```text
Video Track     sequential scenes (optional transform and effects); overlap only with crossfade
Audio Track     clips with an absolute start
Overlay Track   overlaid images
Text Track      drawtext (or rasterized PNG)
```

`Renderer` orchestrates the specialized pieces:

```text
Renderer
 ├── SourceResolver         (file / asset / url → local path)
 ├── MediaResolver          (absolute path or configured folder)
 ├── FontResolver
 ├── AudioTimeline
 ├── FfmpegCommandBuilder
 └── FfmpegExecutor
```

The text fallback (PNG on the bounding box) is chosen by `Renderer` when FFmpeg has no `drawtext`.

## Structure

```text
dist/                     # build published to npm (pnpm build)
scripts/                  # text fallback (Swift) without drawtext
examples/                 # local smoke render
src/
  index.ts                # public API
  api/                    # programmatic render()
  composition/            # parser and audio timeline
  source/                 # SourceResolver (file / asset / url)
  media/                  # file and font resolution
  renderer/               # orchestration, context, and metrics
  ffmpeg/                 # filters, command, and executor
  text/                   # wrapping and rasterization
  interfaces/             # domain types
```

## Documentation

- [docs/api.md](docs/api.md) — public API (`render`, `parseComposition`, result)
- [docs/assets.md](docs/assets.md) — sources (`file`, `asset`, `url`) and the `assets` map
- [docs/publishing.md](docs/publishing.md) — publish to npm from GitHub
- [docs/render-pipeline.md](docs/render-pipeline.md) — render lifecycle
- [docs/progress.md](docs/progress.md) — progress callback
- [docs/cancellation.md](docs/cancellation.md) — AbortSignal and cleanup
- [docs/performance.md](docs/performance.md) — render factor
- [flow-create-video.md](flow-create-video.md) — how JSON becomes an FFmpeg command
- [ffmpeg-guide.md](ffmpeg-guide.md) — flags, filters, and the filter graph
- [Portuguese documentation](README.pt-BR.md)
