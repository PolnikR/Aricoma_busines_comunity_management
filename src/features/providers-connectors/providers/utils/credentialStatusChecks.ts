import type { ProviderRecord } from '../model/providerTypes'
import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'

export function isCredentialOk(provider: ProviderRecord | PlatformProviderRecord): boolean {
  return provider.credentialStatus === 'ok'
}

export function filterByProviderCredentialStatus(providers: ProviderRecord[]): ProviderRecord[] {
  return providers.filter(isCredentialOk)
}

export function filterByPlatformProviderCredentialStatus(
  providers: PlatformProviderRecord[],
): PlatformProviderRecord[] {
  return providers.filter(isCredentialOk)
}
