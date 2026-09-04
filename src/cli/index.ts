import path from 'node:path'
import { loadComposition } from './loadComposition'
import { parseArgs } from './parseArgs'
import { rootDir } from './projectPaths'
import { runRender } from './runRender'

const defaultCompositionPath = path.join(
  rootDir,
  'compositions',
  'example.json',
)

async function main(): Promise<void> {
  const cli = parseArgs(process.argv.slice(2))
  const compositionPath = path.resolve(
    cli.compositionPath ?? defaultCompositionPath,
  )
  const composition = loadComposition(compositionPath)

  await runRender({
    composition,
    label: compositionPath,
    planningLabel: path.basename(compositionPath),
    level: cli.level,
  })
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
