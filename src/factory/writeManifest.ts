import fs from 'node:fs'
import path from 'node:path'
import type { FactoryManifest } from '../interfaces/factory'

export function writeManifest(
  manifest: FactoryManifest,
  outputDirectory: string,
): string {
  fs.mkdirSync(outputDirectory, { recursive: true })
  const manifestPath = path.join(outputDirectory, 'manifest.json')
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)
  return manifestPath
}

export function relativizeManifest(
  manifest: FactoryManifest,
  outputDirectory: string,
): FactoryManifest {
  return {
    ...manifest,
    jobs: manifest.jobs.map((job) => {
      if (job.outputPath === undefined) {
        return job
      }

      return {
        ...job,
        outputPath:
          path.relative(outputDirectory, job.outputPath) || job.outputPath,
      }
    }),
  }
}
