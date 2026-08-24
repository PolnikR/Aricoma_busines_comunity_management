import { z } from 'zod'
import type {
  RecoveryGroupDraft,
  RecoveryGroupResourceConfiguration,
  RecoveryGroupVmMetadata,
} from '../model/recoveryGroupTypes'
import { RecoveryGroupsError } from './recoveryGroupsErrors'

export const recoveryGroupConfigurationSchema = z.discriminatedUnion('workloadType', [
  z.object({
    sourceCategory: z.literal('backup_system_workload'),
    workloadType: z.literal('vmware_virtual_machines'),
    resourceType: z.literal('vm'),
  }),
  z.object({
    sourceCategory: z.literal('backup_system_workload'),
    workloadType: z.literal('ibm_power_virtual_machines'),
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
  providerId: string
  policySetId: string
  resources: string[]
  relatedVolumeProviderId: string | null
  relatedVolumes: string[]
  configuration: RecoveryGroupResourceConfiguration
  vmMetadataByName?: Record<string, RecoveryGroupVmMetadata> | undefined
  orchestrationProviderId: string
  pushToOrchestrator: boolean
}

export function validateRecoveryGroupDraft(draft: RecoveryGroupDraft): ValidatedRecoveryGroupDraft {
  const name = draft.name.trim()
  const description = draft.description.trim()
  const providerId = draft.providerId?.trim() ?? ''
  const policySetId = draft.policySetId?.trim() ?? ''
  const resources = draft.resources.map(resource => resource.trim())
  const normalizedRelatedVolumeProviderId = draft.relatedVolumeProviderId?.trim() ?? ''
  const relatedVolumeProviderId = normalizedRelatedVolumeProviderId
    ? normalizedRelatedVolumeProviderId
    : null
  const relatedVolumes = (draft.relatedVolumes ?? []).map(resource => resource.trim())
  const orchestrationProviderId = draft.orchestrationProviderId?.trim() ?? ''
  const configuration = recoveryGroupConfigurationSchema.safeParse({
    sourceCategory: draft.sourceCategory,
    workloadType: draft.workloadType,
    resourceType: draft.resourceType,
  })

  if (
    !draft.id.trim()
    || !name
    || !description
    || !providerId
    || !policySetId
    || resources.length === 0
    || resources.some(resource => !resource)
    || new Set(resources).size !== resources.length
    || relatedVolumes.some(resource => !resource)
    || new Set(relatedVolumes).size !== relatedVolumes.length
    || (relatedVolumes.length > 0 && !relatedVolumeProviderId)
    || !configuration.success
    || !orchestrationProviderId
  ) {
    throw new RecoveryGroupsError('invalid_draft', 'Recovery group data is invalid')
  }

  return {
    id: draft.id,
    name,
    description,
    providerId,
    policySetId,
    resources,
    relatedVolumeProviderId,
    relatedVolumes,
    configuration: configuration.data,
    vmMetadataByName: draft.vmMetadataByName,
    orchestrationProviderId,
    pushToOrchestrator: draft.pushToOrchestrator,
  }
}
