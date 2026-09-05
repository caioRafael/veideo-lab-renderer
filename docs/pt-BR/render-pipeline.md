# Render pipeline

[English](../render-pipeline.md) | **Português**

O Patchwork orquestra o FFmpeg. O Node não processa frames.

```text
render({ composition, assets, output })
    ↓
CompositionParser
    ↓
Renderer.prepare
    ├── SourceResolver → arquivo local (file / asset / url)
    ├── MediaResolver  → path já resolvido
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

A API pública (`render`, pacote npm `@caiorafael/patchwork`) é o único fluxo de entrada. Ela parseia o objeto, aplica `output` e `assets`, e chama o mesmo `Renderer` interno.

## Ciclo de vida

1. **parse** — `CompositionParser` valida o objeto em memória e aplica defaults.
2. **planning** — `SourceResolver` materializa `file` / `asset` / `url`; `buildRenderPlan` monta tracks.
3. **preparing** — probe de duração, rasterização de texto (se não houver `drawtext`), comando FFmpeg.
4. **rendering** — `spawn` do FFmpeg. O arquivo é escrito em `name.tmp.mp4` (extensão `.mp4` para o muxer).
5. **finalizing** — rename atômico para o caminho final.
6. **completed** / **cancelled** / **failed** — cleanup do `RenderContext`.

Por baixo, `prepare` e `runPrepared` continuam separados. A API pública executa os dois.

## RenderContext

Cada render ganha um diretório isolado:

```text
/tmp/patchwork-render-XXXXXX/
  text/
  intermediate/
  downloads/          # arquivos baixados de source.type = url
```

Dois renders podem rodar ao mesmo tempo sem colidir. Um mesmo `Renderer` trata um render por vez. A aplicação que quiser lote cria essa concorrência do lado de fora.

## Temporary files

Textos rasterizados (fallback PNG) vão para `context.textDir`. Downloads de URL vão para `context.downloadsDir`. Sucesso, erro e cancelamento chamam `disposeRenderContext` e apagam o diretório inteiro.

## FFmpeg

- `spawn` com argumentos em array
- stdin ignorado
- stderr limitado (~16 KB) para erros
- progresso lido de linhas `time=` / `fps=` / `speed=`
- `AbortSignal` envia SIGTERM e, se preciso, SIGKILL
- exit code ≠ 0 vira `FfmpegProcessError` com stderr

## Output

O caminho final vem de `render({ output })`. O MP4 só aparece depois do exit 0. Um render interrompido não deixa o arquivo de saída pela metade; o staging `.tmp` é apagado.
