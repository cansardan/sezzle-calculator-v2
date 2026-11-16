import { createCalculatorApi, type CalculatorApi } from './api/calculatorApi'
import { displayText, expressionText } from './calculator/reducer'
import { Display } from './components/Display'
import { Keypad } from './components/Keypad'
import { useCalculator } from './hooks/useCalculator'
import { useDelayedFlag } from './hooks/useDelayedFlag'
import { useKeyboard } from './hooks/useKeyboard'

const defaultApi = createCalculatorApi()

/** Calculations are normally instant, so the busy state only appears if a request takes longer than this. */
export const SLOW_REQUEST_MS = 1000

interface AppProps {
  api?: CalculatorApi
  slowAfterMs?: number
}

export default function App({ api = defaultApi, slowAfterMs = SLOW_REQUEST_MS }: AppProps) {
  const { state, dispatch } = useCalculator(api)
  const slow = useDelayedFlag(state.pending !== null, slowAfterMs)
  useKeyboard(dispatch)

  return (
    <main className="calculator">
      <h1 className="visually-hidden">Calculator</h1>
      <Display
        expression={expressionText(state)}
        value={displayText(state)}
        calculating={slow}
        error={state.error}
      />
      <Keypad dispatch={dispatch} busy={slow} />
    </main>
  )
}
