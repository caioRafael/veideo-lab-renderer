import fs from 'node:fs'
import { CompositionParser } from '../composition/CompositionParser'
import type { Composition } from '../interfaces/composition'

export function loadComposition(compositionPath: string): Composition {
  if (!fs.existsSync(compositionPath)) {
    throw new Error(`Composition file not found: ${compositionPath}`)
  }

  let rawComposition: unknown

  try {
    rawComposition = JSON.parse(fs.readFileSync(compositionPath, 'utf8'))
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid composition JSON: ${error.message}`)
    }

    throw error
  }

  return new CompositionParser().parse(rawComposition)
}
