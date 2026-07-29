import { z } from 'zod'
import { toProgrammaticId } from '@/shared/utils/programmaticId'
import type { RecoveryGroup, RecoveryGroupDraft } from '../model/recoveryGroupTypes'

const STORAGE_KEY = 'abcm.recovery-groups'
export const RECOVERY_GROUPS_CHANGED_EVENT = 'abcm:recovery-groups-changed'

const recoveryGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  workloadType: z.enum(['VMware', 'IBM FlashSystem']),
  resourceType: z.enum(['VM', 'Volume']),
  resourceCount: z.number().int().nonnegative(),
  status: z.enum(['Draft', 'Active']),
  resources: z.array(z.string()),
})

const recoveryGroupsSchema = z.array(recoveryGroupSchema)

export const toRecoveryGroupId = toProgrammaticId

export function listRecoveryGroups(): RecoveryGroup[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []
    const parsed: unknown = JSON.parse(stored)
    const result = recoveryGroupsSchema.safeParse(parsed)
    return result.success ? result.data : []
  } catch {
    return []
  }
}

export function createRecoveryGroup(draft: RecoveryGroupDraft): RecoveryGroup {
  if (!draft.workloadType || !draft.resourceType) {
    throw new Error('Recovery group resource type is required')
  }

  const id = toRecoveryGroupId(draft.id)
  if (!id) throw new Error('Recovery group name is required')

  const groups = listRecoveryGroups()
  if (groups.some(group => group.id === id)) {
    throw new Error('A recovery group with this name already exists')
  }

  const group: RecoveryGroup = {
    id,
    name: draft.name.trim(),
    description: draft.description.trim(),
    workloadType: draft.workloadType,
    resourceType: draft.resourceType,
    resources: [...draft.resources],
    resourceCount: draft.resources.length,
    status: draft.resources.length > 0 ? 'Active' : 'Draft',
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify([...groups, group]))
  window.dispatchEvent(new Event(RECOVERY_GROUPS_CHANGED_EVENT))
  return group
}

export function getRecoveryGroup(id: string): RecoveryGroup | undefined {
  return listRecoveryGroups().find(group => group.id === id)
}

export function updateRecoveryGroup(id: string, draft: RecoveryGroupDraft): RecoveryGroup {
  if (!draft.workloadType || !draft.resourceType) {
    throw new Error('Recovery group resource type is required')
  }

  const groups = listRecoveryGroups()
  const existingIndex = groups.findIndex(group => group.id === id)
  if (existingIndex === -1) {
    throw new Error('Recovery group not found')
  }

  const group: RecoveryGroup = {
    id,
    name: draft.name.trim(),
    description: draft.description.trim(),
    workloadType: draft.workloadType,
    resourceType: draft.resourceType,
    resources: [...draft.resources],
    resourceCount: draft.resources.length,
    status: draft.resources.length > 0 ? 'Active' : 'Draft',
  }
  const updatedGroups = [...groups]
  updatedGroups[existingIndex] = group
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedGroups))
  window.dispatchEvent(new Event(RECOVERY_GROUPS_CHANGED_EVENT))
  return group
}

export function deleteRecoveryGroup(id: string): void {
  const groups = listRecoveryGroups()
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(groups.filter(group => group.id !== id)),
  )
  window.dispatchEvent(new Event(RECOVERY_GROUPS_CHANGED_EVENT))
}
