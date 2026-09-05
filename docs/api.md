# API pública

Instale o pacote publicado:

```bash
pnpm add @caiorafael/patchwork
```

O Patchwork expõe uma superfície pequena. A aplicação consumidora constrói a `Composition` e chama `render`.

```ts
import { render, parseComposition } from '@caiorafael/patchwork'
```

Não há CLI, HTTP, templates nem factory neste pacote.

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

| Campo | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `composition` | `unknown` | sim | Objeto JSON da composição, já em memória. Não é um caminho de arquivo. |
| `assets` | `Record<string, string>` | não | Mapa de id lógico → caminho no disco. |
| `output` | `string` ou `{ path: string }` | sim | Caminho do MP4 final. |
| `fonts` | `string` | não | Diretório extra de fontes (além do sistema e das fontes do pacote). |
| `signal` | `AbortSignal` | não | Cancela o render. Ver [cancellation.md](cancellation.md). |
| `onProgress` | `(progress) => void` | não | Progresso do render. Ver [progress.md](progress.md). |

O parser valida `composition` internamente. JSON inválido ou composition sem cenas lança antes do FFmpeg.

`output` na API **substitui** o campo `output` da composition. O default `output.mp4` do parser só existe se a API não for usada.

## Resultado

```ts
interface RenderOutputResult {
  outputPath: string
  duration: number
  metrics: RenderMetrics
}
```

| Campo | Origem |
|---|---|
| `outputPath` | caminho absoluto do MP4 |
| `duration` | duração visual do vídeo, em segundos (`metrics.videoDuration`) |
| `metrics` | tempos, contagens e tamanho já medidos pelo renderer |

`metrics` inclui `renderFactor`, `renderDurationMs`, `outputSizeBytes`, `sceneCount`, `audioCount`, `textCount`, `overlayCount`, `transitionCount`, `effectCount` e tempos por fase. Em falha a função **lança**; não devolve status.

## `parseComposition`

Valida e aplica defaults sem renderizar.

```ts
const composition = parseComposition({
  scenes: [{ type: 'image', source: 'background', duration: 4 }],
})

composition.width // 1920
composition.output // 'output.mp4'
```

Equivale a `new CompositionParser().parse(raw)`. Use quando a aplicação precisa inspecionar a composition antes de chamar `render`.

## Types exportados

Além de `render` e `parseComposition`, o pacote exporta `CompositionParser` e os tipos de domínio: `Composition`, `Scene`, `AudioClip`, `TextClip`, `OverlayClip`, `Source`, `Transform`, `VideoEffects`, `Transition`, `RenderInput`, `RenderOutputResult`, `RenderProgress`, `RenderMetrics`.

O consumidor não precisa importar FFmpeg, filtros, `Renderer` nem arquivos temporários.
