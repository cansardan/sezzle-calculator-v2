export type ApiOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power' | 'sqrt' | 'percent'

export interface CalculateRequest {
  operation: ApiOperation
  a: number
  b?: number
}

/** The only thing the UI needs from the backend. Inject a fake in tests. */
export interface CalculatorApi {
  calculate(request: CalculateRequest, signal?: AbortSignal): Promise<number>
}

/** The server answered with an error (or an unusable response). */
export class ApiError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

/** The server could not be reached, or did not answer in time. */
export class NetworkError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NetworkError'
  }
}

export const ENDPOINT = '/api/v1/calculate'
export const DEFAULT_TIMEOUT_MS = 10_000

export const UNREACHABLE_MESSAGE =
  "Can't reach the calculator service. Check that the backend is running and try again."
export const TIMEOUT_MESSAGE = 'The calculator service took too long to respond. Please try again.'
export const UNEXPECTED_RESPONSE_MESSAGE = 'The calculator service sent an unexpected response. Please try again.'

interface Options {
  fetchFn?: typeof fetch
  timeoutMs?: number
}

export function createCalculatorApi({ fetchFn = (...args) => fetch(...args), timeoutMs = DEFAULT_TIMEOUT_MS }: Options = {}): CalculatorApi {
  return {
    async calculate(request, signal) {
      const timeout = AbortSignal.timeout(timeoutMs)
      const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

      let response: Response
      try {
        response = await fetchFn(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: combined,
        })
      } catch (error) {
        if (signal?.aborted) throw error
        throw new NetworkError(timeout.aborted ? TIMEOUT_MESSAGE : UNREACHABLE_MESSAGE)
      }

      const payload = await readJson(response)

      if (response.ok) {
        if (isRecord(payload) && typeof payload.result === 'number' && Number.isFinite(payload.result)) {
          return payload.result
        }
        throw new ApiError('malformed_response', UNEXPECTED_RESPONSE_MESSAGE)
      }

      if (isRecord(payload) && isRecord(payload.error)) {
        const { code, message } = payload.error
        if (typeof code === 'string' && typeof message === 'string') {
          throw new ApiError(code, message)
        }
      }
      throw new ApiError('unexpected_response', UNEXPECTED_RESPONSE_MESSAGE)
    },
  }
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
