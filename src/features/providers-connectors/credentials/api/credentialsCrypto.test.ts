import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import {
  clearCredentialPublicKeyCache,
  encryptCredentialPassword,
} from './credentialsCrypto'

const PUBLIC_KEY = [
  '-----BEGIN PUBLIC KEY-----',
  'AQID',
  '-----END PUBLIC KEY-----',
].join('\n')
const importKeyMock = vi.fn<SubtleCrypto['importKey']>()
const encryptMock = vi.fn<SubtleCrypto['encrypt']>()
const importedKey = {} as CryptoKey

async function getEncryptionError(): Promise<unknown> {
  try {
    await encryptCredentialPassword('secret')
  } catch (error) {
    return error
  }

  throw new Error('Expected credential encryption to fail')
}

describe('credentialsCrypto', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearCredentialPublicKeyCache()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(
      new Response(PUBLIC_KEY, { status: 200 }),
    ))
    importKeyMock.mockResolvedValue(importedKey)
    encryptMock.mockResolvedValue(Uint8Array.from([1, 2, 3]).buffer)
    vi.spyOn(globalThis.crypto.subtle, 'importKey').mockImplementation(importKeyMock)
    vi.spyOn(globalThis.crypto.subtle, 'encrypt').mockImplementation(encryptMock)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('loads the backend public key and encrypts the password with RSA-OAEP', async () => {
    await expect(encryptCredentialPassword('secret')).resolves.toBe('AQID')

    expect(fetch).toHaveBeenCalledWith('/api/credentials/pubkey', {
      headers: { Accept: 'application/x-pem-file' },
    })
    expect(importKeyMock).toHaveBeenCalledWith(
      'spki',
      expect.any(ArrayBuffer),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      false,
      ['encrypt'],
    )
    expect(encryptMock).toHaveBeenCalledOnce()
    const encryptCall = encryptMock.mock.calls[0]
    expect(encryptCall?.[0]).toEqual({ name: 'RSA-OAEP' })
    expect(encryptCall?.[1]).toBe(importedKey)
    const source = encryptCall?.[2]
    if (!source) throw new Error('Password bytes were not passed to Web Crypto')
    const bytes = ArrayBuffer.isView(source)
      ? new Uint8Array(source.buffer, source.byteOffset, source.byteLength)
      : new Uint8Array(source)
    expect(new TextDecoder().decode(bytes)).toBe('secret')
  })

  it('preserves a JSON public-key error detail for the shared resolver', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      detail: 'Public key service is unavailable.',
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }))

    const error = await getEncryptionError()

    expect(error).toBeInstanceOf(OrvalApiError)
    expect(resolveUserFacingErrorMessage(error, 'Credential could not be created securely.')).toBe(
      'Public key service is unavailable.',
    )
    expect(encryptMock).not.toHaveBeenCalled()
  })

  it('preserves FastAPI validation details from the public-key request', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({
      detail: [
        { loc: ['header', 'x-client'], msg: 'Client header is required.' },
        { loc: ['query', 'tenant'], msg: 'Tenant is invalid.' },
      ],
    }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    }))

    const error = await getEncryptionError()

    expect(resolveUserFacingErrorMessage(error, 'Credential could not be created securely.')).toBe(
      'Client header is required.; Tenant is invalid.',
    )
    expect(encryptMock).not.toHaveBeenCalled()
  })

  it.each([
    ['an HTML response', '<html>proxy failure</html>', 'text/html'],
    ['a plain-text response', 'upstream timeout', 'text/plain'],
    ['invalid JSON', '{not valid json}', 'application/json'],
    ['unsupported JSON', JSON.stringify({ error: 'internal details' }), 'application/json'],
  ])('uses the localized fallback for %s', async (_caseName, body, contentType) => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(body, {
      status: 502,
      headers: { 'Content-Type': contentType },
    }))

    const error = await getEncryptionError()
    const message = resolveUserFacingErrorMessage(error, 'Credential could not be created securely.')

    expect(message).toBe('Credential could not be created securely.')
    expect(message).not.toContain(body)
    expect(message).not.toContain('502')
    expect(encryptMock).not.toHaveBeenCalled()
  })
})
