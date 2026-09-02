import type { PlatformProviderRecord, PlatformProviderType } from './platformProviderTypes'

export interface PlatformProviderFormData {
  id: string
  name: string
  description: string
  type: '' | PlatformProviderType
  url: string
  ipAddress: string
  port: string
  dagDir: string
  credentialId: string
  notificationEmail: string
  fromEmail: string
  disableSsl: boolean | null
  disableTls: boolean | null
  loggingEnabled: boolean | null
  jwtEnabled: boolean | null
  swaggerEnabled: boolean | null
  realm: string
  clientId: string
}

const EMPTY_TYPE_SPECIFIC_FIELDS = {
  ipAddress: '',
  port: '22',
  dagDir: '',
  credentialId: '',
  notificationEmail: '',
  fromEmail: '',
  disableSsl: null,
  disableTls: null,
  loggingEnabled: null,
  jwtEnabled: null,
  swaggerEnabled: null,
  realm: '',
  clientId: '',
} as const

export const EMPTY_PLATFORM_PROVIDER_FORM: PlatformProviderFormData = {
  id: '',
  name: '',
  description: '',
  type: '',
  url: '',
  ...EMPTY_TYPE_SPECIFIC_FIELDS,
}

export function changePlatformProviderFormType(
  current: PlatformProviderFormData,
  type: '' | PlatformProviderType,
): PlatformProviderFormData {
  return {
    id: current.id,
    name: current.name,
    description: current.description,
    type,
    url: current.url,
    ...EMPTY_TYPE_SPECIFIC_FIELDS,
  }
}

export function toPlatformProviderFormData(provider: PlatformProviderRecord): PlatformProviderFormData {
  const common = {
    id: provider.id,
    name: provider.name,
    description: provider.description,
    type: provider.type,
    url: provider.url ?? '',
    ...EMPTY_TYPE_SPECIFIC_FIELDS,
  }

  switch (provider.type) {
    case 'AIRFLOW':
      return {
        ...common,
        ipAddress: provider.ipAddress,
        port: String(provider.port),
        dagDir: provider.dagDir,
        credentialId: provider.credentialId,
        notificationEmail: provider.notificationEmail ?? '',
      }
    case 'SMTP':
      return {
        ...common,
        ipAddress: provider.ipAddress,
        port: String(provider.port),
        fromEmail: provider.fromEmail ?? '',
        disableSsl: provider.disableSsl,
        disableTls: provider.disableTls,
      }
    case 'BACKEND':
      return {
        ...common,
        notificationEmail: provider.notificationEmail ?? '',
        loggingEnabled: provider.loggingEnabled,
        jwtEnabled: provider.jwtEnabled,
        swaggerEnabled: provider.swaggerEnabled,
      }
    case 'KEYCLOAK':
      return {
        ...common,
        realm: provider.realm,
        clientId: provider.clientId,
        credentialId: provider.credentialId,
      }
  }
}

export function createInitialPlatformProviderForm(
  provider?: PlatformProviderRecord,
): PlatformProviderFormData {
  return provider ? toPlatformProviderFormData(provider) : EMPTY_PLATFORM_PROVIDER_FORM
}
