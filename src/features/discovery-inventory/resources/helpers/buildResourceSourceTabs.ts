import type { ProviderRecord, ProviderRole, ProviderType } from '@/features/providers-connectors/providers/model/providerTypes'
import { getProvidersByTypeAndRole } from '@/features/providers-connectors/providers/utils/providerFilters'

export const RESOURCE_SOURCE_TAB_DEFINITIONS = [
  { resourceTab: 'vmware', providerType: 'VMWARE' },
  { resourceTab: 'flashsystem', providerType: 'FLASHCOPY' },
  { resourceTab: 'ibm-power', providerType: 'IBM_POWER' },
] as const satisfies readonly { resourceTab: string; providerType: ProviderType }[]

export type ResourceSourceTabType = (typeof RESOURCE_SOURCE_TAB_DEFINITIONS)[number]['resourceTab']

export interface ResourceSourceTab {
  value: string
  resourceTab: ResourceSourceTabType
  providerId: string | null
  label: string
}

export type ResourceSourceTabLabels = Record<ResourceSourceTabType, string>

const RESOURCE_PROVIDER_BADGE_PREFIX: Record<ResourceSourceTabType, string> = {
  vmware: 'vm',
  flashsystem: 'flash',
  'ibm-power': 'power',
}

export function formatResourceProviderId(resourceTab: ResourceSourceTabType, providerId: string): string {
  const suffix = /(\d+)$/.exec(providerId)?.[1]
  return suffix ? `${RESOURCE_PROVIDER_BADGE_PREFIX[resourceTab]}-${suffix}` : providerId
}

function compareProviders(left: ProviderRecord, right: ProviderRecord) {
  return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' })
    || left.id.localeCompare(right.id, undefined, { numeric: true, sensitivity: 'base' })
}

export function buildResourceTabsByRole(
  providers: readonly ProviderRecord[],
  labels: ResourceSourceTabLabels,
  role: ProviderRole,
): ResourceSourceTab[] {
  return RESOURCE_SOURCE_TAB_DEFINITIONS.flatMap<ResourceSourceTab>(({ resourceTab, providerType }) => {
    const matchingProviders = getProvidersByTypeAndRole(providers, providerType, role)
      .slice()
      .sort(compareProviders)

    if (matchingProviders.length === 0) {
      return [{
        value: `${resourceTab}:none`,
        resourceTab,
        providerId: null,
        label: labels[resourceTab],
      }]
    }

    const includeProviderName = matchingProviders.length > 1
    return matchingProviders.map((provider) => ({
      value: `${resourceTab}:${provider.id}`,
      resourceTab,
      providerId: provider.id,
      label: includeProviderName
        ? `${labels[resourceTab]} · ${provider.name || provider.id}`
        : labels[resourceTab],
    }))
  })
}

export function buildResourceSourceTabs(
  providers: readonly ProviderRecord[],
  labels: ResourceSourceTabLabels,
): ResourceSourceTab[] {
  return buildResourceTabsByRole(providers, labels, 'source')
}

export function buildResourceTargetTabs(
  providers: readonly ProviderRecord[],
  labels: ResourceSourceTabLabels,
): ResourceSourceTab[] {
  return buildResourceTabsByRole(providers, labels, 'target')
}
