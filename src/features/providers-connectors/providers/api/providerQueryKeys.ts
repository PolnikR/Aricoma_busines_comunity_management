import type { ProviderRoleFilter } from '../model/providerTypes'

export const providerKeys = {
  all: ['providers'] as const,
  list: (role: ProviderRoleFilter = 'all') => [...providerKeys.all, 'list', role] as const,
}
