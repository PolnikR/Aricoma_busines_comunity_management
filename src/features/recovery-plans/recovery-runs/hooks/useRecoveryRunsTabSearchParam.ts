import { useSearchParams } from 'react-router'

export const RECOVERY_RUN_TABS = ['all', 'applications', 'groups'] as const
export type RecoveryRunTab = (typeof RECOVERY_RUN_TABS)[number]
export type RecoveryRunEntityType = 'application' | 'group'

function isRecoveryRunTab(value: string | null): value is RecoveryRunTab {
  return RECOVERY_RUN_TABS.some(tab => tab === value)
}

function isRecoveryRunEntityType(value: string | null): value is RecoveryRunEntityType {
  return value === 'application' || value === 'group'
}

// Tab + optional entity filter live entirely in the URL so the page is both
// independently usable (no params = "all") and deep-linkable from an
// Application/Recovery Group detail panel's "View recovery runs" action.
export function useRecoveryRunsTabSearchParam() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab: RecoveryRunTab = isRecoveryRunTab(requestedTab) ? requestedTab : 'all'
  const requestedEntityId = searchParams.get('entityId')
  const requestedEntityType = searchParams.get('entityType')
  const hasEntityIdentity = Boolean(requestedEntityId && requestedEntityId !== 'null')
    && isRecoveryRunEntityType(requestedEntityType)
  const entityId = hasEntityIdentity ? requestedEntityId : null
  const entityType = hasEntityIdentity ? requestedEntityType : null

  const setTab = (nextTab: RecoveryRunTab) => {
    const next = new URLSearchParams(searchParams)
    if (nextTab === 'all') next.delete('tab')
    else next.set('tab', nextTab)
    next.delete('entityId')
    next.delete('entityType')
    setSearchParams(next, { replace: true })
  }

  const setEntity = (nextEntityType: RecoveryRunEntityType | null, nextEntityId?: string) => {
    const next = new URLSearchParams(searchParams)
    if (nextEntityType && nextEntityId) {
      next.set('entityType', nextEntityType)
      next.set('entityId', nextEntityId)
    } else {
      next.delete('entityType')
      next.delete('entityId')
    }
    setSearchParams(next, { replace: true })
  }

  return { tab, entityType, entityId, setTab, setEntity }
}
