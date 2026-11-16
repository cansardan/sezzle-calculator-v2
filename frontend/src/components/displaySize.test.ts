import { describe, expect, it } from 'vitest'
import css from '../styles.css?raw'
import { formatDisplay } from '../calculator/format'
import { expressionSizeClass, valueSizeClass } from './displaySize'

const MIN_DISPLAY_WIDTH_PX = 240
const REM_PX = 16
const CHAR_WIDTH_EM = 0.62

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.]/g, '\\.')
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css)
  if (!match) throw new Error(`no CSS rule for ${selector}`)
  return match[1] ?? ''
}

function fontSizePx(selector: string): number {
  const match = /font-size:\s*([\d.]+)rem/.exec(ruleBody(selector))
  if (!match) throw new Error(`no rem font-size for ${selector}`)
  return Number(match[1]) * REM_PX
}

function valueFontPx(text: string): number {
  const className = valueSizeClass(text)
  return fontSizePx(className === '' ? '.display__value' : `.${className}`)
}

const LARGE_VALUES = [
  0,
  -0.5,
  1234567890,
  -1234567890,
  1234567890123456,
  -1234567890123456,
  999999999999 * 999999999999,
  -999999999999 * 999999999999,
  1e21,
  1e300,
  -1.23456789012e308,
  1.7976931348623157e308,
  1e-7,
  -9.99999999999e-300,
  5e-324,
  123456.789012,
]

describe('display sizing', () => {
  it.each(LARGE_VALUES)('fits %s on the narrowest screen without scrolling', (value) => {
    const text = formatDisplay(value)
    const estimatedWidth = text.length * CHAR_WIDTH_EM * valueFontPx(text)
    expect(estimatedWidth).toBeLessThanOrEqual(MIN_DISPLAY_WIDTH_PX)
  })

  it('also fits the longest number you can type (16 digits, sign and commas)', () => {
    const text = '-1,234,567,890,123,456'
    expect(text.length * CHAR_WIDTH_EM * valueFontPx(text)).toBeLessThanOrEqual(MIN_DISPLAY_WIDTH_PX)
  })

  it('never makes longer text bigger than shorter text', () => {
    const sizes = Array.from({ length: 30 }, (_, i) => valueFontPx('1'.repeat(i + 1)))
    for (let i = 1; i < sizes.length; i++) expect(sizes[i]).toBeLessThanOrEqual(sizes[i - 1] ?? Infinity)
  })

  it('shrinks the expression line for long expressions', () => {
    expect(expressionSizeClass('12 + 7')).toBe('')
    expect(expressionSizeClass('999999999999 × 999999999999')).toBe('')
    expect(expressionSizeClass('9.99999999998e+23 × 9.99999999998e+23')).toBe('display__expression--xs')
    expect(expressionSizeClass('1,234,567,890 × 1,234,567,890')).toBe('display__expression--sm')
  })
})

describe('display CSS height', () => {
  const sizeClasses = [
    '.display__value--md',
    '.display__value--sm',
    '.display__value--xs',
    '.display__value--xxs',
    '.display__value--xxxs',
    '.display__value--busy',
    '.display__expression--sm',
    '.display__expression--xs',
  ]

  it.each(['.display__value', '.display__expression'])(
    '%s has a fixed height equal to its line height, so font changes never resize the display',
    (selector) => {
      const body = ruleBody(selector)
      const height = /(?:^|[\s;])height:\s*([\d.]+rem)/.exec(body)?.[1]
      const lineHeight = /line-height:\s*([\d.]+rem)/.exec(body)?.[1]
      expect(height).toBeDefined()
      expect(lineHeight).toBe(height)
      expect(body).not.toMatch(/min-height/)
    },
  )

  it.each(sizeClasses)('%s only changes font size, never height', (selector) => {
    expect(ruleBody(selector)).not.toMatch(/height/)
  })

  it('keeps the largest value font inside the fixed height', () => {
    const height = Number(/(?:^|[\s;])height:\s*([\d.]+)rem/.exec(ruleBody('.display__value'))?.[1]) * REM_PX
    expect(fontSizePx('.display__value')).toBeLessThanOrEqual(height)
  })
})

describe('display CSS', () => {
  it.each(['.display__value', '.display__expression'])('%s never shows scrollbars', (selector) => {
    const body = ruleBody(selector)
    expect(body).toMatch(/overflow:\s*hidden/)
    expect(body).not.toMatch(/overflow(-[xy])?:\s*(auto|scroll)/)
  })
})
