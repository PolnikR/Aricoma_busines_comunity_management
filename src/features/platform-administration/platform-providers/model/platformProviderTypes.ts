import type {
  OrchestrationProvider,
  ProviderType as GeneratedProviderType,
} from '@/generated/query/zod'
import type { selectPlatformProviders } from './selectPlatformProviders'

export const PLATFORM_PROVIDER_TYPES = [
  'AIRFLOW',
  'SMTP',
  'BACKEND',
  'KEYCLOAK',
] as const satisfies readonly GeneratedProviderType[]

export type PlatformProviderType = (typeof PLATFORM_PROVIDER_TYPES)[number]

export const PLATFORM_PROVIDER_COMMON_FIELDS = [
  'id',
  'name',
  'description',
  'type',
  'url',
] as const satisfies readonly (keyof OrchestrationProvider)[]

export const PLATFORM_PROVIDER_FIELD_CONTRACT = {
  AIRFLOW: ['ipAddress', 'port', 'dagDir', 'credentialId', 'notificationEmail'],
  SMTP: ['ipAddress', 'port', 'fromEmail', 'disableSsl', 'disableTls'],
  BACKEND: ['notificationEmail', 'loggingEnabled', 'jwtEnabled', 'swaggerEnabled'],
  KEYCLOAK: ['realm', 'clientId', 'credentialId'],
} as const satisfies Record<PlatformProviderType, readonly (keyof OrchestrationProvider)[]>

export function isPlatformProviderType(value: GeneratedProviderType): value is PlatformProviderType {
  return PLATFORM_PROVIDER_TYPES.some(type => type === value)
}

export type PlatformProviderSubmitData = OrchestrationProvider

export type PlatformProviderRecord = ReturnType<typeof selectPlatformProviders>[number]
