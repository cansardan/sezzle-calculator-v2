import type { CSSProperties } from 'react'
import { textWidthEm } from './displaySize'

interface DisplayProps {
  expression: string
  value: string
  calculating: boolean
  error: string | null
}

function widthVar(text: string): CSSProperties {
  return { '--text-em': textWidthEm(text) } as CSSProperties
}

export function Display({ expression, value, calculating, error }: DisplayProps) {
  const shown = calculating ? 'Calculating…' : value
  return (
    <div className="display">
      <div
        className="display__expression"
        style={widthVar(expression)}
        title={expression || undefined}
        data-testid="expression"
      >
        {expression || '\u00a0'}
      </div>
      <div
        className={`display__value${calculating ? ' display__value--busy' : ''}`}
        style={widthVar(shown)}
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
