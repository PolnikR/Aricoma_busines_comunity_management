import { useSearchParams } from 'react-router'

export const RESOURCE_TABS = ['vmware', 'flashsystem', 'ibm-power'] as const
export type ResourceTab = (typeof RESOURCE_TABS)[number]

export interface ResourceSourceSelection {
  resourceTab: ResourceTab
  providerId: string | null
}

function isResourceTab(value: string | null): value is ResourceTab {
  return RESOURCE_TABS.some((tab) => tab === value)
}

export function useResourceTabSearchParam() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('resource')
  const resourceTab: ResourceTab = isResourceTab(requestedTab) ? requestedTab : 'vmware'
  const requestedProviderId = searchParams.get('providerId')
  const providerId = requestedProviderId && requestedProviderId !== 'null' ? requestedProviderId : null

  const setResourceSource = ({ resourceTab: tab, providerId: nextProviderId }: ResourceSourceSelection) => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'vmware') next.delete('resource')
    else next.set('resource', tab)
    if (nextProviderId) next.set('providerId', nextProviderId)
    else next.delete('providerId')
    next.set('page', '1')
    setSearchParams(next, { replace: true })
  }

  const setResourceTab = (tab: ResourceTab) => {
    setResourceSource({ resourceTab: tab, providerId: null })
  }

  return { resourceTab, providerId, setResourceSource, setResourceTab }
}
