import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { SOURCE_PROVIDER_TYPES } from './sourceProvider'

// New applications require providers in their configured source/target roles.
// Saved applications keep their stored providers in the locked edit flow.
function hasRecoveryRole(provider: ProviderRecord, role: 'source' | 'target'): boolean {
  if (role === 'target') return provider.role === 'target'
  return provider.type === 'IBM_POWER' ? provider.role === 'source' : provider.role !== 'target'
}

export function isEligibleSourceProvider(provider: ProviderRecord): boolean {
  return SOURCE_PROVIDER_TYPES.some(type => type === provider.type)
    && hasRecoveryRole(provider, 'source')
    && provider.credentialStatus === 'ok'
}

export function isEligiblePlatformProvider(provider: PlatformProviderRecord): boolean {
  return provider.type === 'AIRFLOW' && provider.credentialStatus === 'ok'
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
    && hasRecoveryRole(provider, 'target')
    && provider.credentialStatus === 'ok')
}

export function getEligiblePlatformProviders(providers: PlatformProviderRecord[]): PlatformProviderRecord[] {
  return providers.filter(isEligiblePlatformProvider)
}
