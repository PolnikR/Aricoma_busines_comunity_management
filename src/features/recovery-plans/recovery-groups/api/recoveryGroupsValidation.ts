import { z } from 'zod'
import type {
  RecoveryGroupDraft,
  RecoveryGroupResourceConfiguration,
} from '../model/recoveryGroupTypes'
import { RecoveryGroupsError } from './recoveryGroupsErrors'

export const recoveryGroupConfigurationSchema = z.discriminatedUnion('workloadType', [
  z.object({
    sourceCategory: z.literal('backup_system_workload'),
    workloadType: z.literal('vmware_virtual_machines'),
    resourceType: z.literal('vm'),
  }),
  z.object({
    sourceCategory: z.literal('storage_system'),
    workloadType: z.literal('ibm_flashsystem'),
    resourceType: z.literal('volume'),
  }),
])

export interface ValidatedRecoveryGroupDraft {
  id: string
  name: string
  description: string
  resources: string[]
  configuration: RecoveryGroupResourceConfiguration
}

export function validateRecoveryGroupDraft(draft: RecoveryGroupDraft): ValidatedRecoveryGroupDraft {
  const name = draft.name.trim()
  const description = draft.description.trim()
  const resources = draft.resources.map(resource => resource.trim())
  const configuration = recoveryGroupConfigurationSchema.safeParse({
    sourceCategory: draft.sourceCategory,
    workloadType: draft.workloadType,
    resourceType: draft.resourceType,
  })

  if (
    !draft.id.trim()
    || !name
    || !description
    || resources.length === 0
    || resources.some(resource => !resource)
    || new Set(resources).size !== resources.length
    || !configuration.success
  ) {
    throw new RecoveryGroupsError('invalid_draft', 'Recovery group data is invalid')
  }

  return {
    id: draft.id,
    name,
    description,
    resources,
    configuration: configuration.data,
  }
}
