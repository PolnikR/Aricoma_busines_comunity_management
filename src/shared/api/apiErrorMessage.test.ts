import { describe, expect, it } from 'vitest'
import { OrvalApiError } from './orvalMutator'
import {
  extractBackendErrorDetail,
  resolveUserFacingErrorMessage,
} from './apiErrorMessage'

function wrap(message: string, cause: unknown): Error {
  return new Error(message, { cause })
}

describe('extractBackendErrorDetail', () => {
  it('extracts and trims a supported string detail from a direct API error', () => {
    const error = new OrvalApiError(400, 'Bad Request', { detail: '  Invalid provider  ' })

    expect(extractBackendErrorDetail(error)).toBe('Invalid provider')
  })

  it('extracts supported detail through nested causes', () => {
    const apiError = new OrvalApiError(409, 'Conflict', { detail: '  Provider is in use  ' })

    expect(extractBackendErrorDetail(wrap('Submit provider request failed', apiError))).toBe(
      'Provider is in use',
    )
  })

  it('joins non-empty FastAPI validation messages in response order', () => {
    const error = new OrvalApiError(422, 'Unprocessable Entity', {
      detail: [
        { loc: ['body', 'name'], msg: '  Name is required ' },
        { loc: ['body', 'url'], msg: 'URL is invalid' },
        { loc: ['body', 'ignored'], msg: '   ' },
        { loc: ['body', 'unknown'] },
      ],
    })

    expect(extractBackendErrorDetail(error)).toBe('Name is required; URL is invalid')
  })

  it.each([
    'backend text',
    '<html><body>backend failure</body></html>',
    { error: 'internal details' },
    { detail: 42 },
    { detail: [{ msg: 42 }] },
    { detail: [] },
    { detail: '   ' },
  ])('rejects unsupported backend body %j', (body) => {
    expect(extractBackendErrorDetail(new OrvalApiError(500, 'Server Error', body))).toBeUndefined()
  })

  it('terminates when a cause cycle is encountered', () => {
    const first = new Error('first')
    const second = new Error('second', { cause: first })
    Object.defineProperty(first, 'cause', { configurable: true, value: second })

    expect(extractBackendErrorDetail(first)).toBeUndefined()
  })

  it('does not inspect causes beyond the maximum depth', () => {
    let current: unknown = new OrvalApiError(500, 'Server Error', { detail: 'too deep' })

    for (let index = 0; index < 11; index += 1) {
      current = wrap(`wrapper ${String(index)}`, current)
    }

    expect(extractBackendErrorDetail(current)).toBeUndefined()
  })
})

describe('resolveUserFacingErrorMessage', () => {
  it('returns supported backend detail before an ordinary outer message', () => {
    const apiError = new OrvalApiError(409, 'Conflict', { detail: '  Provider is in use  ' })

    expect(resolveUserFacingErrorMessage(wrap('Submit provider request failed', apiError), 'Try again')).toBe(
      'Provider is in use',
    )
  })

  it('uses the fallback for an API error without supported detail', () => {
    const apiError = new OrvalApiError(502, 'Bad Gateway', '<html>proxy failure</html>')

    expect(resolveUserFacingErrorMessage(apiError, 'Unable to save provider')).toBe(
      'Unable to save provider',
    )
  })

  it('uses the fallback when an unsupported API error is nested in a synthetic wrapper', () => {
    const apiError = new OrvalApiError(503, 'Unavailable', { error: 'internal details' })
    const wrapper = wrap('Submit provider request failed with status 503', apiError)

    expect(resolveUserFacingErrorMessage(wrapper, 'Unable to save provider')).toBe(
      'Unable to save provider',
    )
  })

  it('preserves a meaningful ordinary error message when no API error is present', () => {
    expect(resolveUserFacingErrorMessage(new Error('Provider name is already used'), 'Try again')).toBe(
      'Provider name is already used',
    )
  })

  it('uses the fallback for unknown and empty ordinary failures', () => {
    expect(resolveUserFacingErrorMessage(null, 'Unable to save provider')).toBe('Unable to save provider')
    expect(resolveUserFacingErrorMessage(new Error('   '), 'Unable to save provider')).toBe(
      'Unable to save provider',
    )
  })

  it('terminates safely for cyclic API causes and returns the fallback', () => {
    const apiError = new OrvalApiError(500, 'Server Error', undefined)
    const wrapper = wrap('request failed with status 500', apiError)
    Object.defineProperty(apiError, 'cause', { configurable: true, value: wrapper })

    expect(resolveUserFacingErrorMessage(wrapper, 'Unable to complete request')).toBe(
      'Unable to complete request',
    )
  })
})
