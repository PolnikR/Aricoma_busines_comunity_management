export const PROVIDER_TYPES = ['VMWARE', 'FLASHCOPY', 'IBM_POWER'] as const

export type ProviderType = (typeof PROVIDER_TYPES)[number]

export const PROVIDER_CREDENTIAL_STATUSES = ['ok', 'missing', 'none'] as const

export type ProviderCredentialStatus = (typeof PROVIDER_CREDENTIAL_STATUSES)[number]

export interface ProviderRecord {
  id: string
  name: string
  description: string
  type: ProviderType
  ipAddress: string
  /** Optional management URL exposed by the providers backend. */
  url?: string | null | undefined
  /** Optional until the providers backend exposes port in its contract. */
  port?: number | undefined
  credentialId: string | null
  defaultFlashcopyProviderId?: string | null | undefined
  credentialStatus: ProviderCredentialStatus
}

export interface ProviderSubmitData {
  id: string
  name: string
  description: string
  type: ProviderType
  ipAddress: string
  /** Optional management URL accepted when the backend supports it. */
  url?: string | null | undefined
  credentialId: string | null
}
