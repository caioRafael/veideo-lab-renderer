import { randomUUID } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const DOWNLOAD_TIMEOUT_MS = 30_000

const MIME_EXTENSIONS: Record<string, string> = {
  'audio/aac': '.aac',
  'audio/mpeg': '.mp3',
  'audio/ogg': '.ogg',
  'audio/wav': '.wav',
  'image/gif': '.gif',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
}

export type UrlDownloader = (
  url: string,
  destPath: string,
  signal?: AbortSignal,
) => Promise<void>

export function assertHttpUrl(value: string): URL {
  let parsed: URL

  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`Invalid URL source: ${value}`)
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `Invalid URL source: only HTTP and HTTPS URLs are allowed (${value})`,
    )
  }

  return parsed
}

export function urlDownloadFileName(url: URL, contentType?: string): string {
  const fromPath = path.extname(url.pathname)
  const extension =
    fromPath !== ''
      ? fromPath
      : (MIME_EXTENSIONS[contentType?.split(';')[0]?.trim() ?? ''] ?? '')

  return `url-${randomUUID()}${extension}`
}

export async function downloadUrl(
  url: string,
  destPath: string,
  signal?: AbortSignal,
): Promise<void> {
  const parsed = assertHttpUrl(url)
  const combined = combineSignals(signal)

  let response: Response
  try {
    response = await fetch(parsed.href, {
      redirect: 'follow',
      signal: combined,
    })
  } catch (error) {
    throw new Error(
      `Failed to download URL ${url}: ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  if (!response.ok) {
    throw new Error(`Failed to download URL ${url}: HTTP ${response.status}`)
  }

  const bytes = Buffer.from(await response.arrayBuffer())
  await fs.promises.mkdir(path.dirname(destPath), { recursive: true })
  await fs.promises.writeFile(destPath, bytes)
}

function combineSignals(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS)
  if (signal === undefined) {
    return timeout
  }

  return AbortSignal.any([signal, timeout])
}
