# Performance

**English** | [Português](pt-BR/performance.md)

Main indicator:

```text
renderFactor = renderTimeSeconds / videoDurationSeconds
```

Lower is better. Measured with `performance.now()`.

## How to measure

`render()` returns `metrics.renderFactor`, `metrics.videoDuration`, and per-phase timings. Use those fields in the consuming app.

## Baseline (before the rasterize optimization)

Local machine, FFmpeg 9, 1920×1080, 25 fps, libx264.

```text
Benchmark                 Duration    Render    Factor
------------------------------------------------------
1-scene                      4.00s     0.80s     0.20x
5-scenes                    10.00s     1.69s     0.17x
10-scenes                   15.00s     2.70s     0.18x
20-scenes                   20.00s     3.66s     0.18x
50-scenes                   25.00s     6.30s     0.25x
many-images                 12.00s     1.77s     0.15x
many-texts                   8.00s    40.74s     5.09x
effects                      5.00s     3.34s     0.67x
transitions                 11.00s     2.88s     0.26x
animated                     6.00s     3.23s     0.54x
full                        11.00s    10.28s     0.93x
```

Typical profile (1 scene, no text): FFmpeg ≈ 99% of the time.

`many-texts` (8 texts, PNG fallback):

```text
BEFORE (sequential rasterize)
  Preparing / Swift:  8.53s
  FFmpeg:            32.21s
  Total:             40.74s  (5.09x)

AFTER (up to 4 Swift processes in parallel)
  Preparing / Swift:  4.92s
  FFmpeg:            36.25s   (encode variance)
  Total:             41.19s
```

Rasterization became ~42% faster. FFmpeg encode/overlays still dominate this workload (~80%+).

## Text bounding box (Phase 11)

The PNG fallback now generates only the text area (padding, stroke, and shadow included). Overlay repositions the PNG.

`many-texts` on the same machine, after the change:

```text
Preparing / Swift:  1.84s
FFmpeg:             1.60s
Total:              1.61s  (0.20x)
```

BEFORE (1920×1080 PNG): 40.74s / 5.09x.
Full-frame overlay cost was the real bottleneck.

## Bottlenecks

1. **FFmpeg encode** — main cost on scenes without many texts.
2. **Text fallback** — still uses Swift + PNG, now on the bounding box.
3. **Effects / animated scale** — a bit more expensive than a simple pad, still inside FFmpeg.

## What was not done

- cache, persistent workers, changing the x264 `-preset`
- merging `eq` filters (irrelevant gain versus encode)

## Memory

The executor does not accumulate stdout/stderr. It keeps at most ~16 KB of stderr for the error message. Media is not loaded into Node.

## Concurrency

Each render has its own `RenderContext`. Text rasterization uses at most 4 Swift processes per render.

The core renders **one** video per `render()` call. Batching and FFmpeg concurrency limits belong in the consuming app.
