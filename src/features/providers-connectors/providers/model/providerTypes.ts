export const PROVIDER_TYPES = ['VMWARE', 'FLASHCOPY', 'HITACHI', 'IBM_POWER'] as const satisfies readonly GeneratedProviderType[]

export type ProviderType = (typeof PROVIDER_TYPES)[number]

export const PROVIDER_ROLES = ['source', 'target'] as const

export type ProviderRole = (typeof PROVIDER_ROLES)[number]

export type ProviderRoleFilter = ProviderRole | 'all'

export const PROVIDER_CREDENTIAL_STATUSES = ['ok', 'missing', 'none'] as const

export type ProviderCredentialStatus = (typeof PROVIDER_CREDENTIAL_STATUSES)[number]

// UI read model derived from the generated record. Only fields whose UI shape
// differs from the wire shape are overridden here.
export type ProviderRecord = Omit<
  ProviderRecordOutput,
  'type' | 'role' | 'description' | 'ipAddress' | 'credentialId' | 'credentialStatus'
> & {
  description: string
  type: ProviderType
  ipAddress: string
  credentialId: string | null
  /** Present on current backend responses; optional internally for legacy fixtures. */
  role?: ProviderRole | undefined
  credentialStatus: ProviderCredentialStatus
  /** UI-only: not part of the providers contract; the form defaults it to 22. */
  port?: number | undefined
  /** Validated GET record before UI normalization. */
  rawRecord?: ProviderRecordOutput | undefined
}

export type ProviderSubmitData = Provider
import type { Provider } from '@/generated/api/models/provider.gen'
import type {
  ProviderRecordOutput,
  ProviderType as GeneratedProviderType,
} from '@/generated/api/zod.gen'
