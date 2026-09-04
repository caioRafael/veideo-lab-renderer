import { CompositionParser } from '../composition/CompositionParser'
import type { Composition } from '../interfaces/composition'
import type { Template, TemplateInput } from '../interfaces/template'
import { interpolateString } from './interpolate'
import { cloneJson, isRecord } from './jsonValue'
import { resolveVariableValues } from './resolveVariables'
import { TemplateError } from './TemplateError'
import { isVariableRef, parseTemplate } from './validateTemplate'

export class TemplateResolver {
  private readonly parser: CompositionParser

  constructor(parser: CompositionParser = new CompositionParser()) {
    this.parser = parser
  }

  resolve(template: Template, input: TemplateInput = {}): Composition {
    const document = this.materialize(template, input)
    return this.parser.parse(document)
  }

  materialize(template: Template, input: TemplateInput = {}): unknown {
    const validated = parseTemplate(cloneJson(template))
    const values = resolveVariableValues(validated.variables, input)

    return this.resolveNode(cloneJson(validated.composition), validated, values)
  }

  private resolveNode(
    value: unknown,
    template: Template,
    values: Record<string, string | number | boolean>,
  ): unknown {
    if (typeof value === 'string') {
      return interpolateString(value, template.variables, values)
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.resolveNode(item, template, values))
    }

    if (isVariableRef(value)) {
      return this.resolveTypedReference(value.$variable, values)
    }

    if (isRecord(value)) {
      const resolved: Record<string, unknown> = {}

      for (const [key, child] of Object.entries(value)) {
        resolved[key] = this.resolveNode(child, template, values)
      }

      return resolved
    }

    return value
  }

  private resolveTypedReference(
    name: string,
    values: Record<string, string | number | boolean>,
  ): string | number | boolean {
    const resolved = values[name]

    if (resolved === undefined) {
      throw new TemplateError(`Template variable "${name}" is required`)
    }

    return resolved
  }
}

export function resolveTemplate(
  template: Template,
  input: TemplateInput = {},
): Composition {
  return new TemplateResolver().resolve(template, input)
}
