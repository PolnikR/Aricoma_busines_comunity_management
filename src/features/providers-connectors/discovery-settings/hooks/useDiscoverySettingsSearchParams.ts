import { useSearchParams } from 'react-router'

export const DISCOVERY_SETTINGS_TABS = ['configuration', 'history', 'notifications'] as const
export const DISCOVERY_SETTINGS_HISTORY_LIMITS = [25, 50, 100] as const

export type DiscoverySettingsTab = (typeof DISCOVERY_SETTINGS_TABS)[number]
export type DiscoverySettingsHistoryLimit = (typeof DISCOVERY_SETTINGS_HISTORY_LIMITS)[number]

function isDiscoverySettingsTab(value: string | null): value is DiscoverySettingsTab {
  return DISCOVERY_SETTINGS_TABS.some(tab => tab === value)
}

function parseDiscoverySettingsHistoryLimit(value: string | null): DiscoverySettingsHistoryLimit {
  if (value === '25') return 25
  if (value === '100') return 100
  return 50
}

export function useDiscoverySettingsSearchParams() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const requestedLimit = searchParams.get('limit')
  const requestedProviderId = searchParams.get('providerId')?.trim()
  const tab: DiscoverySettingsTab = isDiscoverySettingsTab(requestedTab) ? requestedTab : 'configuration'
  const limit = parseDiscoverySettingsHistoryLimit(requestedLimit)
  const providerId = requestedProviderId || undefined

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

  const setLimit = (nextLimit: DiscoverySettingsHistoryLimit) => {
    setSearchParams(current => {
      const next = new URLSearchParams(current)
      if (nextLimit === 50) next.delete('limit')
      else next.set('limit', String(nextLimit))
      return next
    })
  }

  return { tab, providerId, limit, setTab, setProviderId, setLimit }
}
