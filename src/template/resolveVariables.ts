import type {
  TemplateInput,
  TemplateVariable,
  TemplateVariableType,
} from '../interfaces/template'
import { isRecord, receivedTypeName } from './jsonValue'
import { TemplateError } from './TemplateError'

export function isVariableRequired(variable: TemplateVariable): boolean {
  if (variable.required !== undefined) {
    return variable.required
  }

  return !('default' in variable)
}

export function resolveVariableValues(
  variables: Record<string, TemplateVariable>,
  input: TemplateInput,
): Record<string, string | number | boolean> {
  const provided = input.variables ?? {}
  const resolved: Record<string, string | number | boolean> = {}

  for (const name of Object.keys(provided)) {
    if (variables[name] === undefined) {
      throw new TemplateError(`Unknown template input variable "${name}"`)
    }
  }

  for (const [name, variable] of Object.entries(variables)) {
    if (Object.prototype.hasOwnProperty.call(provided, name)) {
      resolved[name] = assertVariableValue(name, variable.type, provided[name])
      continue
    }

    if ('default' in variable && variable.default !== undefined) {
      resolved[name] = variable.default
      continue
    }

    if (isVariableRequired(variable)) {
      throw new TemplateError(`Template variable "${name}" is required`)
    }
  }

  return resolved
}

export function assertVariableValue(
  name: string,
  type: TemplateVariableType,
  value: unknown,
): string | number | boolean {
  if (type === 'string' || type === 'asset') {
    if (typeof value !== 'string') {
      throw new TemplateError(
        `Template variable "${name}" expected ${type}, received ${receivedTypeName(value)}`,
      )
    }

    if (type === 'asset' && value.trim() === '') {
      throw new TemplateError(
        `Template variable "${name}" expected ${type}, received empty string`,
      )
    }

    return value
  }

  if (type === 'number') {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new TemplateError(
        `Template variable "${name}" expected number, received ${receivedTypeName(value)}`,
      )
    }

    return value
  }

  if (typeof value !== 'boolean') {
    throw new TemplateError(
      `Template variable "${name}" expected boolean, received ${receivedTypeName(value)}`,
    )
  }

  return value
}

export function parseTemplateInput(value: unknown): TemplateInput {
  if (!isRecord(value)) {
    throw new TemplateError('Template input expected a JSON object')
  }

  if (isRecord(value.variables)) {
    return { variables: value.variables }
  }

  return { variables: value }
}
