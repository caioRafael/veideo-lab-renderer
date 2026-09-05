import fs from 'node:fs'
import path from 'node:path'
import type { Asset, AssetManager, ImportAssetInput } from '../interfaces/asset'
import type { Storage } from '../interfaces/storage'
import { createAssetId, isAssetId } from './createAssetId'
import { detectAssetKind } from './detectAssetType'

interface AssetRecord {
  id: string
  name: string
  type: Asset['type']
  mimeType: string
  fileName: string
  size: number
}

export class LocalAssetManager implements AssetManager {
  private readonly storage: Storage

  constructor(storage: Storage) {
    this.storage = storage
  }

  async import(input: ImportAssetInput): Promise<Asset> {
    const sourcePath = path.resolve(input.path)
    assertReadableFile(sourcePath, 'Import path')

    const kind = detectAssetKind(sourcePath)
    const id = createAssetId()
    const name = path.basename(sourcePath)
    const fileName = `original${path.extname(sourcePath).toLowerCase()}`
    const size = fs.statSync(sourcePath).size
    const storedPath = await this.storage.put(`${id}/${fileName}`, sourcePath)

    const record: AssetRecord = {
      id,
      name,
      type: kind.type,
      mimeType: kind.mimeType,
      fileName,
      size,
    }

    await this.storage.write(`${id}/meta.json`, JSON.stringify(record, null, 2))

    return {
      id,
      name,
      type: kind.type,
      mimeType: kind.mimeType,
      path: storedPath,
      size,
    }
  }

  async get(id: string): Promise<Asset> {
    assertAssetId(id)
    const record = await this.readRecord(id)
    const storedPath = await this.storage.get(`${id}/${record.fileName}`)

    return {
      id: record.id,
      name: record.name,
      type: record.type,
      mimeType: record.mimeType,
      path: storedPath,
      size: record.size,
    }
  }

  async list(): Promise<Asset[]> {
    const ids = await this.storage.list()
    const assets: Asset[] = []

    for (const id of ids) {
      if (!isAssetId(id)) {
        continue
      }

      try {
        assets.push(await this.get(id))
      } catch {
        continue
      }
    }

    return assets.sort((left, right) => left.id.localeCompare(right.id))
  }

  async delete(id: string): Promise<void> {
    assertAssetId(id)
    await this.storage.delete(id)
  }

  async exists(id: string): Promise<boolean> {
    if (!isAssetId(id)) {
      return false
    }

    return this.storage.exists(`${id}/meta.json`)
  }

  private async readRecord(id: string): Promise<AssetRecord> {
    if (!(await this.storage.exists(`${id}/meta.json`))) {
      throw new Error(`Asset "${id}" was not found`)
    }

    const raw = await this.storage.read(`${id}/meta.json`)

    try {
      const record = JSON.parse(raw) as AssetRecord
      if (record.id !== id || record.fileName === undefined) {
        throw new Error('invalid record')
      }

      return record
    } catch {
      throw new Error(`Asset "${id}" metadata is invalid`)
    }
  }
}

function assertAssetId(id: string): void {
  if (!isAssetId(id)) {
    throw new Error(`Invalid asset id: ${id}`)
  }
}

function assertReadableFile(filePath: string, label: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} not found: ${filePath}`)
  }

  if (!fs.statSync(filePath).isFile()) {
    throw new Error(`${label} is not a file: ${filePath}`)
  }
}
