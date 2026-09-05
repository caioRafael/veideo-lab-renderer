import path from 'node:path'
import { CompositionParser } from '../composition/CompositionParser'
import type { Composition } from '../interfaces/composition'
import type { RenderOptions } from '../interfaces/render-runtime'
import { FontResolver } from '../media/FontResolver'
import { MediaResolver } from '../media/MediaResolver'
import { Renderer, type RendererOptions } from '../renderer/Renderer'
import { createSourceResolver } from '../source/createSourceResolver'
import type { RenderInput, RenderOutput, RenderOutputResult } from './types'

export interface RenderRuntime {
  executor?: RendererOptions['executor']
  mediaDurationProbe?: RendererOptions['mediaDurationProbe']
}

export async function render(
  input: RenderInput,
  runtime: RenderRuntime = {},
): Promise<RenderOutputResult> {
  const composition = parseComposition(input.composition)
  const outputPath = resolveOutputPath(input.output)
  const assets = input.assets ?? {}
  const renderer = createRenderer(input, outputPath, assets, runtime)

  const result = await renderer.render(
    {
      ...composition,
      output: outputPath,
    },
    renderOptions(input),
  )

  return {
    outputPath: result.outputPath,
    duration: result.metrics.videoDuration,
    metrics: result.metrics,
  }
}

export function parseComposition(value: unknown): Composition {
  return new CompositionParser().parse(value)
}

function createRenderer(
  input: RenderInput,
  outputPath: string,
  assets: Record<string, string>,
  runtime: RenderRuntime,
): Renderer {
  const rendererOptions: RendererOptions = {
    mediaResolver: new MediaResolver({
      outputVideos: path.dirname(outputPath),
    }),
    fontResolver: new FontResolver(input.fonts),
    sourceResolver: createSourceResolver({ assets }),
    assets,
  }

  if (runtime.executor !== undefined) {
    rendererOptions.executor = runtime.executor
  }

  if (runtime.mediaDurationProbe !== undefined) {
    rendererOptions.mediaDurationProbe = runtime.mediaDurationProbe
  }

  return new Renderer(rendererOptions)
}

function renderOptions(input: RenderInput): RenderOptions {
  return {
    ...(input.signal === undefined ? {} : { signal: input.signal }),
    ...(input.onProgress === undefined ? {} : { onProgress: input.onProgress }),
  }
}

function resolveOutputPath(output: RenderOutput): string {
  const value = typeof output === 'string' ? output : output.path
  if (value.trim() === '') {
    throw new Error('Output path must not be empty')
  }

  return path.resolve(value)
}
