# Public API

**English** | [Português](pt-BR/api.md)

Install the published package:

```bash
pnpm add @caiorafael/patchwork
```

Patchwork exposes a small surface. The consuming app builds a `Composition` and calls `render`.

```ts
import { render, parseComposition } from '@caiorafael/patchwork'
```

This package has no CLI, HTTP server, templates, or factory.

## `render`

```ts
const result = await render({
  composition,
  assets: {
    background: './assets/background.png',
    music: './assets/music.mp3',
  },
  output: './output/video.mp4',
})
```

| Field | Type | Required | Description |
|---|---|---|---|
| `composition` | `unknown` | yes | In-memory composition JSON object. Not a file path. |
| `assets` | `Record<string, string>` | no | Logical id → disk path map. |
| `output` | `string` or `{ path: string }` | yes | Final MP4 path. |
| `fonts` | `string` | no | Extra font directory (in addition to system fonts and package fonts). |
| `signal` | `AbortSignal` | no | Cancels the render. See [cancellation.md](cancellation.md). |
| `onProgress` | `(progress) => void` | no | Render progress. See [progress.md](progress.md). |

The parser validates `composition` internally. Invalid JSON or a composition with no scenes throws before FFmpeg runs.

`output` on the API **replaces** the composition `output` field. The parser default `output.mp4` only applies when the API is not used.

## Result

```ts
interface RenderOutputResult {
  outputPath: string
  duration: number
  metrics: RenderMetrics
}
```

| Field | Source |
|---|---|
| `outputPath` | absolute MP4 path |
| `duration` | visual video duration, in seconds (`metrics.videoDuration`) |
| `metrics` | timings, counts, and size already measured by the renderer |

`metrics` includes `renderFactor`, `renderDurationMs`, `outputSizeBytes`, `sceneCount`, `audioCount`, `textCount`, `overlayCount`, `transitionCount`, `effectCount`, and per-phase timings. On failure the function **throws**; it does not return a status.

## `parseComposition`

Validates and applies defaults without rendering.

```ts
const composition = parseComposition({
  scenes: [{ type: 'image', source: 'background', duration: 4 }],
})

composition.width // 1920
composition.output // 'output.mp4'
```

Equivalent to `new CompositionParser().parse(raw)`. Use this when the app needs to inspect the composition before calling `render`.

## Exported types

Besides `render` and `parseComposition`, the package exports `CompositionParser` and the domain types: `Composition`, `Scene`, `AudioClip`, `TextClip`, `OverlayClip`, `Source`, `Transform`, `VideoEffects`, `Transition`, `RenderInput`, `RenderOutputResult`, `RenderProgress`, `RenderMetrics`.

Consumers do not need to import FFmpeg, filters, `Renderer`, or temporary files.
