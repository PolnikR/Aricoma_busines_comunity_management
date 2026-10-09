import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { SOURCE_PROVIDER_TYPES } from './sourceProvider'

export function isEligibleSourceProvider(provider: ProviderRecord): boolean {
  return SOURCE_PROVIDER_TYPES.some(type => type === provider.type)
    && provider.role !== 'target'
    && provider.credentialStatus === 'ok'
}

export function isEligiblePlatformProvider(provider: PlatformProviderRecord): boolean {
  return provider.credentialStatus === 'ok'
}

export function getEligibleSourceProviders(providers: ProviderRecord[]): ProviderRecord[] {
  return providers.filter(isEligibleSourceProvider)
}

// The target is the same kind of compute provider as the source: VMware
// recovers onto a target vCenter, IBM Power onto target LPARs.
export function getEligibleTargetProviders(
  providers: ProviderRecord[],
  sourceType: ProviderRecord['type'] | undefined,
): ProviderRecord[] {
  return providers.filter(provider => provider.type === sourceType
    && provider.role === 'target'
    && provider.credentialStatus === 'ok')
}

export function getEligiblePlatformProviders(providers: PlatformProviderRecord[]): PlatformProviderRecord[] {
  return providers.filter(isEligiblePlatformProvider)
}
