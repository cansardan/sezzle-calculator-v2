/**
 * Picks a font-size class from the text length so the text always fits the
 * display without scrolling. The steps assume tabular digits are about
 * 0.62em wide and that the display is at least 240px wide (a 320px screen).
 */
const VALUE_STEPS: ReadonlyArray<readonly [maxLength: number, className: string]> = [
  [9, ''],
  [11, 'display__value--md'],
  [13, 'display__value--sm'],
  [16, 'display__value--xs'],
  [19, 'display__value--xxs'],
]

export const SMALLEST_VALUE_CLASS = 'display__value--xxxs'

export function valueSizeClass(text: string): string {
  for (const [maxLength, className] of VALUE_STEPS) {
    if (text.length <= maxLength) return className
  }
  return SMALLEST_VALUE_CLASS
}

export function expressionSizeClass(text: string): string {
  if (text.length <= 28) return ''
  if (text.length <= 32) return 'display__expression--sm'
  return 'display__expression--xs'
}
