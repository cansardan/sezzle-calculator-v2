import { useEffect, type Dispatch } from 'react'
import type { BinaryOperator, CalculatorAction } from '../calculator/reducer'

const OPERATOR_KEYS: Record<string, BinaryOperator> = {
  '+': 'add',
  '-': 'subtract',
  '*': 'multiply',
  '/': 'divide',
  '^': 'power',
  '%': 'percent',
}

export function actionForKey(key: string): CalculatorAction | null {
  if (/^[0-9]$/.test(key)) return { type: 'digit', digit: key }
  if (key === '.') return { type: 'decimal' }
  if (key in OPERATOR_KEYS) return { type: 'operator', operator: OPERATOR_KEYS[key] }
  if (key === '=' || key === 'Enter') return { type: 'equals' }
  if (key === 'Backspace') return { type: 'backspace' }
  if (key === 'Escape' || key === 'c' || key === 'C') return { type: 'clear' }
  return null
}

/** Physical keyboard and paste support. Enter on a focused button is left to the browser. */
export function useKeyboard(dispatch: Dispatch<CalculatorAction>) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return
      const onButton = event.target instanceof HTMLElement && event.target.closest('button') !== null
      if (onButton && (event.key === 'Enter' || event.key === ' ')) return

      const action = actionForKey(event.key)
      if (!action) return
      event.preventDefault()
      dispatch(action)
    }

    function onPaste(event: ClipboardEvent) {
      event.preventDefault()
      dispatch({ type: 'paste', text: event.clipboardData?.getData('text') ?? '' })
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('paste', onPaste)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('paste', onPaste)
    }
  }, [dispatch])
}
