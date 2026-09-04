import {
  isTemplateVariableType,
  type Template,
  type TemplateVariable,
  type TemplateVariableRef,
} from '../interfaces/template'
import { collectInterpolationNames, isVariableName } from './interpolate'
import { isRecord, receivedTypeName } from './jsonValue'
import { assertVariableValue } from './resolveVariables'
import { TemplateError } from './TemplateError'

export function parseTemplate(value: unknown): Template {
  if (!isRecord(value)) {
    throw new TemplateError('Template expected a JSON object')
  }

  const name = parseName(value.name)
  const version = parseVersion(value.version)
  const variables = parseVariables(value.variables)

  if (!isRecord(value.composition)) {
    throw new TemplateError('Template composition is required')
  }

  const template: Template = {
    name,
    version,
    variables,
    composition: value.composition,
  }

  assertTemplateReferences(template)

  return template
}

export function collectReferencedNames(value: unknown): Set<string> {
  const names = new Set<string>()
  walkReferences(value, (name) => {
    names.add(name)
  })
  return names
}

export function unusedTemplateVariables(template: Template): string[] {
  const referenced = collectReferencedNames(template.composition)

  return Object.keys(template.variables).filter((name) => !referenced.has(name))
}

export function isVariableRef(value: unknown): value is TemplateVariableRef {
  return (
    isRecord(value) &&
    Object.keys(value).length === 1 &&
    typeof value.$variable === 'string'
  )
}

function parseName(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TemplateError('Template name is required')
  }

  return value
}

function parseVersion(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new TemplateError('Template version is required')
  }

  return value
}

function parseVariables(value: unknown): Record<string, TemplateVariable> {
  if (value === undefined) {
    return {}
  }

  if (!isRecord(value)) {
    throw new TemplateError('Template variables expected an object')
  }

  const variables: Record<string, TemplateVariable> = {}

  for (const [name, definition] of Object.entries(value)) {
    if (!isVariableName(name)) {
      throw new TemplateError(`Invalid template variable name "${name}"`)
    }

    variables[name] = parseVariable(name, definition)
  }

  return variables
}

function parseVariable(name: string, value: unknown): TemplateVariable {
  if (!isRecord(value)) {
    throw new TemplateError(`Template variable "${name}" expected an object`)
  }

  if (!isTemplateVariableType(value.type)) {
    throw new TemplateError(
      `Unsupported template variable type "${String(value.type)}"`,
    )
  }

  const variable: TemplateVariable = {
    type: value.type,
  }

  if (value.required !== undefined) {
    if (typeof value.required !== 'boolean') {
      throw new TemplateError(
        `Template variable "${name}" required expected boolean, received ${receivedTypeName(value.required)}`,
      )
    }

    variable.required = value.required
  }

  if (value.default !== undefined) {
    try {
      variable.default = assertVariableValue(name, value.type, value.default)
    } catch {
      throw new TemplateError(`Template variable "${name}" has invalid default`)
    }
  }

  return variable
}

function assertTemplateReferences(template: Template): void {
  walkReferences(template.composition, (name, kind) => {
    const variable = template.variables[name]

    if (variable === undefined) {
      throw new TemplateError(`Template references unknown variable "${name}"`)
    }

    if (
      kind === 'string' &&
      (variable.type === 'number' || variable.type === 'boolean')
    ) {
      throw new TemplateError(`Template variable "${name}" is used as string`)
    }
  })
}

function walkReferences(
  value: unknown,
  visit: (name: string, kind: 'string' | 'typed') => void,
): void {
  if (typeof value === 'string') {
    for (const name of collectInterpolationNames(value)) {
      visit(name, 'string')
    }
    return
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      walkReferences(item, visit)
    }
    return
  }

  if (isVariableRef(value)) {
    visit(value.$variable, 'typed')
    return
  }

  if (isRecord(value)) {
    for (const child of Object.values(value)) {
      walkReferences(child, visit)
    }
  }
}
