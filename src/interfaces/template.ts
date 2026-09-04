export type TemplateVariableType = 'string' | 'number' | 'boolean' | 'asset'

export const TEMPLATE_VARIABLE_TYPES: readonly TemplateVariableType[] = [
  'string',
  'number',
  'boolean',
  'asset',
]

export interface TemplateVariable {
  type: TemplateVariableType
  required?: boolean
  default?: string | number | boolean
}

/**
 * Parameterized composition document.
 *
 * `composition` is a composition-shaped JSON tree that may contain
 * `{{variable}}` strings and `{ "$variable": "name" }` refs.
 * After resolve it becomes a normal Composition via CompositionParser.
 */
export interface Template {
  name: string
  version: number
  variables: Record<string, TemplateVariable>
  composition: Record<string, unknown>
}

export interface TemplateInput {
  variables?: Record<string, unknown>
}

export interface TemplateVariableRef {
  $variable: string
}

export function isTemplateVariableType(
  value: unknown,
): value is TemplateVariableType {
  return TEMPLATE_VARIABLE_TYPES.some((type) => type === value)
}
