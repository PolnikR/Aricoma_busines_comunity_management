import { toProgrammaticId } from '@/shared/utils/programmaticId'
import type { RecoveryGroup, RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { RecoveryGroupsError } from './recoveryGroupsErrors'
import {
  readRecoveryGroupsFromStorage,
  writeRecoveryGroupsToStorage,
} from './recoveryGroupsLocalStorage'
import { validateRecoveryGroupDraft } from './recoveryGroupsValidation'

export const toRecoveryGroupId = toProgrammaticId

export async function fetchRecoveryGroups(): Promise<RecoveryGroup[]> {
  return Promise.resolve(readRecoveryGroupsFromStorage())
}

export async function createRecoveryGroup(draft: RecoveryGroupDraft): Promise<RecoveryGroup> {
  await Promise.resolve()
  const validated = validateRecoveryGroupDraft(draft)
  const id = toRecoveryGroupId(validated.id)
  if (!id) throw new RecoveryGroupsError('invalid_draft', 'Recovery group ID is required')

  const groups = readRecoveryGroupsFromStorage()
  if (groups.some(group => group.id === id)) {
    throw new RecoveryGroupsError('duplicate_id', 'A recovery group with this ID already exists')
  }

  const group: RecoveryGroup = {
    id,
    name: validated.name,
    description: validated.description,
    ...validated.configuration,
    resources: validated.resources,
    resourceCount: validated.resources.length,
    status: 'Active',
  }

  writeRecoveryGroupsToStorage([...groups, group])
  return group
}

export async function updateRecoveryGroup(
  id: string,
  draft: RecoveryGroupDraft,
): Promise<RecoveryGroup> {
  await Promise.resolve()
  const validated = validateRecoveryGroupDraft(draft)
  const groups = readRecoveryGroupsFromStorage()
  const existingIndex = groups.findIndex(group => group.id === id)
  const existing = groups[existingIndex]

  if (!existing) throw new RecoveryGroupsError('not_found', 'Recovery group not found')
  if (
    existing.sourceCategory !== validated.configuration.sourceCategory
    || existing.workloadType !== validated.configuration.workloadType
    || existing.resourceType !== validated.configuration.resourceType
  ) {
    throw new RecoveryGroupsError('immutable_type', 'Recovery group resource type cannot be changed')
  }

  const group: RecoveryGroup = {
    id,
    name: validated.name,
    description: validated.description,
    ...validated.configuration,
    resources: validated.resources,
    resourceCount: validated.resources.length,
    status: 'Active',
  }
  const updated = [...groups]
  updated[existingIndex] = group
  writeRecoveryGroupsToStorage(updated)
  return group
}

export async function deleteRecoveryGroup(id: string): Promise<void> {
  await Promise.resolve()
  const groups = readRecoveryGroupsFromStorage()
  if (!groups.some(group => group.id === id)) {
    throw new RecoveryGroupsError('not_found', 'Recovery group not found')
  }
  writeRecoveryGroupsToStorage(groups.filter(group => group.id !== id))
}
