import fs from 'node:fs'
import path from 'node:path'
import type {
  ResolvedSource,
  SourceResolverContext,
  UrlSource,
} from '../interfaces/source'
import {
  assertHttpUrl,
  downloadUrl,
  urlDownloadFileName,
  type UrlDownloader,
} from './downloadUrl'

export class UrlSourceResolver {
  private readonly download: UrlDownloader

  constructor(download: UrlDownloader = downloadUrl) {
    this.download = download
  }

  async resolve(
    source: UrlSource,
    context: SourceResolverContext,
  ): Promise<ResolvedSource> {
    const parsed = assertHttpUrl(source.url)
    const fileName = urlDownloadFileName(parsed)
    const destPath = path.join(context.downloadDir, fileName)

    await fs.promises.mkdir(context.downloadDir, { recursive: true })
    await this.download(parsed.href, destPath, context.signal)

    if (!fs.existsSync(destPath) || !fs.statSync(destPath).isFile()) {
      throw new Error(
        `Failed to download URL ${source.url}: no file was written`,
      )
    }

    return { path: destPath }
  }
}
