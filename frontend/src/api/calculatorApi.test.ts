import { describe, expect, it, vi } from 'vitest'
import {
  ApiError,
  ENDPOINT,
  NetworkError,
  TIMEOUT_MESSAGE,
  UNEXPECTED_RESPONSE_MESSAGE,
  UNREACHABLE_MESSAGE,
  createCalculatorApi,
} from './calculatorApi'

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

describe('createCalculatorApi', () => {
  it('posts the request to the relative endpoint and returns the result', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ result: 30 }))
    const api = createCalculatorApi({ fetchFn })

    await expect(api.calculate({ operation: 'percent', a: 15, b: 200 })).resolves.toBe(30)

    const [url, init] = fetchFn.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/v1/calculate')
    expect(url).toBe(ENDPOINT)
    expect(init.method).toBe('POST')
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(JSON.parse(init.body as string)).toEqual({ operation: 'percent', a: 15, b: 200 })
  })

  it('omits b for unary requests', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ result: 9 }))
    await createCalculatorApi({ fetchFn }).calculate({ operation: 'sqrt', a: 81 })
    expect(JSON.parse((fetchFn.mock.calls[0][1] as RequestInit).body as string)).toEqual({ operation: 'sqrt', a: 81 })
  })

  it('uses the global fetch by default', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ result: 2 }))
    await expect(createCalculatorApi().calculate({ operation: 'add', a: 1, b: 1 })).resolves.toBe(2)
    expect(spy).toHaveBeenCalledOnce()
    spy.mockRestore()
  })

  it('passes a combined signal so the caller can cancel', async () => {
    const fetchFn = vi.fn().mockResolvedValue(jsonResponse({ result: 1 }))
    const controller = new AbortController()
    await createCalculatorApi({ fetchFn }).calculate({ operation: 'add', a: 0, b: 1 }, controller.signal)
    const signal = (fetchFn.mock.calls[0][1] as RequestInit).signal as AbortSignal
    expect(signal.aborted).toBe(false)
    controller.abort()
    expect(signal.aborted).toBe(true)
  })

  it('throws an ApiError with the server code and message', async () => {
    const body = { error: { code: 'division_by_zero', message: 'Cannot divide by zero.' } }
    const api = createCalculatorApi({ fetchFn: vi.fn().mockResolvedValue(jsonResponse(body, 422)) })
    const error = await api.calculate({ operation: 'divide', a: 5, b: 0 }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect((error as ApiError).code).toBe('division_by_zero')
    expect((error as ApiError).message).toBe('Cannot divide by zero.')
  })

  it.each([
    ['an error status without a JSON body', new Response('<html>oops</html>', { status: 502 })],
    ['an error body of the wrong shape', jsonResponse({ error: 'nope' }, 500)],
    ['an error body with non-string fields', jsonResponse({ error: { code: 1, message: 2 } }, 500)],
    ['an array error body', jsonResponse([], 500)],
  ])('reports %s as an unexpected response', async (_name, response) => {
    const api = createCalculatorApi({ fetchFn: vi.fn().mockResolvedValue(response) })
    await expect(api.calculate({ operation: 'add', a: 1, b: 1 })).rejects.toMatchObject({
      name: 'ApiError',
      code: 'unexpected_response',
      message: UNEXPECTED_RESPONSE_MESSAGE,
    })
  })

  it.each([
    ['a missing result', jsonResponse({})],
    ['a string result', jsonResponse({ result: '5' })],
    ['a null body', jsonResponse(null)],
    ['a non-JSON success body', new Response('ok', { status: 200 })],
  ])('rejects a success response with %s', async (_name, response) => {
    const api = createCalculatorApi({ fetchFn: vi.fn().mockResolvedValue(response) })
    await expect(api.calculate({ operation: 'add', a: 1, b: 1 })).rejects.toMatchObject({
      code: 'malformed_response',
      message: UNEXPECTED_RESPONSE_MESSAGE,
    })
  })

  it('maps a network failure to a plain-language message', async () => {
    const api = createCalculatorApi({ fetchFn: vi.fn().mockRejectedValue(new TypeError('Failed to fetch')) })
    const error = await api.calculate({ operation: 'add', a: 1, b: 1 }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(NetworkError)
    expect((error as NetworkError).message).toBe(UNREACHABLE_MESSAGE)
  })

  it('times out slow requests with a clear message', async () => {
    const fetchFn = vi.fn((_url: string, init: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init.signal!.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))
      }),
    )
    const api = createCalculatorApi({ fetchFn: fetchFn as unknown as typeof fetch, timeoutMs: 20 })
    await expect(api.calculate({ operation: 'add', a: 1, b: 1 })).rejects.toMatchObject({
      name: 'NetworkError',
      message: TIMEOUT_MESSAGE,
    })
  })

  it('rethrows the abort when the caller cancelled', async () => {
    const abort = new DOMException('aborted', 'AbortError')
    const controller = new AbortController()
    const fetchFn = vi.fn(() => {
      controller.abort()
      return Promise.reject(abort)
    })
    const api = createCalculatorApi({ fetchFn: fetchFn as unknown as typeof fetch })
    await expect(api.calculate({ operation: 'add', a: 1, b: 1 }, controller.signal)).rejects.toBe(abort)
  })
})
