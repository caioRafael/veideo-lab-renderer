import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadComposition } from '../cli/loadComposition'
import { formatBytes, formatSeconds } from '../cli/formatReport'
import type { MediaPaths } from '../interfaces/media-paths'
import type { RenderMetrics } from '../interfaces/render-runtime'
import { FontResolver } from '../media/FontResolver'
import { MediaResolver } from '../media/MediaResolver'
import { Renderer } from '../renderer/Renderer'

const rootDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
)

const mediaPaths: MediaPaths = {
  images: path.join(rootDir, 'input', 'images'),
  audios: path.join(rootDir, 'input', 'audios'),
  videos: path.join(rootDir, 'input', 'videos'),
  outputVideos: path.join(rootDir, 'output', 'videos'),
}

const BENCHMARKS = [
  'benchmark-1-scene',
  'benchmark-5-scenes',
  'benchmark-10-scenes',
  'benchmark-20-scenes',
  'benchmark-50-scenes',
  'benchmark-many-images',
  'benchmark-many-texts',
  'benchmark-effects',
  'benchmark-transitions',
  'benchmark-animated',
  'benchmark-full',
]

interface BenchmarkRow {
  name: string
  metrics: RenderMetrics
}

async function runOne(name: string): Promise<BenchmarkRow> {
  const compositionPath = path.join(
    rootDir,
    'compositions',
    'benchmark',
    `${name}.json`,
  )
  const composition = loadComposition(compositionPath)
  const renderer = new Renderer({
    mediaResolver: new MediaResolver(mediaPaths),
    fontResolver: new FontResolver(path.join(rootDir, 'input', 'fonts')),
  })

  const result = await renderer.render(composition)
  result.metrics.composition = name
  return { name, metrics: result.metrics }
}

function formatTable(rows: BenchmarkRow[]): string {
  const header =
    'Benchmark'.padEnd(24) +
    'Duration'.padStart(10) +
    'Render'.padStart(10) +
    'Factor'.padStart(10) +
    'Scenes'.padStart(8) +
    'Texts'.padStart(7) +
    'Fx'.padStart(5) +
    'Tr'.padStart(5)
  const line = '-'.repeat(header.length)
  const body = rows.map((row) => {
    const { metrics } = row
    return (
      row.name.replace('benchmark-', '').padEnd(24) +
      formatSeconds(metrics.videoDuration).padStart(10) +
      formatSeconds(metrics.renderDurationMs / 1000).padStart(10) +
      `${metrics.renderFactor.toFixed(2)}x`.padStart(10) +
      String(metrics.sceneCount).padStart(8) +
      String(metrics.textCount).padStart(7) +
      String(metrics.effectCount).padStart(5) +
      String(metrics.transitionCount).padStart(5)
    )
  })

  return [header, line, ...body].join('\n')
}

async function main(): Promise<void> {
  const selected = process.argv.slice(2).filter((arg) => arg !== '--')
  const names = selected.length > 0 ? selected : BENCHMARKS
  const rows: BenchmarkRow[] = []

  for (const name of names) {
    process.stdout.write(`Running ${name}...\n`)
    const row = await runOne(name)
    rows.push(row)
    process.stdout.write(
      `  ${formatSeconds(row.metrics.videoDuration)} video / ${formatSeconds(row.metrics.renderDurationMs / 1000)} render / ${row.metrics.renderFactor.toFixed(3)}x / ${formatBytes(row.metrics.outputSizeBytes)}\n`,
    )
  }

  const table = formatTable(rows)
  process.stdout.write(`\n${table}\n`)

  const resultsPath = path.join(rootDir, 'docs', 'benchmark-results.json')
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true })
  fs.writeFileSync(resultsPath, `${JSON.stringify(rows, null, 2)}\n`)
  process.stdout.write(`\nWrote ${resultsPath}\n`)
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
