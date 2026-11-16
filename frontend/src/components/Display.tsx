interface DisplayProps {
  expression: string
  value: string
  calculating: boolean
  error: string | null
}

function sizeClass(text: string): string {
  if (text.length > 16) return 'display__value--xs'
  if (text.length > 12) return 'display__value--sm'
  return ''
}

export function Display({ expression, value, calculating, error }: DisplayProps) {
  const shown = calculating ? 'Calculating…' : value
  return (
    <div className="display">
      <div className="display__expression" data-testid="expression">
        {expression || '\u00a0'}
      </div>
      <div
        className={`display__value ${calculating ? 'display__value--busy' : sizeClass(shown)}`}
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
