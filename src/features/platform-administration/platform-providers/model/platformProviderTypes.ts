export const PLATFORM_PROVIDER_TYPES = [
  'AIRFLOW',
] as const

export type PlatformProviderType = (typeof PLATFORM_PROVIDER_TYPES)[number]

export const PLATFORM_PROVIDER_CREDENTIAL_STATUSES = ['ok', 'missing', 'none'] as const

export type PlatformProviderCredentialStatus =
  (typeof PLATFORM_PROVIDER_CREDENTIAL_STATUSES)[number]

export interface PlatformProviderSubmitData {
  id: string
  name: string
  description: string
  type: PlatformProviderType
  ipAddress: string
  port: number
  dagDir: string
  credentialId: string
}

export interface PlatformProviderRecord extends PlatformProviderSubmitData {
  credentialStatus: PlatformProviderCredentialStatus
  url?: string | undefined
}

export interface PlatformProviderWriteRecord extends PlatformProviderSubmitData {
  credentialStatus?: PlatformProviderCredentialStatus | undefined
}
