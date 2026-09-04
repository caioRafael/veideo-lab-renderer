import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type {
  OverlayItem,
  OverlayTrack,
  RenderPlan,
  TextItem,
} from '../interfaces/render-plan'
import { getTextItems } from '../interfaces/render-plan'
import {
  RenderCancelledError,
  throwIfAborted,
} from '../renderer/RenderCancelledError'
import { computeTextRasterBounds } from '../text/textBounds'
import { rasterizeTextConfig } from '../text/rasterizeConfig'

const SCRIPT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'scripts',
  'render-text.swift',
)

const RASTERIZE_CONCURRENCY = 4

export interface RasterizeTextOptions {
  outputDirectory?: string
  signal?: AbortSignal
}

export interface RasterizedTextResult {
  plan: RenderPlan
  temporaryDirectory: string
}

export async function rasterizeTextTrack(
  plan: RenderPlan,
  options: RasterizeTextOptions = {},
): Promise<RasterizedTextResult> {
  const texts = getTextItems(plan)
  if (texts.length === 0) {
    throw new Error('rasterizeTextTrack requires at least one text item')
  }

  const ownsDirectory = options.outputDirectory === undefined
  const outputDir =
    options.outputDirectory ??
    fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-text-'))

  try {
    throwIfAborted(options.signal)
    const extraOverlays = await mapPool(
      texts,
      RASTERIZE_CONCURRENCY,
      async (item, index) => {
        throwIfAborted(options.signal)
        return rasterizeTextItem(plan, item, index, outputDir, options.signal)
      },
    )

    return {
      plan: mergeTextOverlays(plan, extraOverlays),
      temporaryDirectory: outputDir,
    }
  } catch (error) {
    if (ownsDirectory) {
      removeTemporaryDirectory(outputDir)
    }

    throw error
  }
}

export function removeTemporaryDirectory(directory: string): void {
  fs.rmSync(directory, { recursive: true, force: true })
}

function mergeTextOverlays(
  plan: RenderPlan,
  extraOverlays: OverlayItem[],
): RenderPlan {
  const tracksWithoutText = plan.tracks.filter((track) => track.type !== 'text')
  const overlayTrack = tracksWithoutText.find(
    (track): track is OverlayTrack => track.type === 'overlay',
  )

  if (overlayTrack) {
    return {
      ...plan,
      tracks: tracksWithoutText.map((track) => {
        if (track.type !== 'overlay') {
          return track
        }

        return {
          ...track,
          items: [...track.items, ...extraOverlays],
        }
      }),
    }
  }

  return {
    ...plan,
    tracks: [
      ...tracksWithoutText,
      {
        id: 'overlay',
        type: 'overlay',
        items: extraOverlays,
      },
    ],
  }
}

async function rasterizeTextItem(
  plan: RenderPlan,
  item: TextItem,
  index: number,
  outputDir: string,
  signal: AbortSignal | undefined,
): Promise<OverlayItem> {
  const outputPath = path.join(outputDir, `${item.id}-${index}.png`)
  const configPath = path.join(outputDir, `${item.id}-${index}.json`)
  fs.writeFileSync(
    configPath,
    JSON.stringify(rasterizeTextConfig(item, plan.width, plan.height)),
  )

  await runSwift(outputPath, configPath, item.content, signal)

  const bounds = computeTextRasterBounds(item, plan.width, plan.height)

  return {
    id: `overlay-text-${index}`,
    source: outputPath,
    start: item.start,
    duration: item.duration,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  }
}

function runSwift(
  outputPath: string,
  configPath: string,
  content: string,
  signal: AbortSignal | undefined,
): Promise<void> {
  throwIfAborted(signal)

  return new Promise((resolve, reject) => {
    const child = spawn('swift', [SCRIPT_PATH, outputPath, configPath])
    let stderr = ''

    const abort = (): void => {
      if (!child.killed) {
        child.kill('SIGTERM')
      }
    }

    signal?.addEventListener('abort', abort, { once: true })

    child.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      signal?.removeEventListener('abort', abort)
      reject(error)
    })

    child.on('close', (code) => {
      signal?.removeEventListener('abort', abort)

      if (signal?.aborted === true) {
        reject(new RenderCancelledError())
        return
      }

      if (code === 0 && fs.existsSync(outputPath)) {
        resolve()
        return
      }

      reject(
        new Error(
          `Failed to rasterize text "${content}": ${stderr.trim() || 'swift render-text failed'}`,
        ),
      )
    })
  })
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = []
  let nextIndex = 0

  const worker = async (): Promise<void> => {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      const item = items[index]
      if (item === undefined) {
        continue
      }

      results[index] = await mapper(item, index)
    }
  }

  const size = Math.min(Math.max(concurrency, 1), items.length)
  await Promise.all(Array.from({ length: size }, () => worker()))
  return results
}
