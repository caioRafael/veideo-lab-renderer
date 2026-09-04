# Performance

Indicador principal:

```text
renderFactor = renderTimeSeconds / videoDurationSeconds
```

Menor é melhor. Medido com `performance.now()`.

## Como medir

```bash
pnpm render compositions/example.json --verbose
pnpm benchmark
```

`--verbose` mostra cenas, duração, factor, tamanho do output e tempo por fase.

O benchmark grava `docs/benchmark-results.json`.

## Baseline (antes da otimização de rasterize)

Máquina local, FFmpeg 9, 1920×1080, 25 fps, libx264.

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

Perfil típico (1 cena, sem texto): FFmpeg ≈ 99% do tempo.

`many-texts` (8 textos, fallback PNG):

```text
ANTES (rasterize sequencial)
  Preparing / Swift:  8.53s
  FFmpeg:            32.21s
  Total:             40.74s  (5.09x)

DEPOIS (até 4 processos Swift em paralelo)
  Preparing / Swift:  4.92s
  FFmpeg:            36.25s   (variação de encode)
  Total:             41.19s
```

A rasterização ficou ~42% mais rápida. O encode/overlays do FFmpeg continua dominando essa carga (~80%+).

## Bounding box de texto (Fase 11)

O fallback PNG passou a gerar só a área do texto (padding, stroke e shadow inclusos). Overlay reposiciona o PNG.

`many-texts` na mesma máquina, depois da mudança:

```text
Preparing / Swift:  1.84s
FFmpeg:             1.60s
Total:              1.61s  (0.20x)
```

ANTES (PNG 1920×1080): 40.74s / 5.09x.
O custo do overlay full-frame era o gargalo real.

## Gargalos

1. **FFmpeg encode** — custo principal em cenas sem muitos textos.
2. **Fallback de texto** — ainda usa Swift + PNG, agora no bounding box.
3. **Effects / animated scale** — um pouco mais caros que pad simples, ainda no FFmpeg.

## O que não foi feito

- cache, workers persistentes, mudança de `-preset` do x264
- juntar filtros `eq` (ganho irrelevante frente ao encode)

## Memória

O executor não acumula stdout/stderr. Mantém no máximo ~16 KB de stderr para a mensagem de erro. Mídia não é carregada no Node.

## Concorrência

Cada render tem o próprio `RenderContext`. Rasterização de texto usa no máximo 4 processos Swift por render.

A Video Factory limita FFmpeg simultâneos com `--concurrency`. Batch de 3 YouTube Shorts (8s, 1080×1920):

```text
concurrency=1    wall 7.75s
concurrency=2    wall 6.99s
concurrency=4    wall 7.56s
```

Mais concorrência não foi automaticamente mais rápido neste lote curto.
