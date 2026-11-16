import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { ApiError, NetworkError, UNREACHABLE_MESSAGE, type CalculateRequest, type CalculatorApi } from './api/calculatorApi'

type CalculateFn = (request: CalculateRequest, signal?: AbortSignal) => Promise<number>

function setup(impl: CalculateFn = () => Promise.resolve(0)) {
  const calculate = vi.fn<CalculateFn>(impl)
  const api: CalculatorApi = { calculate }
  const user = userEvent.setup()
  render(<App api={api} />)

  async function press(...names: string[]) {
    for (const name of names) await user.click(screen.getByRole('button', { name }))
  }
  const result = () => screen.getByTestId('result').textContent
  const expression = () => screen.getByTestId('expression').textContent?.replace(/\u00a0/g, '')

  return { calculate, user, press, result, expression }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('App', () => {
  it('shows 0 and an empty expression initially', () => {
    const { result } = setup()
    expect(result()).toBe('0')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('announces the result through a polite live region', () => {
    setup()
    expect(screen.getByTestId('result')).toHaveAttribute('aria-live', 'polite')
  })

  it('calculates 12 + 7 through the API and shows the result', async () => {
    const { calculate, press, result } = setup(() => Promise.resolve(19))
    await press('1', '2', 'add', '7', 'equals')

    await waitFor(() => expect(result()).toBe('19'))
    expect(calculate).toHaveBeenCalledOnce()
    expect(calculate.mock.calls[0][0]).toEqual({ operation: 'add', a: 12, b: 7 })
  })

  it('rounds the display but keeps the API value (0.1 + 0.2)', async () => {
    const { press, result } = setup(() => Promise.resolve(0.30000000000000004))
    await press('0', 'decimal point', '1', 'add', '0', 'decimal point', '2', 'equals')
    await waitFor(() => expect(result()).toBe('0.3'))
  })

  it('sends only a for square root and shows the result immediately', async () => {
    const { calculate, press, result, expression } = setup(() => Promise.resolve(9))
    await press('8', '1', 'square root')

    await waitFor(() => expect(result()).toBe('9'))
    expect(calculate.mock.calls[0][0]).toEqual({ operation: 'sqrt', a: 81 })
    expect(expression()).toBe('√81')
  })

  it('sends percent as a=15, b=200 and shows "15 % of 200"', async () => {
    const { calculate, press, result, expression } = setup(() => Promise.resolve(30))
    await press('1', '5', 'percent of', '2', '0', '0')
    expect(expression()).toBe('15 % of 200')

    await press('equals')
    await waitFor(() => expect(result()).toBe('30'))
    expect(calculate.mock.calls[0][0]).toEqual({ operation: 'percent', a: 15, b: 200 })
    expect(expression()).toBe('15 % of 200')
  })

  it('sends power as a^b', async () => {
    const { calculate, press, result } = setup(() => Promise.resolve(1024))
    await press('2', 'power', '1', '0', 'equals')
    await waitFor(() => expect(result()).toBe('1024'))
    expect(calculate.mock.calls[0][0]).toEqual({ operation: 'power', a: 2, b: 10 })
  })

  it('chains left to right: evaluates the pending operation before the next operator', async () => {
    const { calculate, press, result, expression } = setup((request) =>
      Promise.resolve(request.operation === 'add' ? 5 : 20),
    )
    await press('2', 'add', '3', 'multiply')
    await waitFor(() => expect(expression()).toBe('5 ×'))
    expect(calculate.mock.calls[0][0]).toEqual({ operation: 'add', a: 2, b: 3 })

    await press('4', 'equals')
    await waitFor(() => expect(result()).toBe('20'))
    expect(calculate.mock.calls[1][0]).toEqual({ operation: 'multiply', a: 5, b: 4 })
  })

  it('makes no request for an incomplete expression', async () => {
    const { calculate, press, result } = setup()
    await press('equals')
    await press('5', 'equals')
    await press('add', 'equals')
    expect(calculate).not.toHaveBeenCalled()
    expect(result()).toBe('5')
  })

  it('shows the server message and keeps the expression visible on an API error', async () => {
    const { press, expression } = setup(() =>
      Promise.reject(new ApiError('division_by_zero', 'Cannot divide by zero.')),
    )
    await press('5', 'divide', '0', 'equals')

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot divide by zero.')
    expect(expression()).toBe('5 ÷ 0')
  })

  it('clears the error on the next key press', async () => {
    const { press } = setup(() => Promise.reject(new ApiError('division_by_zero', 'Cannot divide by zero.')))
    await press('5', 'divide', '0', 'equals')
    await screen.findByRole('alert')

    await press('1')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the undefined_result message for 0 ^ -1', async () => {
    const { calculate, press } = setup(() => Promise.reject(new ApiError('undefined_result', 'The result is undefined.')))
    await press('0', 'power', 'toggle sign', '1', 'equals')
    expect(await screen.findByRole('alert')).toHaveTextContent('The result is undefined.')
    expect(calculate.mock.calls[0][0]).toEqual({ operation: 'power', a: 0, b: -1 })
  })

  it('shows a plain-language message when the service cannot be reached and stays usable', async () => {
    const { calculate, press, result } = setup(() => Promise.reject(new NetworkError(UNREACHABLE_MESSAGE)))
    await press('1', 'add', '1', 'equals')
    expect(await screen.findByRole('alert')).toHaveTextContent(UNREACHABLE_MESSAGE)

    calculate.mockResolvedValue(2)
    await press('equals')
    await waitFor(() => expect(result()).toBe('2'))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows a generic message for an unexpected failure', async () => {
    const { press } = setup(() => Promise.reject(new Error('boom')))
    await press('1', 'add', '1', 'equals')
    expect(await screen.findByRole('alert')).toHaveTextContent('unexpected response')
  })

  describe('while a request is pending', () => {
    it('shows Calculating…, disables the keys but not C, and does not send duplicates', async () => {
      const pending = deferred<number>()
      const { calculate, press, result, user } = setup(() => pending.promise)
      await press('1', 'add', '2', 'equals')

      expect(result()).toBe('Calculating…')
      expect(screen.getByRole('button', { name: 'equals' })).toBeDisabled()
      expect(screen.getByRole('button', { name: '5' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'square root' })).toBeDisabled()
      expect(screen.getByRole('button', { name: 'clear' })).toBeEnabled()

      await user.keyboard('{Enter}')
      await user.keyboard('=')
      expect(calculate).toHaveBeenCalledOnce()

      await act(async () => pending.resolve(3))
      expect(result()).toBe('3')
      expect(screen.getByRole('button', { name: 'equals' })).toBeEnabled()
    })

    it('C cancels the request and a late response is never displayed', async () => {
      const pending = deferred<number>()
      const { calculate, press, result } = setup(() => pending.promise)
      await press('1', 'add', '2', 'equals')
      const signal = calculate.mock.calls[0][1] as AbortSignal

      await press('clear')
      expect(signal.aborted).toBe(true)
      expect(result()).toBe('0')

      await act(async () => pending.resolve(3))
      expect(result()).toBe('0')
    })

    it('ignores a late failure after C', async () => {
      const pending = deferred<number>()
      const { press, result } = setup(() => pending.promise)
      await press('1', 'add', '2', 'equals', 'clear')

      await act(async () => pending.reject(new ApiError('x', 'late error')))
      expect(result()).toBe('0')
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    })
  })

  describe('keyboard', () => {
    it('supports digits, operators, Enter, Backspace and clear keys', async () => {
      const { calculate, user, result } = setup(() => Promise.resolve(24))
      await user.keyboard('12')
      await user.keyboard('{Backspace}')
      expect(result()).toBe('1')
      await user.keyboard('2*2{Enter}')

      await waitFor(() => expect(result()).toBe('24'))
      expect(calculate.mock.calls[0][0]).toEqual({ operation: 'multiply', a: 12, b: 2 })

      await user.keyboard('{Escape}')
      expect(result()).toBe('0')
    })

    it.each([
      ['+', 'add'],
      ['-', 'subtract'],
      ['*', 'multiply'],
      ['/', 'divide'],
      ['^', 'power'],
      ['%', 'percent'],
    ])('maps %s to %s', async (key, operation) => {
      const { calculate, user } = setup(() => Promise.resolve(1))
      await user.keyboard(`4${key}2=`)
      await waitFor(() => expect(calculate).toHaveBeenCalledOnce())
      expect(calculate.mock.calls[0][0]).toEqual({ operation, a: 4, b: 2 })
    })

    it('uses = for equals, . for decimals and c for clear', async () => {
      const { calculate, user, result } = setup(() => Promise.resolve(1))
      await user.keyboard('1.5+1=')
      await waitFor(() => expect(calculate).toHaveBeenCalledOnce())
      expect(calculate.mock.calls[0][0]).toEqual({ operation: 'add', a: 1.5, b: 1 })
      await user.keyboard('c')
      expect(result()).toBe('0')
      await user.keyboard('9C')
      expect(result()).toBe('0')
    })

    it('ignores unrelated keys and shortcuts with modifier keys', async () => {
      const { user, result } = setup()
      await user.keyboard('x')
      await user.keyboard('{Control>}5{/Control}')
      expect(result()).toBe('0')
    })

    it('lets Enter activate a focused button natively instead of acting as equals', async () => {
      const { calculate, user, result } = setup()
      await user.keyboard('1+2')
      screen.getByRole('button', { name: '9' }).focus()
      await user.keyboard('{Enter}')

      expect(calculate).not.toHaveBeenCalled()
      expect(result()).toBe('29')
    })

    it('does not trap keyboard users: Tab moves between keys', async () => {
      const { user } = setup()
      await user.tab()
      expect(document.activeElement).toBe(screen.getAllByRole('button')[0])
      await user.tab()
      expect(document.activeElement).toBe(screen.getAllByRole('button')[1])
    })
  })

  describe('paste', () => {
    const pasteText = (text: string) =>
      fireEvent.paste(document.body, { clipboardData: { getData: () => text } })

    it('fills the current entry with a valid number', () => {
      const { result } = setup()
      pasteText(' 1234.5\n')
      expect(result()).toBe('1234.5')
    })

    it.each(['', 'hello', 'Infinity', '0xFF', 'NaN'])('rejects %j without making a request', (text) => {
      const { calculate, result } = setup()
      pasteText(text)

      expect(screen.getByRole('alert')).toHaveTextContent("That isn't a valid number")
      expect(result()).toBe('0')
      expect(calculate).not.toHaveBeenCalled()
    })

    it('handles a paste event without clipboard data', () => {
      setup()
      fireEvent.paste(document.body)
      expect(screen.getByRole('alert')).toBeInTheDocument()
    })
  })

  describe('entry', () => {
    it('shows no leading-zero clutter and a leading zero for bare decimals', async () => {
      const { press, result } = setup()
      await press('0', '0', '7')
      expect(result()).toBe('7')
      await press('clear', 'decimal point', '5')
      expect(result()).toBe('0.5')
    })

    it('toggles the sign and deletes with backspace', async () => {
      const { press, result } = setup()
      await press('4', '2', 'toggle sign')
      expect(result()).toBe('-42')
      await press('backspace')
      expect(result()).toBe('-4')
    })

    it('starts a new number after a result and continues from it with an operator', async () => {
      const { calculate, press, result, expression } = setup((request) =>
        Promise.resolve(request.operation === 'add' ? 3 : 6),
      )
      await press('1', 'add', '2', 'equals')
      await waitFor(() => expect(result()).toBe('3'))

      await press('backspace')
      expect(result()).toBe('3')

      await press('multiply', '2', 'equals')
      await waitFor(() => expect(result()).toBe('6'))
      expect(calculate.mock.calls[1][0]).toEqual({ operation: 'multiply', a: 3, b: 2 })
      expect(expression()).toBe('3 × 2')

      await press('9')
      expect(result()).toBe('9')
      expect(expression()).toBe('')
    })

    it('shrinks very long values via a size class', async () => {
      const { press } = setup()
      await press('1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1', '2', '3')
      expect(screen.getByTestId('result')).toHaveClass('display__value--sm')
      await press('clear', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '1', '2', 'decimal point', '3', '4', '5', '6')
      expect(screen.getByTestId('result')).toHaveClass('display__value--xs')
    })
  })

  describe('accessibility', () => {
    it('gives every key an accessible name', () => {
      setup()
      for (const name of [
        'divide', 'multiply', 'subtract', 'add', 'square root', 'percent of', 'power',
        'backspace', 'clear', 'equals', 'toggle sign', 'decimal point', '0', '9',
      ]) {
        expect(screen.getByRole('button', { name })).toBeInTheDocument()
      }
    })

    it('renders errors with role=alert', async () => {
      const { press } = setup(() => Promise.reject(new ApiError('x', 'Oops')))
      await press('1', 'add', '1', 'equals')
      expect(await screen.findByRole('alert')).toHaveTextContent('Oops')
    })
  })
})
