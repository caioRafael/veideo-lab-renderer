import fs from 'node:fs'
import type { Template, TemplateInput } from '../interfaces/template'
import { TemplateError } from './TemplateError'
import { parseTemplateInput } from './resolveVariables'
import { parseTemplate } from './validateTemplate'

export function loadTemplate(templatePath: string): Template {
  return parseTemplate(readJsonFile(templatePath, 'Template'))
}

export function loadTemplateInput(inputPath: string): TemplateInput {
  return parseTemplateInput(readJsonFile(inputPath, 'Template input'))
}

function readJsonFile(filePath: string, label: string): unknown {
  if (!fs.existsSync(filePath)) {
    throw new TemplateError(`${label} file not found: ${filePath}`)
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new TemplateError(
        `Invalid ${label.toLowerCase()} JSON: ${error.message}`,
      )
    }

    throw error
  }
}
