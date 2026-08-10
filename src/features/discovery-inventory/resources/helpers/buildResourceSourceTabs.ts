import type { ProviderRecord, ProviderType } from '@/features/providers-connectors/providers/model/providerTypes'

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

function compareProviders(left: ProviderRecord, right: ProviderRecord) {
  return left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' })
    || left.id.localeCompare(right.id, undefined, { numeric: true, sensitivity: 'base' })
}

export function buildResourceSourceTabs(
  providers: readonly ProviderRecord[],
  labels: ResourceSourceTabLabels,
): ResourceSourceTab[] {
  return RESOURCE_SOURCE_TAB_DEFINITIONS.flatMap<ResourceSourceTab>(({ resourceTab, providerType }) => {
    const matchingProviders = providers
      .filter(provider => provider.type === providerType)
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
