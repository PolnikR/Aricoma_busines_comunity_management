import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createEncryptedCredentialPayload,
  deleteCredential,
  fetchCredentials,
  submitCredential,
} from './credentialsApi'

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  encryptCredentialPassword: vi.fn(),
}))

vi.mock('@/shared/api/apiClient', () => ({ apiFetch: mocks.apiFetch }))
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
    vi.clearAllMocks()
    mocks.encryptCredentialPassword.mockResolvedValue('encrypted-password')
    mocks.apiFetch.mockResolvedValue(new Response(JSON.stringify(responseBody), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }))
  })

  it('loads credential metadata without a password field', async () => {
    await expect(fetchCredentials()).resolves.toEqual(responseBody.credentials)
    expect(mocks.apiFetch).toHaveBeenCalledWith('/api/get_credentials')
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
    const [, init] = mocks.apiFetch.mock.calls[0] as [string, RequestInit]
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
  })

  it('deletes a credential using an encoded id', async () => {
    await deleteCredential('credential/admin')
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      '/api/delete_credential?credential_id=credential%2Fadmin',
      { method: 'DELETE' },
    )
  })
})
