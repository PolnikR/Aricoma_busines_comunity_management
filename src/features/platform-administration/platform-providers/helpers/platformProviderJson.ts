import type { PlatformProviderRecord } from '../model/platformProviderTypes'

export function toPlatformProviderJson(provider: PlatformProviderRecord): object {
  return provider.rawRecord ?? provider
}
