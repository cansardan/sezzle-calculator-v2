import { formatNumber } from './format'

export type BinaryOperator = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'percent'

export interface PendingRequest {
  id: number
  request: { operation: BinaryOperator | 'sqrt'; a: number; b?: number }
  expression: string
  after: { kind: 'result' } | { kind: 'chain'; operator: BinaryOperator }
}

export interface CalculatorState {
  /** Text of the number being typed, or the exact value of a computed result. */
  entry: string
  /** True when `entry` is a computed result rather than something typed. */
  locked: boolean
  /** Exact first operand and the operator waiting for a second operand. */
  left: number | null
  operator: BinaryOperator | null
  /** Expression kept after a result, for the expression line. */
  lastExpression: string
  pending: PendingRequest | null
  nextId: number
  error: string | null
}

export type CalculatorAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'toggleSign' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'operator'; operator: BinaryOperator }
  | { type: 'equals' }
  | { type: 'sqrt' }
  | { type: 'paste'; text: string }
  | { type: 'resolved'; id: number; result: number }
  | { type: 'failed'; id: number; message: string }

export const MAX_DIGITS = 16
export const INVALID_NUMBER_MESSAGE = "That isn't a valid number."
export const TOO_LONG_MESSAGE = `Numbers can have at most ${MAX_DIGITS} digits.`

export const OPERATOR_SYMBOLS: Record<BinaryOperator, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
  percent: '% of',
}

export const initialState: CalculatorState = {
  entry: '',
  locked: false,
  left: null,
  operator: null,
  lastExpression: '',
  pending: null,
  nextId: 1,
  error: null,
}

const PASTE_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)$/

function digitCount(text: string): number {
  return text.replace(/[^0-9]/g, '').length
}

function entryValue(state: CalculatorState): number {
  return state.entry === '' ? 0 : Number(state.entry)
}

/** The number the display shows, as text. */
export function displayText(state: CalculatorState): string {
  if (state.entry === '') {
    return state.operator !== null && state.left !== null ? formatNumber(state.left) : '0'
  }
  return state.locked ? formatNumber(Number(state.entry)) : state.entry
}

/** The small line above the display, for example `15 % of 200`. */
export function expressionText(state: CalculatorState): string {
  if (state.pending) return state.pending.expression
  if (state.operator !== null && state.left !== null) {
    const base = `${formatNumber(state.left)} ${OPERATOR_SYMBOLS[state.operator]}`
    return state.entry === '' ? base : `${base} ${displayText(state)}`
  }
  return state.lastExpression
}

function startRequest(state: CalculatorState, request: PendingRequest['request'], expression: string, after: PendingRequest['after']): CalculatorState {
  const operands = request.b === undefined ? [request.a] : [request.a, request.b]
  if (!operands.every(Number.isFinite)) {
    return { ...state, error: INVALID_NUMBER_MESSAGE }
  }
  return { ...state, pending: { id: state.nextId, request, expression, after }, nextId: state.nextId + 1 }
}

function typeDigit(state: CalculatorState, digit: string): CalculatorState {
  if (state.locked || state.entry === '') {
    return { ...state, entry: digit, locked: false, ...(state.operator === null ? { left: null, lastExpression: '' } : {}) }
  }
  if (digitCount(state.entry) >= MAX_DIGITS) return state
  if (state.entry === '0') return { ...state, entry: digit }
  if (state.entry === '-0') return { ...state, entry: `-${digit}` }
  return { ...state, entry: state.entry + digit }
}

function typeDecimal(state: CalculatorState): CalculatorState {
  if (state.locked || state.entry === '') {
    return { ...state, entry: '0.', locked: false, ...(state.operator === null ? { left: null, lastExpression: '' } : {}) }
  }
  if (state.entry.includes('.') || digitCount(state.entry) >= MAX_DIGITS) return state
  return { ...state, entry: `${state.entry}.` }
}

function toggleSign(state: CalculatorState): CalculatorState {
  if (state.entry === '') return { ...state, entry: '-0' }
  const entry = state.entry.startsWith('-') ? state.entry.slice(1) : `-${state.entry}`
  return { ...state, entry }
}

function backspace(state: CalculatorState): CalculatorState {
  if (state.locked || state.entry === '') return state
  const entry = state.entry.slice(0, -1)
  return { ...state, entry: entry === '' || entry === '-' ? '' : entry }
}

function pressOperator(state: CalculatorState, operator: BinaryOperator): CalculatorState {
  if (state.operator !== null && state.left !== null) {
    if (state.entry === '') return { ...state, operator }
    const b = entryValue(state)
    const expression = `${formatNumber(state.left)} ${OPERATOR_SYMBOLS[state.operator]} ${formatNumber(b)}`
    return startRequest(state, { operation: state.operator, a: state.left, b }, expression, { kind: 'chain', operator })
  }
  const left = entryValue(state)
  if (!Number.isFinite(left)) return { ...state, error: INVALID_NUMBER_MESSAGE }
  return { ...state, left, operator, entry: '', locked: false, lastExpression: '' }
}

function pressEquals(state: CalculatorState): CalculatorState {
  if (state.operator === null || state.left === null || state.entry === '') return state
  const b = entryValue(state)
  const expression = `${formatNumber(state.left)} ${OPERATOR_SYMBOLS[state.operator]} ${formatNumber(b)}`
  return startRequest(state, { operation: state.operator, a: state.left, b }, expression, { kind: 'result' })
}

function pressSqrt(state: CalculatorState): CalculatorState {
  const a = state.entry === '' && state.operator !== null && state.left !== null ? state.left : entryValue(state)
  return startRequest(state, { operation: 'sqrt', a }, `√${formatNumber(a)}`, { kind: 'result' })
}

function paste(state: CalculatorState, text: string): CalculatorState {
  const trimmed = text.trim()
  if (!PASTE_PATTERN.test(trimmed)) return { ...state, error: INVALID_NUMBER_MESSAGE }

  const negative = trimmed.startsWith('-')
  const unsigned = trimmed.replace(/^[+-]/, '')
  const [whole = '', fraction] = unsigned.split('.')
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || '0'
  const normalized = `${negative ? '-' : ''}${normalizedWhole}${fraction ? `.${fraction}` : ''}`

  if (!Number.isFinite(Number(normalized))) return { ...state, error: INVALID_NUMBER_MESSAGE }
  if (digitCount(normalized) > MAX_DIGITS) return { ...state, error: TOO_LONG_MESSAGE }

  return { ...state, entry: normalized, locked: false, ...(state.operator === null ? { left: null, lastExpression: '' } : {}) }
}

function resolve(state: CalculatorState, pending: PendingRequest, result: number): CalculatorState {
  const base = { ...state, pending: null, error: null }
  if (pending.after.kind === 'chain') {
    return { ...base, left: result, operator: pending.after.operator, entry: '', locked: false, lastExpression: '' }
  }
  if (pending.request.operation === 'sqrt' && state.operator !== null) {
    return { ...base, entry: String(result), locked: true }
  }
  return { ...base, left: null, operator: null, entry: String(result), locked: true, lastExpression: pending.expression }
}

export function reduce(state: CalculatorState, action: CalculatorAction): CalculatorState {
  if (action.type === 'resolved' || action.type === 'failed') {
    if (!state.pending || state.pending.id !== action.id) return state
    return action.type === 'resolved'
      ? resolve(state, state.pending, action.result)
      : { ...state, pending: null, error: action.message }
  }

  if (action.type === 'clear') return { ...initialState, nextId: state.nextId }

  if (state.pending) return state

  const next: CalculatorState = { ...state, error: null }
  switch (action.type) {
    case 'digit':
      return typeDigit(next, action.digit)
    case 'decimal':
      return typeDecimal(next)
    case 'toggleSign':
      return toggleSign(next)
    case 'backspace':
      return backspace(next)
    case 'operator':
      return pressOperator(next, action.operator)
    case 'equals':
      return pressEquals(next)
    case 'sqrt':
      return pressSqrt(next)
    case 'paste':
      return paste(next, action.text)
  }
}
