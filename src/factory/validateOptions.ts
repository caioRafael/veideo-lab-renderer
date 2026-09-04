export function parsePositiveInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw new Error(
      `Invalid ${label}: expected a positive integer, received ${String(value)}`,
    )
  }

  return value
}

export function parseNonNegativeInteger(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(
      `Invalid ${label}: expected a non-negative integer, received ${String(value)}`,
    )
  }

  return value
}
