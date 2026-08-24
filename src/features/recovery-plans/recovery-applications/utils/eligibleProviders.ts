import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'

export function isEligibleSourceProvider(provider: ProviderRecord): boolean {
  return (provider.type === 'VMWARE' || provider.type === 'IBM_POWER')
    && provider.role !== 'target'
    && provider.credentialStatus === 'ok'
}

export function isEligiblePlatformProvider(provider: PlatformProviderRecord): boolean {
  return provider.credentialStatus === 'ok'
}

export function getEligibleSourceProviders(providers: ProviderRecord[]): ProviderRecord[] {
  return providers.filter(isEligibleSourceProvider)
}

export function getEligiblePlatformProviders(providers: PlatformProviderRecord[]): PlatformProviderRecord[] {
  return providers.filter(isEligiblePlatformProvider)
}
