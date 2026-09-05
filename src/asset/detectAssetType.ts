import path from 'node:path'
import type { AssetType } from '../interfaces/asset'

interface AssetKind {
  type: AssetType
  mimeType: string
}

const IMAGE_TYPES: Record<string, string> = {
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
}

const VIDEO_TYPES: Record<string, string> = {
  '.mkv': 'video/x-matroska',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
}

const AUDIO_TYPES: Record<string, string> = {
  '.aac': 'audio/aac',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
}

export function detectAssetKind(filePath: string): AssetKind {
  const extension = path.extname(filePath).toLowerCase()
  const mimeType =
    IMAGE_TYPES[extension] ?? VIDEO_TYPES[extension] ?? AUDIO_TYPES[extension]

  if (mimeType === undefined) {
    throw new Error(
      `Unsupported media file: ${path.basename(filePath)} (unknown type)`,
    )
  }

  if (IMAGE_TYPES[extension] !== undefined) {
    return { type: 'image', mimeType }
  }

  if (VIDEO_TYPES[extension] !== undefined) {
    return { type: 'video', mimeType }
  }

  return { type: 'audio', mimeType }
}
