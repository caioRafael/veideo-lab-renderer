export type AssetType = 'image' | 'video' | 'audio'

export interface Asset {
  id: string
  name: string
  type: AssetType
  mimeType: string
  path: string
  size: number
}

export interface ImportAssetInput {
  path: string
}

export interface AssetManager {
  import(input: ImportAssetInput): Promise<Asset>
  get(id: string): Promise<Asset>
  list(): Promise<Asset[]>
  delete(id: string): Promise<void>
  exists(id: string): Promise<boolean>
}
