import { useCallback, useEffect, useState } from 'react'
import type { RecoveryGroup, RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import {
  createRecoveryGroup,
  deleteRecoveryGroup,
  listRecoveryGroups,
  RECOVERY_GROUPS_CHANGED_EVENT,
  updateRecoveryGroup,
} from '../api/recoveryGroupsStorage'

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

  const update = useCallback((id: string, draft: RecoveryGroupDraft) => {
    const group = updateRecoveryGroup(id, draft)
    setGroups(current => current.map(item => item.id === id ? group : item))
    return group
  }, [])

  const remove = useCallback((id: string) => {
    deleteRecoveryGroup(id)
    setGroups(current => current.filter(group => group.id !== id))
  }, [])

  return { groups, create, update, remove, refresh }
}
