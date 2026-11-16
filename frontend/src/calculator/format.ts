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

/**
 * Inserts thousands separators into the integer part of a plain decimal
 * string (typed or formatted). Exponent notation and non-numbers are left alone.
 */
export function groupThousands(text: string): string {
  const match = /^(-?)(\d+)(\.\d*)?$/.exec(text)
  if (!match) return text
  const [, sign = '', whole = '', fraction = ''] = match
  return `${sign}${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction}`
}

/** Display text for a number: rounded, with thousands separators. */
export function formatDisplay(value: number): string {
  return groupThousands(formatNumber(value))
}
