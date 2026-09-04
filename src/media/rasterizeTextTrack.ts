import { spawnSync } from 'node:child_process'
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

const SCRIPT_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'scripts',
  'render-text.swift',
)

export interface RasterizedTextResult {
  plan: RenderPlan
  temporaryDirectory: string
}

export function rasterizeTextTrack(plan: RenderPlan): RasterizedTextResult {
  const texts = getTextItems(plan)
  if (texts.length === 0) {
    throw new Error('rasterizeTextTrack requires at least one text item')
  }

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-text-'))
  const extraOverlays: OverlayItem[] = []

  try {
    for (const [index, item] of texts.entries()) {
      extraOverlays.push(rasterizeTextItem(plan, item, index, outputDir))
    }
  } catch (error) {
    removeTemporaryDirectory(outputDir)
    throw error
  }

  return {
    plan: mergeTextOverlays(plan, extraOverlays),
    temporaryDirectory: outputDir,
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

function rasterizeTextItem(
  plan: RenderPlan,
  item: TextItem,
  index: number,
  outputDir: string,
): OverlayItem {
  const outputPath = path.join(outputDir, `${item.id}-${index}.png`)

  const result = spawnSync(
    'swift',
    [
      SCRIPT_PATH,
      outputPath,
      String(plan.width),
      String(plan.height),
      item.content,
      item.fontPath,
      String(item.fontSize),
      item.color,
      String(item.x),
      String(item.y),
    ],
    { encoding: 'utf8' },
  )

  if (result.status !== 0 || !fs.existsSync(outputPath)) {
    throw new Error(
      `Failed to rasterize text "${item.content}": ${result.stderr || result.stdout || 'swift render-text failed'}`,
    )
  }

  return {
    id: `overlay-text-${index}`,
    source: outputPath,
    start: item.start,
    duration: item.duration,
    x: 0,
    y: 0,
    width: plan.width,
    height: plan.height,
  }
}
