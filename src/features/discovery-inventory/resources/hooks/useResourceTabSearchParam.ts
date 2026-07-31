import { useSearchParams } from 'react-router-dom'

export const RESOURCE_TABS = ['vmware', 'flashsystem', 'ibm-power'] as const
export type ResourceTab = (typeof RESOURCE_TABS)[number]

function isResourceTab(value: string | null): value is ResourceTab {
  return RESOURCE_TABS.some((tab) => tab === value)
}

export function useResourceTabSearchParam() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('resource')
  const resourceTab: ResourceTab = isResourceTab(requestedTab) ? requestedTab : 'vmware'

  const setResourceTab = (tab: ResourceTab) => {
    const next = new URLSearchParams(searchParams)
    if (tab === 'vmware') next.delete('resource')
    else next.set('resource', tab)
    setSearchParams(next, { replace: true })
  }

  return { resourceTab, setResourceTab }
}
