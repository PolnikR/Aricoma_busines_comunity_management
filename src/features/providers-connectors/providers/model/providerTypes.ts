import type { Provider, ProviderType as GeneratedProviderType } from '@/generated/query/zod'
import type { selectProviders } from './selectProviders'

export const PROVIDER_TYPES = ['VMWARE', 'FLASHCOPY', 'HITACHI', 'IBM_POWER'] as const satisfies readonly GeneratedProviderType[]

export type ProviderType = (typeof PROVIDER_TYPES)[number]

export const PROVIDER_ROLES = ['source', 'target'] as const

export type ProviderRole = (typeof PROVIDER_ROLES)[number]

export type ProviderRoleFilter = ProviderRole | 'all'

export type ProviderCredentialStatus = 'ok' | 'missing' | 'none'

export type ProviderRecord = ReturnType<typeof selectProviders>[number]

export type ProviderSubmitData = Provider
