import type {
  ProviderRecord,
  ProviderType,
} from '@/features/providers-connectors/providers/model/providerTypes'
import type { InfrastructureTopologyPlatform } from './topologyTypes'

const providerTypeByPlatform: Record<InfrastructureTopologyPlatform, ProviderType> = {
  vmware: 'VMWARE',
  'ibm-power': 'IBM_POWER',
}

export function parseInfrastructurePlatform(
  value: string | null,
): InfrastructureTopologyPlatform {
  return value === 'ibm-power' ? 'ibm-power' : 'vmware'
}

export function getProviderTypeForPlatform(
  platform: InfrastructureTopologyPlatform,
): ProviderType {
  return providerTypeByPlatform[platform]
}

export function getInfrastructureProviders(
  providers: ProviderRecord[],
  platform: InfrastructureTopologyPlatform,
): ProviderRecord[] {
  const providerType = getProviderTypeForPlatform(platform)
  return providers.filter(({ type }) => type === providerType)
}

export function resolveInfrastructureProvider(
  providers: ProviderRecord[],
  platform: InfrastructureTopologyPlatform,
  requestedProviderId?: string | null,
): ProviderRecord | null {
  const compatibleProviders = getInfrastructureProviders(providers, platform)
  return compatibleProviders.find(({ id }) => id === requestedProviderId)
    ?? compatibleProviders[0]
    ?? null
}
