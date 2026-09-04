export type CliLogLevel = 'quiet' | 'normal' | 'verbose' | 'debug'

export interface CliArgs {
  compositionPath?: string
  level: CliLogLevel
}

export function parseArgs(argv: string[]): CliArgs {
  const tokens = argv.filter((arg) => arg !== '--')
  let level: CliLogLevel = 'normal'

  if (tokens.includes('--quiet')) {
    level = 'quiet'
  } else if (tokens.includes('--debug')) {
    level = 'debug'
  } else if (tokens.includes('--verbose') || tokens.includes('-v')) {
    level = 'verbose'
  }

  const compositionPath = tokens.find((arg) => !arg.startsWith('-'))

  return {
    ...(compositionPath === undefined ? {} : { compositionPath }),
    level,
  }
}
