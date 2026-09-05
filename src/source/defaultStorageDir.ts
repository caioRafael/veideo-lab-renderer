import path from 'node:path'
import { fileURLToPath } from 'node:url'

export function defaultAssetStorageDir(): string {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
    'storage',
    'assets',
  )
}
