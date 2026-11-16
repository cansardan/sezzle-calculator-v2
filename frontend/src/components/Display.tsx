import { expressionSizeClass, valueSizeClass } from './displaySize'

interface DisplayProps {
  expression: string
  value: string
  calculating: boolean
  error: string | null
}

export function Display({ expression, value, calculating, error }: DisplayProps) {
  const shown = calculating ? 'Calculating…' : value
  return (
    <div className="display">
      <div
        className={`display__expression ${expressionSizeClass(expression)}`}
        title={expression || undefined}
        data-testid="expression"
      >
        {expression || '\u00a0'}
      </div>
      <div
        className={`display__value ${calculating ? 'display__value--busy' : valueSizeClass(shown)}`}
        aria-live="polite"
        aria-atomic="true"
        data-testid="result"
      >
        {shown}
      </div>
      <div className="display__alert">
        {error && <p role="alert">{error}</p>}
      </div>
    </div>
  )
}
