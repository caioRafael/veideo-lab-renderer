import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { removeTemporaryDirectory } from '../media/rasterizeTextTrack'

export interface RenderContext {
  id: string
  tempDir: string
  textDir: string
  intermediateDir: string
  downloadsDir: string
}

export function createRenderContext(): RenderContext {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'video-lab-render-'))
  const textDir = path.join(tempDir, 'text')
  const intermediateDir = path.join(tempDir, 'intermediate')
  const downloadsDir = path.join(tempDir, 'downloads')
  fs.mkdirSync(textDir, { recursive: true })
  fs.mkdirSync(intermediateDir, { recursive: true })
  fs.mkdirSync(downloadsDir, { recursive: true })

  return {
    id: path.basename(tempDir),
    tempDir,
    textDir,
    intermediateDir,
    downloadsDir,
  }
}

export function disposeRenderContext(context: RenderContext | undefined): void {
  if (context === undefined) {
    return
  }

  removeTemporaryDirectory(context.tempDir)
}

export function countTemporaryFiles(directory: string): number {
  if (!fs.existsSync(directory)) {
    return 0
  }

  let count = 0
  const entries = fs.readdirSync(directory, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      count += countTemporaryFiles(fullPath)
      continue
    }

    count += 1
  }

  return count
}
