import type { Dispatch } from 'react'
import type { CalculatorAction } from '../calculator/reducer'

interface KeyDef {
  label: string
  name: string
  action: CalculatorAction
  variant: 'digit' | 'operator' | 'function' | 'equals'
  wide?: boolean
}

const op = (operator: Extract<CalculatorAction, { type: 'operator' }>['operator']): CalculatorAction => ({ type: 'operator', operator })
const digit = (d: string): KeyDef => ({ label: d, name: d, action: { type: 'digit', digit: d }, variant: 'digit' })

export const KEYS: KeyDef[] = [
  { label: 'xʸ', name: 'power', action: op('power'), variant: 'operator', wide: true },
  { label: '% of', name: 'percent of', action: op('percent'), variant: 'operator', wide: true },
  { label: 'C', name: 'clear', action: { type: 'clear' }, variant: 'function' },
  { label: '⌫', name: 'backspace', action: { type: 'backspace' }, variant: 'function' },
  { label: '√', name: 'square root', action: { type: 'sqrt' }, variant: 'function' },
  { label: '÷', name: 'divide', action: op('divide'), variant: 'operator' },
  digit('7'), digit('8'), digit('9'),
  { label: '×', name: 'multiply', action: op('multiply'), variant: 'operator' },
  digit('4'), digit('5'), digit('6'),
  { label: '−', name: 'subtract', action: op('subtract'), variant: 'operator' },
  digit('1'), digit('2'), digit('3'),
  { label: '+', name: 'add', action: op('add'), variant: 'operator' },
  { label: '±', name: 'toggle sign', action: { type: 'toggleSign' }, variant: 'function' },
  digit('0'),
  { label: '.', name: 'decimal point', action: { type: 'decimal' }, variant: 'digit' },
  { label: '=', name: 'equals', action: { type: 'equals' }, variant: 'equals' },
]

interface KeypadProps {
  dispatch: Dispatch<CalculatorAction>
  busy: boolean
}

export function Keypad({ dispatch, busy }: KeypadProps) {
  return (
    <div className="keypad">
      {KEYS.map((key) => (
        <button
          key={key.name}
          type="button"
          className={`key key--${key.variant}${key.wide ? ' key--wide' : ''}`}
          aria-label={key.name}
          disabled={busy && key.action.type !== 'clear'}
          onClick={() => dispatch(key.action)}
        >
          {key.label}
        </button>
      ))}
    </div>
  )
}
