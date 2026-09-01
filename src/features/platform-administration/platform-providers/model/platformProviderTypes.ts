import type { OrchestrationProvider } from '@/generated/api/models/orchestrationProvider.gen'
import type {
  OrchestrationProviderRecordOutput,
  ProviderType as GeneratedProviderType,
} from '@/generated/api/zod.gen'

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
  BACKEND: ['notificationEmail', 'loggingEnabled', 'jwtEnabled', 'swaggerEnables'],
  KEYCLOAK: ['realm', 'clientId', 'credentialId'],
} as const satisfies Record<PlatformProviderType, readonly (keyof OrchestrationProvider)[]>

export function isPlatformProviderType(value: GeneratedProviderType): value is PlatformProviderType {
  return PLATFORM_PROVIDER_TYPES.some(type => type === value)
}

export const PLATFORM_PROVIDER_CREDENTIAL_STATUSES = ['ok', 'missing', 'none'] as const

export type PlatformProviderCredentialStatus =
  (typeof PLATFORM_PROVIDER_CREDENTIAL_STATUSES)[number]

export type PlatformProviderSubmitData = OrchestrationProvider

interface PlatformProviderConfigShape {
  ipAddress: string
  port: number
  dagDir: string
  credentialId: string
  notificationEmail: string | null
  fromEmail: string | null
  disableSsl: boolean | null
  disableTls: boolean | null
  loggingEnabled: boolean | null
  jwtEnabled: boolean | null
  swaggerEnables: boolean | null
  realm: string
  clientId: string
}

interface PlatformProviderBase {
  id: string
  name: string
  description: string
  type: PlatformProviderType
  role?: 'source' | 'target'
  url?: string
}

type PlatformProviderVariant<
  TType extends PlatformProviderType,
  TConfig extends Partial<PlatformProviderConfigShape>,
> = PlatformProviderBase
  & { type: TType }
  & TConfig
  & Partial<Record<Exclude<keyof PlatformProviderConfigShape, keyof TConfig>, never>>

export type AirflowPlatformProvider = PlatformProviderVariant<'AIRFLOW', {
  ipAddress: string
  port: number
  dagDir: string
  credentialId: string
  notificationEmail: string | null
}>

export type SmtpPlatformProvider = PlatformProviderVariant<'SMTP', {
  ipAddress: string
  port: number
  fromEmail: string | null
  disableSsl: boolean | null
  disableTls: boolean | null
}>

export type BackendPlatformProvider = PlatformProviderVariant<'BACKEND', {
  notificationEmail: string | null
  loggingEnabled: boolean | null
  jwtEnabled: boolean | null
  swaggerEnables: boolean | null
}>

export type KeycloakPlatformProvider = PlatformProviderVariant<'KEYCLOAK', {
  realm: string
  clientId: string
  credentialId: string
}>

export type PlatformProviderCoreRecord =
  | AirflowPlatformProvider
  | SmtpPlatformProvider
  | BackendPlatformProvider
  | KeycloakPlatformProvider

export type PlatformProviderRecord = PlatformProviderCoreRecord & {
  credentialStatus: PlatformProviderCredentialStatus
  /** Validated GET record before UI normalization; unknown API fields are removed by Zod. */
  rawRecord?: OrchestrationProviderRecordOutput | undefined
}

export type PlatformProviderWriteRecord = PlatformProviderCoreRecord & {
  credentialStatus?: PlatformProviderCredentialStatus
}
