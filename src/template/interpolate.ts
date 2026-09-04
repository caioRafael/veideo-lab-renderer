import type { TemplateVariable } from '../interfaces/template'
import { TemplateError } from './TemplateError'

export const VARIABLE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/

const PLACEHOLDER_PATTERN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g

export function isVariableName(value: string): boolean {
  return VARIABLE_NAME_PATTERN.test(value)
}

export function collectInterpolationNames(value: string): string[] {
  const names: string[] = []

  for (const match of value.matchAll(new RegExp(PLACEHOLDER_PATTERN, 'g'))) {
    const name = match[1]
    if (name !== undefined) {
      names.push(name)
    }
  }

  return names
}

export function interpolateString(
  value: string,
  variables: Record<string, TemplateVariable>,
  values: Record<string, string | number | boolean>,
): string {
  return value.replace(PLACEHOLDER_PATTERN, (_match, name: string) => {
    const variable = variables[name]

    if (variable === undefined) {
      throw new TemplateError(`Template references unknown variable "${name}"`)
    }

    if (variable.type === 'number' || variable.type === 'boolean') {
      throw new TemplateError(`Template variable "${name}" is used as string`)
    }

    const resolved = values[name]

    if (typeof resolved !== 'string') {
      throw new TemplateError(`Template variable "${name}" is required`)
    }

    return resolved
  })
}
