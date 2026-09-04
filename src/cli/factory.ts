import path from 'node:path'
import { loadBatchInput } from '../factory/loadBatchInput'
import { VideoFactory } from '../factory/VideoFactory'
import type { FactoryProgressEvent } from '../interfaces/factory'
import { loadTemplate } from '../template/loadTemplate'
import { formatProgressBar } from './formatReport'
import { parseFactoryArgs } from './parseFactoryArgs'
import { mediaPaths, rootDir } from './projectPaths'

async function main(): Promise<void> {
  const cli = parseFactoryArgs(process.argv.slice(2))
  const templatePath = path.resolve(cli.templatePath)
  const template = loadTemplate(templatePath)
  const inputs = loadBatchInput(path.resolve(cli.inputPath))
  const outputDirectory = path.resolve(
    cli.outputDirectory ?? path.join(mediaPaths.outputVideos),
  )

  if (cli.level !== 'quiet') {
    console.log('Video Factory')
    console.log('')
    console.log(`Template: ${template.name}`)
    console.log(`Jobs: ${inputs.length}`)
    console.log(`Concurrency: ${cli.concurrency}`)
    if (cli.retries > 0) {
      console.log(`Retries: ${cli.retries}`)
    }
    console.log('')
  }

  const controller = new AbortController()
  const abort = (): void => {
    controller.abort()
  }

  process.once('SIGINT', abort)
  process.once('SIGTERM', abort)

  const factory = new VideoFactory({
    maxConcurrentRenders: cli.concurrency,
    maxRetries: cli.retries,
    mediaPaths,
    outputDirectory,
    fontDirectory: path.join(rootDir, 'input', 'fonts'),
    onProgress: (event) => {
      if (cli.level === 'quiet' || cli.level === 'normal') {
        return
      }

      printFactoryProgress(event)
    },
  })

  try {
    const manifest = await factory.renderTemplate({
      template,
      inputs,
      signal: controller.signal,
    })

    if (cli.level !== 'quiet') {
      console.log('')
      console.log(`Completed: ${manifest.completed}`)
      console.log(`Failed: ${manifest.failed}`)
      console.log(`Cancelled: ${manifest.cancelled}`)
      console.log(`Manifest: ${path.join(outputDirectory, 'manifest.json')}`)
    }
  } finally {
    process.off('SIGINT', abort)
    process.off('SIGTERM', abort)
  }
}

function printFactoryProgress(event: FactoryProgressEvent): void {
  const { factory, jobs } = event
  const lines = [
    `Factory: ${factory.completed + factory.failed + factory.cancelled}/${factory.total}`,
    `Completed: ${factory.completed}  Failed: ${factory.failed}  Cancelled: ${factory.cancelled}  Queued: ${factory.queued}  Active: ${factory.active}`,
    ...jobs.map((job) => {
      const percent = `${Math.round(job.progress.progress * 100)}%`
      return `  ${job.jobId}: ${job.progress.phase} ${formatProgressBar(job.progress.progress)} ${percent}`
    }),
  ]

  process.stdout.write(`\r${lines.join(' | ')}   `)
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
