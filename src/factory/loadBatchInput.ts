import fs from 'node:fs'
import type { TemplateInput } from '../interfaces/template'
import { isRecord } from '../template/jsonValue'
import { parseTemplateInput } from '../template/resolveVariables'
import { TemplateError } from '../template/TemplateError'

export function parseBatchInput(value: unknown): TemplateInput[] {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      throw new TemplateError('Batch input expected a non-empty items array')
    }

    return value.map((item, index) => parseBatchItem(item, index))
  }

  if (!isRecord(value)) {
    throw new TemplateError('Batch input expected a JSON object or array')
  }

  if (Array.isArray(value.items)) {
    if (value.items.length === 0) {
      throw new TemplateError('Batch input expected a non-empty items array')
    }

    return value.items.map((item, index) => parseBatchItem(item, index))
  }

  return [parseTemplateInput(value)]
}

export function loadBatchInput(inputPath: string): TemplateInput[] {
  if (!fs.existsSync(inputPath)) {
    throw new TemplateError(`Template input file not found: ${inputPath}`)
  }

  try {
    return parseBatchInput(JSON.parse(fs.readFileSync(inputPath, 'utf8')))
  } catch (error) {
    if (error instanceof TemplateError) {
      throw error
    }

    if (error instanceof SyntaxError) {
      throw new TemplateError(`Invalid template input JSON: ${error.message}`)
    }

    throw error
  }
}

function parseBatchItem(value: unknown, index: number): TemplateInput {
  try {
    return parseTemplateInput(value)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new TemplateError(`Batch item ${index + 1}: ${message}`)
  }
}
