import { z } from 'zod'
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

export function toRecoveryGroupId(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

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

  const id = toRecoveryGroupId(draft.name)
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
