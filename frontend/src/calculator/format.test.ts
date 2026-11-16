import { describe, expect, it } from 'vitest'
import { formatNumber } from './format'

describe('formatNumber', () => {
  it.each([
    [0, '0'],
    [-0, '0'],
    [19, '19'],
    [-8, '-8'],
    [2.5, '2.5'],
    [0.30000000000000004, '0.3'],
    [1 / 3, '0.333333333333'],
    [2 / 3, '0.666666666667'],
    [1024, '1024'],
    [123456789012, '123456789012'],
    [123456789012345, '123456789012000'],
    [100000, '100000'],
    [0.000001, '0.000001'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatNumber(input)).toBe(expected)
  })

  it.each([
    [1.5e21, '1.5e+21'],
    [1e15, '1e+15'],
    [-2e30, '-2e+30'],
    [1.7e308, '1.7e+308'],
    [1234567890123456, '1.23456789012e+15'],
    [1e-7, '1e-7'],
    [-2.5e-10, '-2.5e-10'],
    [5e-324, '5e-324'],
  ])('uses exponent notation for %s', (input, expected) => {
    expect(formatNumber(input)).toBe(expected)
  })

  it('falls back to plain text for non-finite values', () => {
    expect(formatNumber(Infinity)).toBe('Infinity')
    expect(formatNumber(NaN)).toBe('NaN')
  })
})
