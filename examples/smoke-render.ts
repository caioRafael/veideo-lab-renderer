import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { render } from '../src/index'

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const workDir = path.join(rootDir, 'tmp', 'smoke')
const sceneA = path.join(workDir, 'scene-a.png')
const sceneB = path.join(workDir, 'scene-b.png')
const output = path.join(workDir, 'video.mp4')

async function main(): Promise<void> {
  assertFfmpeg()
  fs.mkdirSync(workDir, { recursive: true })
  writeColorPng(sceneA, '0x1a365d', '1280x720')
  writeColorPng(sceneB, '0xc05621', '1280x720')

  console.log('Rendering smoke composition...')

  const result = await render({
    composition: {
      width: 1280,
      height: 720,
      fps: 25,
      scenes: [
        { type: 'image', source: 'scene-a', duration: 2 },
        {
          type: 'image',
          source: 'scene-b',
          duration: 2,
          transition: { type: 'crossfade', duration: 0.5 },
        },
      ],
      texts: [
        {
          content: 'patchwork',
          start: 0,
          duration: 3.5,
          x: 'center',
          y: 80,
          fontSize: 56,
          color: '#FFFFFF',
        },
      ],
    },
    assets: {
      'scene-a': sceneA,
      'scene-b': sceneB,
    },
    output,
    onProgress: (progress) => {
      const percent = Math.round(progress.progress * 100)
      process.stdout.write(`\r  ${progress.phase} ${percent}%   `)
    },
  })

  process.stdout.write('\n')

  if (!fs.existsSync(result.outputPath)) {
    throw new Error(`Render finished without writing ${result.outputPath}`)
  }

  console.log(`Rendered: ${result.outputPath}`)
  console.log(`Duration: ${result.duration}s`)
  console.log(`Size: ${result.metrics.outputSizeBytes} bytes`)
  console.log(`Render factor: ${result.metrics.renderFactor.toFixed(2)}x`)
}

function assertFfmpeg(): void {
  const probe = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' })
  if (probe.status !== 0) {
    throw new Error('FFmpeg is required on PATH to run pnpm test:render')
  }
}

function writeColorPng(filePath: string, color: string, size: string): void {
  const generated = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-f',
      'lavfi',
      '-i',
      `color=c=${color}:s=${size}:d=1`,
      '-frames:v',
      '1',
      filePath,
    ],
    { encoding: 'utf8' },
  )

  if (generated.status !== 0) {
    throw new Error(
      generated.stderr.trim() || `Failed to generate fixture ${filePath}`,
    )
  }
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
