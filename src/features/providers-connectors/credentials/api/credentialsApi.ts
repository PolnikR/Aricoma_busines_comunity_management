import { apiFetch } from '@/shared/api/apiClient'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
import type {
  CredentialFormData,
  CredentialRecord,
  CredentialSubmitPayload,
} from '../model/credentialTypes'
import { encryptCredentialPassword } from './credentialsCrypto'
import {
  apiErrorResponseSchema,
  credentialsResponseSchema,
} from './schemas/credentialsSchema'

async function responseError(response: Response, fallback: string): Promise<Error> {
  const payload: unknown = await response.json().catch(() => null)
  const parsed = apiErrorResponseSchema.safeParse(payload)
  return new Error(parsed.success ? parsed.data.detail : fallback)
}

export async function fetchCredentials(): Promise<CredentialRecord[]> {
  const response = await apiFetch(API_ENDPOINTS.credentials.list)
  if (!response.ok) {
    throw await responseError(
      response,
      `Get credentials request failed with status ${String(response.status)}`,
    )
  }
  const payload: unknown = await response.json()
  return credentialsResponseSchema.parse(payload).credentials
}

export async function createEncryptedCredentialPayload(
  form: CredentialFormData,
): Promise<CredentialSubmitPayload> {
  return {
    id: form.id.trim(),
    name: form.name.trim(),
    description: form.description.trim(),
    username: form.username.trim(),
    password: await encryptCredentialPassword(form.password),
    password_encrypted: true,
  }
}

export async function submitCredential(
  payload: CredentialSubmitPayload,
): Promise<CredentialRecord[]> {
  const response = await apiFetch(API_ENDPOINTS.credentials.submit, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    throw await responseError(
      response,
      `Submit credential request failed with status ${String(response.status)}`,
    )
  }
  const result: unknown = await response.json()
  return credentialsResponseSchema.parse(result).credentials
}

export async function deleteCredential(credentialId: string): Promise<CredentialRecord[]> {
  const response = await apiFetch(
    `${API_ENDPOINTS.credentials.delete}?credential_id=${encodeURIComponent(credentialId)}`,
    { method: 'DELETE' },
  )
  if (!response.ok) {
    throw await responseError(
      response,
      `Delete credential request failed with status ${String(response.status)}`,
    )
  }
  const payload: unknown = await response.json()
  return credentialsResponseSchema.parse(payload).credentials
}
