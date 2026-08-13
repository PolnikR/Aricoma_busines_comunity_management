import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createEncryptedCredentialPayload,
  deleteCredential,
  fetchCredentials,
  submitCredential,
} from './credentialsApi'

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  encryptCredentialPassword: vi.fn(),
}))

vi.mock('./credentialsCrypto', () => ({
  encryptCredentialPassword: mocks.encryptCredentialPassword,
}))

const responseBody = {
  credentials: [{
    id: 'vcenter-admin',
    name: 'vCenter admin',
    description: 'Production account',
    username: 'administrator@vsphere.local',
  }],
}

describe('credentialsApi', () => {
  beforeEach(() => {
    mocks.fetch.mockReset()
    mocks.encryptCredentialPassword.mockReset()
    vi.stubGlobal('fetch', mocks.fetch)
    mocks.encryptCredentialPassword.mockResolvedValue('encrypted-password')
    mocks.fetch.mockResolvedValue(new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
  })

  it('loads credential metadata without a password field', async () => {
    await expect(fetchCredentials()).resolves.toEqual(responseBody.credentials)
    expect(mocks.fetch).toHaveBeenCalledWith('/api/get_credentials', expect.objectContaining({ method: 'GET' }))
  })

  it('encrypts the password before submitting and marks the payload encrypted', async () => {
    const payload = await createEncryptedCredentialPayload({
      id: ' vcenter-admin ',
      name: ' vCenter admin ',
      description: ' Production account ',
      username: ' administrator@vsphere.local ',
      password: 'plaintext-secret',
    })
    await submitCredential(payload)

    expect(mocks.encryptCredentialPassword).toHaveBeenCalledWith('plaintext-secret')
    const [, init] = mocks.fetch.mock.calls[0] as [string, RequestInit]
    if (typeof init.body !== 'string') throw new Error('Expected a JSON request body')
    expect(JSON.parse(init.body)).toEqual({
      id: 'vcenter-admin',
      name: 'vCenter admin',
      description: 'Production account',
      username: 'administrator@vsphere.local',
      password: 'encrypted-password',
      password_encrypted: true,
    })
    expect(init.body).not.toContain('plaintext-secret')
    expect(init.method).toBe('POST')
  })

  it('deletes a credential using an encoded id', async () => {
    await deleteCredential('credential/admin')
    expect(mocks.fetch).toHaveBeenCalledWith(
      '/api/delete_credential?credential_id=credential%2Fadmin',
      expect.objectContaining({ method: 'DELETE' }),
    )
  })
})
