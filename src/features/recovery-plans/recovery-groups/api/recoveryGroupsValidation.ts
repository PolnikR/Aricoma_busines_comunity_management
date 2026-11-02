import type {
  RecoveryGroupDraft,
  RecoveryGroupMetroMirrorMode,
  RecoveryGroupTopology,
  RecoveryGroupResourceConfiguration,
  RecoveryGroupVmMetadata,
} from '../model/recoveryGroupTypes'
import { RecoveryGroupsError } from './recoveryGroupsErrors'
import { isRecoveryGroupEmailValid } from '../model/recoveryGroupEmail'

// The resource combinations a group can be submitted with.
const SUBMITTABLE_CONFIGURATIONS: readonly RecoveryGroupResourceConfiguration[] = [
  { sourceCategory: 'backup_system_workload', workloadType: 'vmware_virtual_machines', resourceType: 'vm' },
  { sourceCategory: 'backup_system_workload', workloadType: 'ibm_power_virtual_machines', resourceType: 'vm' },
  { sourceCategory: 'storage_system', workloadType: 'ibm_flashsystem', resourceType: 'volume' },
]

function findSubmittableConfiguration(draft: RecoveryGroupDraft): RecoveryGroupResourceConfiguration | undefined {
  return SUBMITTABLE_CONFIGURATIONS.find(configuration => (
    configuration.sourceCategory === draft.sourceCategory
    && configuration.workloadType === draft.workloadType
    && configuration.resourceType === draft.resourceType
  ))
}

export interface ValidatedRecoveryGroupDraft {
  notificationEmail?: string | null
  targetPool?: string | null
  id: string
  name: string
  description: string
  providerId: string
  policySetId: string
  resources: string[]
  relatedVolumeProviderId: string | null
  relatedVolumes: string[]
  topology: RecoveryGroupTopology
  metroMirrorMode: RecoveryGroupMetroMirrorMode | null
  consistencyGroupId: string | null
  auxiliaryNamesByVolume: Record<string, string>
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
  const topology = draft.topology === undefined ? 'local' : draft.topology
  const isMetroMirror = topology === 'metro_mirror'
  // Managed CG id and auxiliary names are backend-generated, never user input.
  const isExistingMetroMirror = isMetroMirror && draft.metroMirrorMode === 'existing'
  const sourceVolumes = draft.resourceType === 'vm' ? (draft.relatedVolumes ?? []) : draft.resources
  const auxiliaryNamesByVolume = isExistingMetroMirror
    ? Object.fromEntries(sourceVolumes.map(volume => [
      volume.trim(),
      (draft.auxiliaryNamesByVolume?.[volume] ?? draft.auxiliaryNamesByVolume?.[volume.trim()] ?? '').trim(),
    ]))
    : {}
  const consistencyGroupId = isExistingMetroMirror ? (draft.consistencyGroupId?.trim() ?? '') : null
  const orchestrationProviderId = draft.orchestrationProviderId?.trim() ?? ''
  const configuration = findSubmittableConfiguration(draft)

  if (
    !draft.id.trim()
    || !isRecoveryGroupEmailValid(draft.notificationEmail)
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
    || !configuration
    || !orchestrationProviderId
    || !topology
    || (isMetroMirror && (
      (draft.metroMirrorMode !== 'existing' && draft.metroMirrorMode !== 'managed')
      || sourceVolumes.length === 0
      || (draft.resourceType === 'vm' && !relatedVolumeProviderId)
    ))
    || (isExistingMetroMirror && (
      !consistencyGroupId
      || Object.values(auxiliaryNamesByVolume).some(name => !name)
    ))
  ) {
    throw new RecoveryGroupsError('invalid_draft', 'Recovery group data is invalid')
  }

  return {
    notificationEmail: draft.notificationEmail?.trim() ? draft.notificationEmail.trim() : null,
    targetPool: isMetroMirror && draft.metroMirrorMode === 'managed' && draft.targetPool ? draft.targetPool : null,
    id: draft.id,
    name,
    description,
    providerId,
    policySetId,
    resources,
    relatedVolumeProviderId,
    relatedVolumes,
    topology,
    metroMirrorMode: isMetroMirror ? (draft.metroMirrorMode ?? null) : null,
    consistencyGroupId,
    auxiliaryNamesByVolume,
    configuration: { ...configuration },
    vmMetadataByName: draft.vmMetadataByName,
    orchestrationProviderId,
    pushToOrchestrator: draft.pushToOrchestrator,
  }
}
