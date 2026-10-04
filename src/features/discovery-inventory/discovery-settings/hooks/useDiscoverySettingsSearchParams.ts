import { useSearchParams } from 'react-router'

export const DISCOVERY_SETTINGS_TABS = ['configuration', 'history', 'notifications'] as const

export type DiscoverySettingsTab = (typeof DISCOVERY_SETTINGS_TABS)[number]

function isDiscoverySettingsTab(value: string | null): value is DiscoverySettingsTab {
  return DISCOVERY_SETTINGS_TABS.some(tab => tab === value)
}

export function useDiscoverySettingsSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const requestedProviderId = searchParams.get('providerId')?.trim()
  const tab: DiscoverySettingsTab = isDiscoverySettingsTab(requestedTab) ? requestedTab : 'configuration'
  const providerId = requestedProviderId ?? undefined

  const setTab = (nextTab: DiscoverySettingsTab) => {
    setSearchParams(current => {
      const next = new URLSearchParams(current)
      if (nextTab === 'configuration') next.delete('tab')
      else next.set('tab', nextTab)
      return next
    })
  }

  const setProviderId = (nextProviderId: string) => {
    const trimmedProviderId = nextProviderId.trim()
    setSearchParams(current => {
      const next = new URLSearchParams(current)
      if (trimmedProviderId) next.set('providerId', trimmedProviderId)
      else next.delete('providerId')
      return next
    })
  }

  return { tab, providerId, setTab, setProviderId }
}
