import {
  deleteCredentialRouteDeleteCredentialDelete,
  getCredentialsRouteGetCredentialsGet,
  submitCredentialSubmitCredentialPost,
} from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
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

function credentialError(error: unknown, fallback: string): Error {
  if (error instanceof OrvalApiError) {
    const parsed = apiErrorResponseSchema.safeParse(error.body)
    return new Error(parsed.success ? parsed.data.detail : fallback, { cause: error })
  }
  return error instanceof Error ? error : new Error(fallback)
}

export async function fetchCredentials(): Promise<CredentialRecord[]> {
  try {
    const payload = await getCredentialsRouteGetCredentialsGet()
    return credentialsResponseSchema.parse(payload).credentials
  } catch (error) {
    throw credentialError(error, `Get credentials request failed with status ${String(error instanceof OrvalApiError ? error.status : 0)}`)
  }
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
  try {
    const result = await submitCredentialSubmitCredentialPost(payload)
    return credentialsResponseSchema.parse(result).credentials
  } catch (error) {
    throw credentialError(error, `Submit credential request failed with status ${String(error instanceof OrvalApiError ? error.status : 0)}`)
  }
}

export async function deleteCredential(credentialId: string): Promise<CredentialRecord[]> {
  try {
    const payload = await deleteCredentialRouteDeleteCredentialDelete({ credential_id: credentialId })
    return credentialsResponseSchema.parse(payload).credentials
  } catch (error) {
    throw credentialError(error, `Delete credential request failed with status ${String(error instanceof OrvalApiError ? error.status : 0)}`)
  }
}
