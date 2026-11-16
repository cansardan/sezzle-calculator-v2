import { useEffect, useReducer } from 'react'
import { ApiError, NetworkError, UNEXPECTED_RESPONSE_MESSAGE, type CalculatorApi } from '../api/calculatorApi'
import { initialState, reduce } from '../calculator/reducer'

function messageFor(error: unknown): string {
  if (error instanceof ApiError || error instanceof NetworkError) return error.message
  return UNEXPECTED_RESPONSE_MESSAGE
}

/** Connects the pure calculator reducer to the API: one request per pending calculation. */
export function useCalculator(api: CalculatorApi) {
  const [state, dispatch] = useReducer(reduce, initialState)
  const { pending } = state

  useEffect(() => {
    if (!pending) return
    const controller = new AbortController()
    const { id, request } = pending

    api.calculate(request, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) dispatch({ type: 'resolved', id, result })
      },
      (error: unknown) => {
        if (!controller.signal.aborted) dispatch({ type: 'failed', id, message: messageFor(error) })
      },
    )

    return () => controller.abort()
  }, [pending, api])

  return { state, dispatch }
}
