import {
  parseNonNegativeInteger,
  parsePositiveInteger,
} from '../factory/validateOptions'
import type { CliLogLevel } from './parseArgs'

export interface FactoryCliArgs {
  command: 'render-template'
  templatePath: string
  inputPath: string
  concurrency: number
  retries: number
  outputDirectory?: string
  level: CliLogLevel
}

export function parseFactoryArgs(argv: string[]): FactoryCliArgs {
  const tokens = argv.filter((arg) => arg !== '--')
  let level: CliLogLevel = 'normal'
  let inputPath: string | undefined
  let outputDirectory: string | undefined
  let concurrency = 1
  let retries = 0
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
      inputPath = readFlagValue(tokens, index, '--input')
      index += 1
      continue
    }

    if (token === '--concurrency') {
      concurrency = parsePositiveInteger(
        parseNumberFlag(readFlagValue(tokens, index, '--concurrency')),
        'concurrency',
      )
      index += 1
      continue
    }

    if (token === '--retries') {
      retries = parseNonNegativeInteger(
        parseNumberFlag(readFlagValue(tokens, index, '--retries')),
        'retries',
      )
      index += 1
      continue
    }

    if (token === '--output') {
      outputDirectory = readFlagValue(tokens, index, '--output')
      index += 1
      continue
    }

    if (token.startsWith('-')) {
      throw new Error(`Unknown factory CLI option: ${token}`)
    }

    positionals.push(token)
  }

  const command = positionals[0]
  const templatePath = positionals[1]

  if (command !== 'render-template') {
    throw new Error(
      'Factory CLI expected "render-template <template> --input <batch>"',
    )
  }

  if (templatePath === undefined) {
    throw new Error('Template path is required')
  }

  if (inputPath === undefined) {
    throw new Error('Factory CLI expected --input <batch.json>')
  }

  if (positionals.length > 2) {
    throw new Error('Factory CLI expected a single template path')
  }

  return {
    command,
    templatePath,
    inputPath,
    concurrency,
    retries,
    ...(outputDirectory === undefined ? {} : { outputDirectory }),
    level,
  }
}

function readFlagValue(tokens: string[], index: number, flag: string): string {
  const value = tokens[index + 1]
  if (value === undefined || value.startsWith('-')) {
    throw new Error(`Factory CLI expected a value after ${flag}`)
  }

  return value
}

function parseNumberFlag(value: string): number {
  if (!/^\d+$/.test(value)) {
    throw new Error(`Factory CLI expected an integer, received ${value}`)
  }

  return Number(value)
}
