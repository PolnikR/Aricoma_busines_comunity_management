import type { ProviderRecord } from '../model/providerTypes'

export function toProviderJson(provider: ProviderRecord): object {
  return provider.rawRecord ?? provider
}
