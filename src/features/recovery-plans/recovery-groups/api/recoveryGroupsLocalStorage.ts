import { z } from 'zod'
import type { RecoveryGroup } from '../model/recoveryGroupTypes'
import { RecoveryGroupsError } from './recoveryGroupsErrors'
import { recoveryGroupConfigurationSchema } from './recoveryGroupsValidation'

export const RECOVERY_GROUPS_STORAGE_KEY = 'abcm.recovery-groups'

const storedBaseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  resources: z.array(z.string().min(1)).min(1),
})

const currentStoredGroupSchema = storedBaseSchema.and(recoveryGroupConfigurationSchema)

const legacyStoredGroupSchema = storedBaseSchema.extend({
  workloadType: z.enum(['VMware', 'IBM FlashSystem']),
  resourceType: z.enum(['VM', 'Volume']),
})

function deriveGroup(
  group: z.infer<typeof currentStoredGroupSchema>,
): RecoveryGroup {
  return {
    ...group,
    resources: [...new Set(group.resources)],
    resourceCount: new Set(group.resources).size,
    status: 'Active',
  }
}

function parseStoredGroup(value: unknown): RecoveryGroup | null {
  const current = currentStoredGroupSchema.safeParse(value)
  if (current.success) return deriveGroup(current.data)

  const legacy = legacyStoredGroupSchema.safeParse(value)
  if (!legacy.success) return null

  const configuration = legacy.data.workloadType === 'VMware'
    ? {
        sourceCategory: 'backup_system_workload' as const,
        workloadType: 'vmware_virtual_machines' as const,
        resourceType: 'vm' as const,
      }
    : {
        sourceCategory: 'storage_system' as const,
        workloadType: 'ibm_flashsystem' as const,
        resourceType: 'volume' as const,
      }

  return deriveGroup({
    id: legacy.data.id,
    name: legacy.data.name,
    description: legacy.data.description,
    resources: legacy.data.resources,
    ...configuration,
  })
}

export function readRecoveryGroupsFromStorage(): RecoveryGroup[] {
  const stored = localStorage.getItem(RECOVERY_GROUPS_STORAGE_KEY)
  if (!stored) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(stored)
  } catch {
    throw new RecoveryGroupsError('invalid_storage', 'Stored recovery groups are not valid JSON')
  }

  if (!Array.isArray(parsed)) {
    throw new RecoveryGroupsError('invalid_storage', 'Stored recovery groups must be an array')
  }

  const groups = parsed
    .map(parseStoredGroup)
    .filter((group): group is RecoveryGroup => group !== null)

  if (parsed.length > 0 && groups.length === 0) {
    throw new RecoveryGroupsError('invalid_storage', 'Stored recovery groups contain no valid records')
  }

  localStorage.setItem(RECOVERY_GROUPS_STORAGE_KEY, JSON.stringify(groups))
  return groups
}

export function writeRecoveryGroupsToStorage(groups: RecoveryGroup[]): void {
  localStorage.setItem(RECOVERY_GROUPS_STORAGE_KEY, JSON.stringify(groups))
}
