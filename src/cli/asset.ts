import { LocalAssetManager } from '../asset/LocalAssetManager'
import { LocalFileStorage } from '../storage/LocalFileStorage'
import { parseAssetArgs } from './parseAssetArgs'
import { assetStorageDir } from './projectPaths'

async function main(): Promise<void> {
  const cli = parseAssetArgs(process.argv.slice(2))
  const manager = new LocalAssetManager(new LocalFileStorage(assetStorageDir))

  if (cli.command === 'import') {
    if (cli.path === undefined) {
      throw new Error('Usage: pnpm asset import <path>')
    }

    const asset = await manager.import({ path: cli.path })
    console.log(`Imported ${asset.id}`)
    console.log(`Name: ${asset.name}`)
    console.log(`Type: ${asset.type}`)
    console.log(`Path: ${asset.path}`)
    return
  }

  if (cli.command === 'get') {
    if (cli.id === undefined) {
      throw new Error('Usage: pnpm asset get <id>')
    }

    const asset = await manager.get(cli.id)
    printAsset(asset)
    return
  }

  const assets = await manager.list()
  if (assets.length === 0) {
    console.log('No assets')
    return
  }

  for (const asset of assets) {
    printAsset(asset)
  }
}

function printAsset(asset: {
  id: string
  name: string
  type: string
  path: string
}): void {
  console.log(`${asset.id}  ${asset.type}  ${asset.name}  ${asset.path}`)
}

try {
  await main()
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
}
