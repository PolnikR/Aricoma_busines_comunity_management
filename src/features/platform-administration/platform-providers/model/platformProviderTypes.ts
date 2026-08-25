import { ProviderType } from '@/generated/api/zod.gen'
import type {
  OrchestrationProviderRecordOutput,
  ProviderType as GeneratedProviderType,
} from '@/generated/api/zod.gen'
import type { OrchestrationProvider } from '@/generated/api/models/orchestrationProvider.gen'

export const PLATFORM_PROVIDER_TYPES = ProviderType.options

export type PlatformProviderType = GeneratedProviderType

export const PLATFORM_PROVIDER_CREDENTIAL_STATUSES = ['ok', 'missing', 'none'] as const

export type PlatformProviderCredentialStatus =
  (typeof PLATFORM_PROVIDER_CREDENTIAL_STATUSES)[number]

export type PlatformProviderSubmitData = OrchestrationProvider

export type PlatformProviderRecord = Omit<
  OrchestrationProviderRecordOutput,
  'description' | 'ipAddress' | 'port' | 'dagDir' | 'credentialId' | 'credentialStatus' | 'role' | 'url'
> & {
  description: string
  ipAddress: string
  port: number
  dagDir: string
  credentialId: string
  role?: 'source' | 'target'
  url?: string
  credentialStatus: PlatformProviderCredentialStatus
  /** Validated GET record before UI normalization; unknown API fields are removed by Zod. */
  rawRecord?: OrchestrationProviderRecordOutput | undefined
}

export type PlatformProviderWriteRecord = Omit<PlatformProviderRecord, 'credentialStatus' | 'rawRecord'> & {
  credentialStatus?: PlatformProviderCredentialStatus
}
