# Benchmark baseline — Fase 9

Primeira medição completa, rasterize de texto ainda sequencial.

```text
Benchmark                 Duration    Render    Factor  Scenes
------------------------------------------------------
1-scene                      4.00s     0.80s     0.20x       1
5-scenes                    10.00s     1.69s     0.17x       5
10-scenes                   15.00s     2.70s     0.18x      10
20-scenes                   20.00s     3.66s     0.18x      20
50-scenes                   25.00s     6.30s     0.25x      50
many-images                 12.00s     1.77s     0.15x       8
many-texts                   8.00s    40.74s     5.09x       1
effects                      5.00s     3.34s     0.67x       1
transitions                 11.00s     2.88s     0.26x       3
animated                     6.00s     3.23s     0.54x       1
full                        11.00s    10.28s     0.93x       3
```

Ver [performance.md](performance.md) para a comparação depois do rasterize paralelo.
