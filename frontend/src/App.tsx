import { createCalculatorApi, type CalculatorApi } from './api/calculatorApi'
import { displayText, expressionText } from './calculator/reducer'
import { Display } from './components/Display'
import { Keypad } from './components/Keypad'
import { useCalculator } from './hooks/useCalculator'
import { useKeyboard } from './hooks/useKeyboard'

const defaultApi = createCalculatorApi()

interface AppProps {
  api?: CalculatorApi
}

export default function App({ api = defaultApi }: AppProps) {
  const { state, dispatch } = useCalculator(api)
  useKeyboard(dispatch)

  return (
    <main className="calculator">
      <h1 className="visually-hidden">Calculator</h1>
      <Display
        expression={expressionText(state)}
        value={displayText(state)}
        calculating={state.pending !== null}
        error={state.error}
      />
      <Keypad dispatch={dispatch} busy={state.pending !== null} />
    </main>
  )
}
