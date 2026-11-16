import { describe, expect, it } from 'vitest'
import css from '../styles.css?raw'
import { formatDisplay } from '../calculator/format'
import { textWidthEm } from './displaySize'

const REM_PX = 16
const MIN_DISPLAY_WIDTH_PX = 240

function ruleBody(selector: string): string {
  const escaped = selector.replace(/[.]/g, '\\.')
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css)
  if (!match) throw new Error(`no CSS rule for ${selector}`)
  return match[1] ?? ''
}

const LARGE_VALUES = [
  0,
  -0.5,
  22876792455000,
  1234567890,
  -1234567890,
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

describe('textWidthEm', () => {
  it('never returns less than 1em, even for empty text', () => {
    expect(textWidthEm('')).toBe(1)
  })

  it('counts digits wider than separators', () => {
    expect(textWidthEm('1,234')).toBeCloseTo(4 * 0.7 + 0.38, 2)
    expect(textWidthEm('0.5')).toBeCloseTo(0.7 + 0.38 + 0.7, 2)
  })

  it('counts operators and spaces in expressions', () => {
    expect(textWidthEm('12 + 7')).toBeCloseTo(3 * 0.7 + 2 * 0.35 + 0.84, 2)
    expect(textWidthEm('2 \u00d7 3')).toBeGreaterThan(textWidthEm('2 - 3'))
  })

  it('grows with longer text', () => {
    const widths = Array.from({ length: 30 }, (_, i) => textWidthEm('1'.repeat(i + 1)))
    for (let i = 1; i < widths.length; i++) expect(widths[i]).toBeGreaterThan(widths[i - 1] ?? 0)
  })
})

describe('result font size', () => {
  const maxFontPx = Number(/min\(([\d.]+)rem/.exec(ruleBody('.display__value'))?.[1]) * REM_PX

  it.each(LARGE_VALUES)('fits %s on the narrowest screen', (value) => {
    const text = formatDisplay(value)
    const fontPx = Math.min(maxFontPx, MIN_DISPLAY_WIDTH_PX / textWidthEm(text))
    expect(textWidthEm(text) * fontPx).toBeLessThanOrEqual(MIN_DISPLAY_WIDTH_PX + 0.001)
  })

  it('uses most of the display width for a typical long number', () => {
    const text = formatDisplay(22876792455000)
    const fontPx = Math.min(maxFontPx, 280 / textWidthEm(text))
    expect(fontPx).toBeGreaterThanOrEqual(22)
  })

  it('keeps full size for short numbers', () => {
    expect(Math.min(maxFontPx, 280 / textWidthEm('1,234'))).toBe(maxFontPx)
  })
})

describe('display CSS', () => {
  it('sizes the value and expression from the display width and text width', () => {
    expect(ruleBody('.display')).toMatch(/container-type:\s*inline-size/)
    for (const selector of ['.display__value', '.display__expression']) {
      expect(ruleBody(selector)).toMatch(/font-size:[^;]*100cqw\s*\/\s*var\(--text-em/)
    }
  })

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

  it('keeps the busy state from changing height', () => {
    expect(ruleBody('.display__value--busy')).not.toMatch(/height/)
  })

  it.each(['.display__value', '.display__expression'])('%s never shows scrollbars', (selector) => {
    const body = ruleBody(selector)
    expect(body).toMatch(/overflow:\s*hidden/)
    expect(body).not.toMatch(/overflow(-[xy])?:\s*(auto|scroll)/)
  })
})
