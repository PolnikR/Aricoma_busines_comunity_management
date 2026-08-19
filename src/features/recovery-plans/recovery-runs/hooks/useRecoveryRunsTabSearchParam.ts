import { useSearchParams } from 'react-router'

export const RECOVERY_RUN_TABS = ['all', 'applications', 'groups'] as const
export type RecoveryRunTab = (typeof RECOVERY_RUN_TABS)[number]

function isRecoveryRunTab(value: string | null): value is RecoveryRunTab {
  return RECOVERY_RUN_TABS.some(tab => tab === value)
}

// Tab + optional entity filter live entirely in the URL so the page is both
// independently usable (no params = "all") and deep-linkable from an
// Application/Recovery Group detail panel's "View recovery runs" action.
export function useRecoveryRunsTabSearchParam() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab: RecoveryRunTab = isRecoveryRunTab(requestedTab) ? requestedTab : 'all'
  const requestedEntityId = searchParams.get('entityId')
  const entityId = requestedEntityId && requestedEntityId !== 'null' ? requestedEntityId : null

  const setTab = (nextTab: RecoveryRunTab) => {
    const next = new URLSearchParams(searchParams)
    if (nextTab === 'all') next.delete('tab')
    else next.set('tab', nextTab)
    next.delete('entityId')
    setSearchParams(next, { replace: true })
  }

  const setEntityId = (nextEntityId: string | null) => {
    const next = new URLSearchParams(searchParams)
    if (nextEntityId) next.set('entityId', nextEntityId)
    else next.delete('entityId')
    setSearchParams(next, { replace: true })
  }

  return { tab, entityId, setTab, setEntityId }
}
