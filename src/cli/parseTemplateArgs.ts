import type { CliLogLevel } from './parseArgs'

export interface TemplateCliArgs {
  templatePath: string
  inputPath?: string
  variables: Record<string, string>
  level: CliLogLevel
}

export function parseTemplateArgs(argv: string[]): TemplateCliArgs {
  const tokens = argv.filter((arg) => arg !== '--')
  let level: CliLogLevel = 'normal'
  let inputPath: string | undefined
  const variables: Record<string, string> = {}
  const positionals: string[] = []

  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index]
    if (token === undefined) {
      continue
    }

    if (token === '--quiet') {
      level = 'quiet'
      continue
    }

    if (token === '--debug') {
      level = 'debug'
      continue
    }

    if (token === '--verbose' || token === '-v') {
      level = 'verbose'
      continue
    }

    if (token === '--input') {
      const value = tokens[index + 1]
      if (value === undefined || value.startsWith('-')) {
        throw new Error('Template CLI expected a path after --input')
      }

      inputPath = value
      index += 1
      continue
    }

    if (token === '--var') {
      const value = tokens[index + 1]
      if (value === undefined || value.startsWith('-')) {
        throw new Error('Template CLI expected name=value after --var')
      }

      const separator = value.indexOf('=')
      if (separator <= 0) {
        throw new Error(`Invalid --var argument: ${value}`)
      }

      variables[value.slice(0, separator)] = value.slice(separator + 1)
      index += 1
      continue
    }

    if (token.startsWith('-')) {
      throw new Error(`Unknown template CLI option: ${token}`)
    }

    positionals.push(token)
  }

  const templatePath = positionals[0]

  if (templatePath === undefined) {
    throw new Error('Template path is required')
  }

  if (positionals.length > 1) {
    throw new Error('Template CLI expected a single template path')
  }

  return {
    templatePath,
    ...(inputPath === undefined ? {} : { inputPath }),
    variables,
    level,
  }
}
