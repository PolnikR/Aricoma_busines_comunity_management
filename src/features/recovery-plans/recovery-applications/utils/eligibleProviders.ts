import type { PlatformProviderRecord } from '@/features/platform-administration/platform-providers/model/platformProviderTypes'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import { SOURCE_PROVIDER_TYPES } from './sourceProvider'

// The backend checks roles only for VMware (source role=source, target
// role=target); IBM Power has no role check, so one HMC provider may serve as
// both source and target.
function hasRecoveryRole(provider: ProviderRecord, role: 'source' | 'target'): boolean {
  if (provider.type === 'IBM_POWER') return true
  return role === 'source' ? provider.role !== 'target' : provider.role === 'target'
}

export function isEligibleSourceProvider(provider: ProviderRecord): boolean {
  return SOURCE_PROVIDER_TYPES.some(type => type === provider.type)
    && hasRecoveryRole(provider, 'source')
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
    && hasRecoveryRole(provider, 'target')
    && provider.credentialStatus === 'ok')
}

export function getEligiblePlatformProviders(providers: PlatformProviderRecord[]): PlatformProviderRecord[] {
  return providers.filter(isEligiblePlatformProvider)
}
