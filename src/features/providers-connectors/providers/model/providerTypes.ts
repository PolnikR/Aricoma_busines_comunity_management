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
  credentialId: string | null
  credentialStatus: ProviderCredentialStatus
}

export type ProviderSubmitData = Omit<ProviderRecord, 'credentialStatus'>
