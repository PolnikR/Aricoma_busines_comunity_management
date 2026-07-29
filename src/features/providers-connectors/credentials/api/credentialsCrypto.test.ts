import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('does not retry with plaintext when the public key request fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response('', { status: 500 }))

    await expect(encryptCredentialPassword('secret')).rejects.toThrow(
      'Credential public key request failed',
    )
    expect(encryptMock).not.toHaveBeenCalled()
  })
})
