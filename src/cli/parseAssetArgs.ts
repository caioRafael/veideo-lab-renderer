export type AssetCliCommand = 'import' | 'list' | 'get'

export interface AssetCliArgs {
  command: AssetCliCommand
  path?: string
  id?: string
}

export function parseAssetArgs(argv: string[]): AssetCliArgs {
  const tokens = argv.filter((arg) => arg !== '--')
  const command = tokens[0]

  if (command !== 'import' && command !== 'list' && command !== 'get') {
    throw new Error('Usage: pnpm asset <import|list|get> ...')
  }

  if (command === 'import') {
    const filePath = tokens[1]
    if (filePath === undefined || filePath.length === 0) {
      throw new Error('Usage: pnpm asset import <path>')
    }

    return { command, path: filePath }
  }

  if (command === 'get') {
    const id = tokens[1]
    if (id === undefined || id.length === 0) {
      throw new Error('Usage: pnpm asset get <id>')
    }

    return { command, id }
  }

  return { command }
}
