import { randomUUID } from 'node:crypto'

const ASSET_ID_PATTERN = /^asset_[A-Za-z0-9-]+$/

export function createAssetId(): string {
  return `asset_${randomUUID().replaceAll('-', '')}`
}

export function isAssetId(value: string): boolean {
  return ASSET_ID_PATTERN.test(value)
}
