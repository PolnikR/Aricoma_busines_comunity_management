import { useCallback, useEffect, useState } from 'react'
import type { RecoveryGroup, RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import {
  createRecoveryGroup,
  listRecoveryGroups,
  RECOVERY_GROUPS_CHANGED_EVENT,
} from '../storage/recoveryGroupsStorage'

export function useRecoveryGroups() {
  const [groups, setGroups] = useState<RecoveryGroup[]>(listRecoveryGroups)

  const refresh = useCallback(() => {
    setGroups(listRecoveryGroups())
  }, [])

  useEffect(() => {
    window.addEventListener(RECOVERY_GROUPS_CHANGED_EVENT, refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener(RECOVERY_GROUPS_CHANGED_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [refresh])

  const create = useCallback((draft: RecoveryGroupDraft) => {
    const group = createRecoveryGroup(draft)
    setGroups(current => [...current, group])
    return group
  }, [])

  return { groups, create, refresh }
}
