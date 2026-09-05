# Render pipeline

**English** | [Português](pt-BR/render-pipeline.md)

Patchwork orchestrates FFmpeg. Node does not process frames.

```text
render({ composition, assets, output })
    ↓
CompositionParser
    ↓
Renderer.prepare
    ├── SourceResolver → local file (file / asset / url)
    ├── MediaResolver  → already-resolved path
    ↓
RenderPlan + RenderContext
    ↓
FfmpegCommandBuilder
    ↓
FfmpegExecutor (spawn)
    ↓
    name.tmp.mp4 → rename → name.mp4
    ↓
cleanup
```

The public API (`render`, npm package `@caiorafael/patchwork`) is the only entry point. It parses the object, applies `output` and `assets`, and calls the same internal `Renderer`.

## Lifecycle

1. **parse** — `CompositionParser` validates the in-memory object and applies defaults.
2. **planning** — `SourceResolver` materializes `file` / `asset` / `url`; `buildRenderPlan` builds tracks.
3. **preparing** — duration probe, text rasterization (if `drawtext` is missing), FFmpeg command.
4. **rendering** — FFmpeg `spawn`. The file is written to `name.tmp.mp4` (`.mp4` extension for the muxer).
5. **finalizing** — atomic rename to the final path.
6. **completed** / **cancelled** / **failed** — `RenderContext` cleanup.

Under the hood, `prepare` and `runPrepared` stay separate. The public API runs both.

## RenderContext

Each render gets an isolated directory:

```text
/tmp/patchwork-render-XXXXXX/
  text/
  intermediate/
  downloads/          # files downloaded from source.type = url
```

Two renders can run at the same time without colliding. A single `Renderer` handles one render at a time. An app that wants batches creates that concurrency outside the core.

## Temporary files

Rasterized texts (PNG fallback) go to `context.textDir`. URL downloads go to `context.downloadsDir`. Success, error, and cancellation call `disposeRenderContext` and delete the whole directory.

## FFmpeg

- `spawn` with arguments in an array
- stdin ignored
- stderr capped (~16 KB) for errors
- progress read from `time=` / `fps=` / `speed=` lines
- `AbortSignal` sends SIGTERM and, if needed, SIGKILL
- exit code ≠ 0 becomes `FfmpegProcessError` with stderr

## Output

The final path comes from `render({ output })`. The MP4 only appears after exit 0. An interrupted render does not leave a half-written output file; the staging `.tmp` is deleted.
