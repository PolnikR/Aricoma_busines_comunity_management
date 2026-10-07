import type { ProviderType } from '@/features/providers-connectors/providers/model/providerTypes'

export const SOURCE_PROVIDER_TYPES = ['VMWARE', 'IBM_POWER'] as const satisfies readonly ProviderType[]

// The backend compares platform case-insensitively.
function isSourceProviderType(value: string): boolean {
  return SOURCE_PROVIDER_TYPES.some(type => type === value.toUpperCase())
}

// application.platform is the provider TYPE and source_provider_id the selected
// provider. Records saved before source_provider_id existed stored the provider
// id in platform; a bare type there names no provider, so it selects nothing.
export function sourceProviderIdOf(application: {
  platform: string
  source_provider_id?: string | null | undefined
}): string {
  if (application.source_provider_id) return application.source_provider_id
  return isSourceProviderType(application.platform) ? '' : application.platform
}
