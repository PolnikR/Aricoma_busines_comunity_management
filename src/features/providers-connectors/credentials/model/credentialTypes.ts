import type { Credential } from '@/generated/api/models/credential.gen'
import type { CredentialRecordOutput } from '@/generated/api/zod.gen'

export type CredentialRecord = Omit<CredentialRecordOutput, 'description'> & {
  description: string
}

export interface CredentialFormData {
  id: string
  name: string
  description: string
  username: string
  password: string
}

export type CredentialSubmitPayload = Credential
