import { describe, expect, it } from 'vitest'
import {
  INVALID_NUMBER_MESSAGE,
  MAX_DIGITS,
  TOO_LONG_MESSAGE,
  displayText,
  expressionText,
  initialState,
  reduce,
  type BinaryOperator,
  type CalculatorAction,
  type CalculatorState,
} from './reducer'

function run(actions: CalculatorAction[], from: CalculatorState = initialState): CalculatorState {
  return actions.reduce(reduce, from)
}

const digits = (text: string): CalculatorAction[] =>
  [...text].map((c) => (c === '.' ? { type: 'decimal' } : { type: 'digit', digit: c })) as CalculatorAction[]
const op = (operator: BinaryOperator): CalculatorAction => ({ type: 'operator', operator })
const equals: CalculatorAction = { type: 'equals' }

function resolveWith(state: CalculatorState, result: number): CalculatorState {
  if (!state.pending) throw new Error('expected a pending request')
  return reduce(state, { type: 'resolved', id: state.pending.id, result })
}

describe('typing numbers', () => {
  it('starts at 0', () => {
    expect(displayText(initialState)).toBe('0')
    expect(expressionText(initialState)).toBe('')
  })

  it('collapses leading zeros', () => {
    expect(displayText(run(digits('007')))).toBe('7')
    expect(displayText(run(digits('000')))).toBe('0')
  })

  it('shows a leading zero before a bare decimal point', () => {
    expect(displayText(run(digits('.5')))).toBe('0.5')
  })

  it('allows only one decimal point', () => {
    expect(displayText(run(digits('1.2.3')))).toBe('1.23')
  })

  it('limits entry to 16 digits and ignores the rest', () => {
    const state = run(digits('12345678901234567890'))
    expect(state.entry).toBe('1234567890123456')
    expect(state.entry.length).toBe(MAX_DIGITS)
    expect(displayText(run([...digits('1234567890123456'), { type: 'decimal' }]))).toBe('1,234,567,890,123,456')
  })

  it('does not count the sign or the point towards the limit', () => {
    const state = run([...digits('0.123456789012345'), { type: 'toggleSign' }])
    expect(state.entry).toBe('-0.123456789012345')
    expect(displayText(run([...digits('123456789012345'), { type: 'decimal' }, { type: 'digit', digit: '6' }]))).toBe('123,456,789,012,345.6')
  })

  it('toggles the sign', () => {
    const negative = run([...digits('5'), { type: 'toggleSign' }])
    expect(displayText(negative)).toBe('-5')
    expect(displayText(reduce(negative, { type: 'toggleSign' }))).toBe('5')
  })

  it('toggles the sign before any digit and keeps typing the negative number', () => {
    const state = run([{ type: 'toggleSign' }, ...digits('1')])
    expect(displayText(state)).toBe('-1')
  })

  it('keeps a negative zero entry typeable', () => {
    const state = run([...digits('0'), { type: 'toggleSign' }, ...digits('4')])
    expect(displayText(state)).toBe('-4')
  })

  it('backspace deletes the last character', () => {
    expect(displayText(run([...digits('123'), { type: 'backspace' }]))).toBe('12')
  })

  it('backspace back to empty shows 0, including after a sign', () => {
    expect(displayText(run([...digits('1'), { type: 'backspace' }]))).toBe('0')
    expect(run([...digits('5'), { type: 'toggleSign' }, { type: 'backspace' }, { type: 'backspace' }]).entry).toBe('')
    expect(run([{ type: 'backspace' }])).toEqual(initialState)
  })

  it('clear resets everything', () => {
    expect(run([...digits('12'), op('add'), ...digits('3'), { type: 'clear' }])).toEqual(initialState)
  })
})

describe('operators and requests', () => {
  it('shows the first number and operator in the expression line', () => {
    const state = run([...digits('15'), op('percent')])
    expect(expressionText(state)).toBe('15 % of')
    expect(displayText(state)).toBe('15')
    expect(run([...digits('15'), op('percent'), ...digits('200')]).entry).toBe('200')
    expect(expressionText(run([...digits('15'), op('percent'), ...digits('200')]))).toBe('15 % of 200')
  })

  it('replaces the operator when pressed again before a second number', () => {
    const state = run([...digits('5'), op('add'), op('multiply')])
    expect(state.operator).toBe('multiply')
    expect(state.pending).toBeNull()
    expect(expressionText(state)).toBe('5 ×')
  })

  it('uses 0 as the first operand when an operator is pressed with nothing typed', () => {
    expect(run([op('subtract')]).left).toBe(0)
  })

  it('builds a request on equals', () => {
    const state = run([...digits('12'), op('add'), ...digits('7'), equals])
    expect(state.pending?.request).toEqual({ operation: 'add', a: 12, b: 7 })
    expect(expressionText(state)).toBe('12 + 7')
  })

  it('sends percent as a=percentage, b=base', () => {
    const state = run([...digits('15'), op('percent'), ...digits('200'), equals])
    expect(state.pending?.request).toEqual({ operation: 'percent', a: 15, b: 200 })
    expect(expressionText(state)).toBe('15 % of 200')
  })

  it('does nothing on equals with an incomplete expression', () => {
    expect(run([...digits('5'), equals]).pending).toBeNull()
    expect(run([...digits('5'), op('add'), equals]).pending).toBeNull()
    expect(run([equals])).toEqual(initialState)
  })

  it('shows the result and allows a new number after it', () => {
    const state = resolveWith(run([...digits('12'), op('add'), ...digits('7'), equals]), 19)
    expect(displayText(state)).toBe('19')
    expect(expressionText(state)).toBe('12 + 7')
    expect(state.pending).toBeNull()

    const fresh = run(digits('4'), state)
    expect(displayText(fresh)).toBe('4')
    expect(expressionText(fresh)).toBe('')
    expect(fresh.left).toBeNull()
  })

  it('starts a new number from a result with a decimal point', () => {
    const state = resolveWith(run([...digits('1'), op('add'), ...digits('2'), equals]), 3)
    expect(displayText(run([{ type: 'decimal' }], state))).toBe('0.')
  })

  it('continues from a result when an operator is pressed', () => {
    const state = resolveWith(run([...digits('2'), op('add'), ...digits('3'), equals]), 5)
    const next = run([op('multiply')], state)
    expect(next.left).toBe(5)
    expect(next.operator).toBe('multiply')
    expect(expressionText(next)).toBe('5 ×')
  })

  it('backspace on a result does nothing', () => {
    const state = resolveWith(run([...digits('2'), op('add'), ...digits('3'), equals]), 5)
    expect(run([{ type: 'backspace' }], state)).toEqual(state)
  })

  it('can toggle the sign of a result', () => {
    const state = resolveWith(run([...digits('2'), op('add'), ...digits('3'), equals]), 5)
    expect(displayText(run([{ type: 'toggleSign' }], state))).toBe('-5')
  })

  it('chains left to right without precedence', () => {
    const afterThree = run([...digits('2'), op('add'), ...digits('3'), op('multiply')])
    expect(afterThree.pending?.request).toEqual({ operation: 'add', a: 2, b: 3 })
    expect(afterThree.pending?.after).toEqual({ kind: 'chain', operator: 'multiply' })

    const resolved = resolveWith(afterThree, 5)
    expect(resolved.left).toBe(5)
    expect(resolved.operator).toBe('multiply')
    expect(expressionText(resolved)).toBe('5 ×')

    const final = run([...digits('4'), equals], resolved)
    expect(final.pending?.request).toEqual({ operation: 'multiply', a: 5, b: 4 })
  })

  it('keeps full precision of the result as the next operand', () => {
    const state = resolveWith(run([...digits('0.1'), op('add'), ...digits('0.2'), equals]), 0.30000000000000004)
    expect(displayText(state)).toBe('0.3')
    expect(run([op('add'), ...digits('1'), equals], state).pending?.request.a).toBe(0.30000000000000004)
  })

  it('formats large results with exponent notation', () => {
    const state = resolveWith(run([...digits('9'), op('power'), ...digits('9'), equals]), 1.5e21)
    expect(displayText(state)).toBe('1.5e+21')
  })

  it('treats -0 as 0 on display', () => {
    const state = resolveWith(run([...digits('0'), op('multiply'), ...digits('5'), equals]), -0)
    expect(displayText(state)).toBe('0')
  })

  it('shows 0, not -0, when the sign is toggled on an empty or zero entry', () => {
    expect(displayText(run([{ type: 'toggleSign' }]))).toBe('0')
    expect(displayText(run([...digits('0'), { type: 'toggleSign' }]))).toBe('0')
  })

  it('groups thousands in typed numbers, results and the expression line', () => {
    const typing = run([...digits('1234567.5')])
    expect(displayText(typing)).toBe('1,234,567.5')
    expect(displayText(run([...digits('1234.')]))).toBe('1,234.')
    expect(displayText(run([...digits('1234'), { type: 'toggleSign' }]))).toBe('-1,234')
    const pending = run([...digits('1500'), op('add'), ...digits('2500'), equals])
    expect(pending.pending?.request).toEqual({ operation: 'add', a: 1500, b: 2500 })
    expect(expressionText(pending)).toBe('1,500 + 2,500')
    expect(displayText(resolveWith(pending, 4000))).toBe('4,000')
  })

  it('sends a unary request for square root', () => {
    const state = run([...digits('81'), { type: 'sqrt' }])
    expect(state.pending?.request).toEqual({ operation: 'sqrt', a: 81 })
    expect(Object.keys(state.pending!.request)).not.toContain('b')
    expect(expressionText(state)).toBe('√81')

    const done = resolveWith(state, 9)
    expect(displayText(done)).toBe('9')
    expect(expressionText(done)).toBe('√81')
  })

  it('applies square root to the shown number mid-expression and keeps the pending operator', () => {
    const typed = run([...digits('5'), op('add'), ...digits('9'), { type: 'sqrt' }])
    const done = resolveWith(typed, 3)
    expect(displayText(done)).toBe('3')
    expect(done.operator).toBe('add')
    expect(done.left).toBe(5)
    expect(run([equals], done).pending?.request).toEqual({ operation: 'add', a: 5, b: 3 })
  })

  it('applies square root to the first number when the operator was just pressed', () => {
    const state = run([...digits('16'), op('add'), { type: 'sqrt' }])
    expect(state.pending?.request).toEqual({ operation: 'sqrt', a: 16 })
  })

  it('applies square root to 0 when nothing is typed', () => {
    expect(run([{ type: 'sqrt' }]).pending?.request).toEqual({ operation: 'sqrt', a: 0 })
  })

  it('sends a signed zero entry as a finite number', () => {
    const state = run([...digits('0'), op('power'), { type: 'toggleSign' }, ...digits('1'), equals])
    expect(state.pending?.request).toEqual({ operation: 'power', a: 0, b: -1 })
  })
})

describe('pending state', () => {
  const pendingState = run([...digits('12'), op('add'), ...digits('7'), equals])

  it('ignores every key except clear while a request is in flight', () => {
    const actions: CalculatorAction[] = [
      { type: 'digit', digit: '1' },
      { type: 'decimal' },
      { type: 'toggleSign' },
      { type: 'backspace' },
      op('multiply'),
      equals,
      { type: 'sqrt' },
      { type: 'paste', text: '5' },
    ]
    for (const action of actions) {
      expect(reduce(pendingState, action)).toBe(pendingState)
    }
  })

  it('ignores a response for a different request', () => {
    const stale = reduce(pendingState, { type: 'resolved', id: pendingState.pending!.id + 1, result: 99 })
    expect(stale).toBe(pendingState)
    expect(reduce(pendingState, { type: 'failed', id: 999, message: 'x' })).toBe(pendingState)
  })

  it('ignores a response when nothing is pending', () => {
    expect(reduce(initialState, { type: 'resolved', id: 1, result: 5 })).toBe(initialState)
  })

  it('clear cancels the request and its late response is ignored', () => {
    const id = pendingState.pending!.id
    const cleared = reduce(pendingState, { type: 'clear' })
    expect(cleared.pending).toBeNull()
    expect(displayText(cleared)).toBe('0')
    expect(reduce(cleared, { type: 'resolved', id, result: 19 })).toBe(cleared)
  })

  it('does not reuse request ids after clear', () => {
    const cleared = reduce(pendingState, { type: 'clear' })
    const next = run([...digits('1'), op('add'), ...digits('1'), equals], cleared)
    expect(next.pending!.id).toBeGreaterThan(pendingState.pending!.id)
  })

  it('a failure keeps the expression visible and shows the message', () => {
    const failed = reduce(pendingState, { type: 'failed', id: pendingState.pending!.id, message: 'Cannot divide by zero.' })
    expect(failed.error).toBe('Cannot divide by zero.')
    expect(failed.pending).toBeNull()
    expect(expressionText(failed)).toBe('12 + 7')
    expect(displayText(failed)).toBe('7')
  })

  it('clears the error on the next key press', () => {
    const failed = reduce(pendingState, { type: 'failed', id: pendingState.pending!.id, message: 'boom' })
    expect(reduce(failed, { type: 'digit', digit: '1' }).error).toBeNull()
  })

  it('a successful result clears an earlier error', () => {
    const failed = reduce(pendingState, { type: 'failed', id: pendingState.pending!.id, message: 'boom' })
    const retry = run([equals], failed)
    expect(retry.error).toBeNull()
    expect(resolveWith(retry, 19).error).toBeNull()
  })
})

describe('guarding operands', () => {
  it('refuses to build a request with a non-finite operand', () => {
    const broken: CalculatorState = { ...initialState, left: Infinity, operator: 'add', entry: '1' }
    const next = reduce(broken, { type: 'equals' })
    expect(next.pending).toBeNull()
    expect(next.error).toBe(INVALID_NUMBER_MESSAGE)
  })

  it('refuses to start from a non-finite entry', () => {
    const broken: CalculatorState = { ...initialState, entry: 'abc' }
    const next = reduce(broken, op('add'))
    expect(next.operator).toBeNull()
    expect(next.error).toBe(INVALID_NUMBER_MESSAGE)
  })
})

describe('paste', () => {
  const pasted = (text: string, from: CalculatorState = initialState) => reduce(from, { type: 'paste', text })

  it.each([
    ['42', '42'],
    ['  3.14\n', '3.14'],
    ['-7', '-7'],
    ['+7', '7'],
    ['.5', '0.5'],
    ['007', '7'],
    ['-0.5', '-0.5'],
    ['5.', '5'],
    ['0', '0'],
  ])('accepts %j as %s', (text, entry) => {
    const next = pasted(text)
    expect(next.entry).toBe(entry)
    expect(next.error).toBeNull()
  })

  it.each(['', '   ', 'abc', 'Infinity', '-Infinity', 'NaN', '0x10', '1e5', '1,234', '1 2', '--1', '.', '-', '1.2.3', '12abc'])(
    'rejects %j',
    (text) => {
      const next = pasted(text, run(digits('9')))
      expect(next.error).toBe(INVALID_NUMBER_MESSAGE)
      expect(next.entry).toBe('9')
      expect(next.pending).toBeNull()
    },
  )

  it('rejects numbers that are too long', () => {
    expect(pasted('12345678901234567').error).toBe(TOO_LONG_MESSAGE)
    expect(pasted('1234567890123456').error).toBeNull()
  })

  it('rejects pasted numbers that overflow to infinity', () => {
    expect(pasted('9'.repeat(400)).error).not.toBeNull()
  })

  it('replaces the second number mid-expression', () => {
    const next = pasted('200', run([...digits('15'), op('percent')]))
    expect(expressionText(next)).toBe('15 % of 200')
  })

  it('replaces a result and starts fresh', () => {
    const result = resolveWith(run([...digits('1'), op('add'), ...digits('1'), equals]), 2)
    const next = pasted('8', result)
    expect(next.entry).toBe('8')
    expect(next.locked).toBe(false)
    expect(expressionText(next)).toBe('')
  })
})
