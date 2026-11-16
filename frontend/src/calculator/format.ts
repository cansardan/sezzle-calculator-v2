const SIGNIFICANT_DIGITS = 12
const EXPONENT_ABOVE = 1e15
const EXPONENT_BELOW = 1e-6

/**
 * Formats a number for display only. The exact value is kept elsewhere;
 * this rounds to 12 significant digits, strips trailing zeros, hides -0 and
 * switches to exponent notation for very large or very small magnitudes.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value)
  if (value === 0) return '0'

  const rounded = Number(value.toPrecision(SIGNIFICANT_DIGITS))
  const magnitude = Math.abs(rounded)
  if (magnitude >= EXPONENT_ABOVE || magnitude < EXPONENT_BELOW) {
    return rounded.toExponential()
  }
  return String(rounded)
}
