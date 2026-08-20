import { useSearchParams } from 'react-router'
import { RESOURCE_INVENTORY_PAGE_SIZES } from './useResourceInventorySearchParams'
import {
  VMWARE_ACTIVE_PROVIDER_PARAM,
  VMWARE_DEFAULT_SEARCH_PARAM,
  VMWARE_DEFAULT_TAG_PARAM,
} from './vmwareSearchParamKeys'

export const RESOURCE_TABS = ['vmware', 'flashsystem', 'ibm-power'] as const
export type ResourceTab = (typeof RESOURCE_TABS)[number]

export interface ResourceSourceSelection {
  resourceTab: ResourceTab
  providerId: string | null
}

const RESOURCE_FILTER_PARAMS: Record<ResourceTab, readonly string[]> = {
  vmware: ['powerState', 'connectionState', 'cluster', 'tags', 'untagged'],
  flashsystem: ['poolId', 'hostId', 'status'],
  'ibm-power': ['partitionKind', 'partitionState', 'operatingSystemType', 'volumeState'],
}

function isResourceTab(value: string | null): value is ResourceTab {
  return RESOURCE_TABS.some((tab) => tab === value)
}

function clearInheritedVmwareDefaults(searchParams: URLSearchParams) {
  const defaultSearch = searchParams.get(VMWARE_DEFAULT_SEARCH_PARAM)
  if (defaultSearch !== null && searchParams.get('search') === defaultSearch) {
    searchParams.delete('search')
  }
  searchParams.delete(VMWARE_DEFAULT_SEARCH_PARAM)
  searchParams.delete(VMWARE_DEFAULT_TAG_PARAM)
  searchParams.delete(VMWARE_ACTIVE_PROVIDER_PARAM)
}

export function useResourceTabSearchParam() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('resource')
  const resourceTab: ResourceTab = isResourceTab(requestedTab) ? requestedTab : 'vmware'
  const requestedProviderId = searchParams.get('providerId')
  const providerId = requestedProviderId && requestedProviderId !== 'null' ? requestedProviderId : null

  const setResourceSource = ({ resourceTab: tab, providerId: nextProviderId }: ResourceSourceSelection) => {
    const next = new URLSearchParams(searchParams)
    const sourceChanged = resourceTab !== tab || providerId !== nextProviderId
    if (!sourceChanged) return

    if (sourceChanged && (resourceTab === 'vmware' || tab === 'vmware')) {
      clearInheritedVmwareDefaults(next)
    }
    const resourceFilterKeys = new Set(Object.values(RESOURCE_FILTER_PARAMS).flat())
    resourceFilterKeys.forEach((key) => { next.delete(key) })
    next.delete('search')
    if (tab === 'vmware') next.delete('resource')
    else next.set('resource', tab)
    if (nextProviderId) next.set('providerId', nextProviderId)
    else next.delete('providerId')
    const requestedPageSize = Number(next.get('pageSize'))
    const pageSize = RESOURCE_INVENTORY_PAGE_SIZES.includes(requestedPageSize as (typeof RESOURCE_INVENTORY_PAGE_SIZES)[number])
      ? requestedPageSize
      : RESOURCE_INVENTORY_PAGE_SIZES[0]
    next.set('page', '1')
    next.set('pageSize', String(pageSize))
    setSearchParams(next, { replace: true })
  }

  const setResourceTab = (tab: ResourceTab) => {
    setResourceSource({ resourceTab: tab, providerId: null })
  }

  return { resourceTab, providerId, setResourceSource, setResourceTab }
}
