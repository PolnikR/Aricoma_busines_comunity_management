import type {
  RecoveryGroupDraft,
  RecoveryGroupTopology,
  RecoveryGroupResourceConfiguration,
  RecoveryGroupVmMetadata,
} from '../model/recoveryGroupTypes'
import { RecoveryGroupsError } from './recoveryGroupsErrors'

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
  id: string
  name: string
  description: string
  providerId: string
  policySetId: string
  resources: string[]
  relatedVolumeProviderId: string | null
  relatedVolumes: string[]
  topology: RecoveryGroupTopology
  metroMirrorMode: 'existing' | null
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
  const sourceVolumes = draft.resourceType === 'vm' ? (draft.relatedVolumes ?? []) : draft.resources
  const auxiliaryNamesByVolume = isMetroMirror
    ? Object.fromEntries(sourceVolumes.map(volume => [
      volume.trim(),
      (draft.auxiliaryNamesByVolume?.[volume] ?? draft.auxiliaryNamesByVolume?.[volume.trim()] ?? '').trim(),
    ]))
    : {}
  const consistencyGroupId = isMetroMirror ? (draft.consistencyGroupId?.trim() ?? '') : null
  const orchestrationProviderId = draft.orchestrationProviderId?.trim() ?? ''
  const configuration = findSubmittableConfiguration(draft)

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
    || !configuration
    || !orchestrationProviderId
    || !topology
    || draft.metroMirrorMode === 'managed'
    || (isMetroMirror && (
      draft.metroMirrorMode !== 'existing'
      || !consistencyGroupId
      || sourceVolumes.length === 0
      || (draft.resourceType === 'vm' && !relatedVolumeProviderId)
      || Object.values(auxiliaryNamesByVolume).some(name => !name)
    ))
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
    topology,
    metroMirrorMode: isMetroMirror ? 'existing' : null,
    consistencyGroupId,
    auxiliaryNamesByVolume,
    configuration: { ...configuration },
    vmMetadataByName: draft.vmMetadataByName,
    orchestrationProviderId,
    pushToOrchestrator: draft.pushToOrchestrator,
  }
}
