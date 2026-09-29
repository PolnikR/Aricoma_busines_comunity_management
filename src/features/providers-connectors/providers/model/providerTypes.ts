export const PROVIDER_TYPES = ['VMWARE', 'FLASHCOPY', 'HITACHI', 'IBM_POWER'] as const satisfies readonly GeneratedProviderType[]

export type ProviderType = (typeof PROVIDER_TYPES)[number]

export const PROVIDER_ROLES = ['source', 'target'] as const

export type ProviderRole = (typeof PROVIDER_ROLES)[number]

export type ProviderRoleFilter = ProviderRole | 'all'

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
  /** Present on current backend responses; optional internally for legacy fixtures. */
  role?: ProviderRole | undefined
  orchestratorConnId?: string | null | undefined
  vmPrefix?: string | null | undefined
  vmTags?: string[] | undefined
  notificationEmail?: string | null | undefined
  cacheRefreshSeconds?: number | null | undefined
  credentialStatus: ProviderCredentialStatus
  /** Validated GET record before UI normalization; unknown API fields are removed by Zod. */
  rawRecord?: ProviderRecordOutput | undefined
}

export type ProviderSubmitData = Provider
import type { Provider } from '@/generated/api/models/provider.gen'
import type {
  ProviderRecordOutput,
  ProviderType as GeneratedProviderType,
} from '@/generated/api/zod.gen'
