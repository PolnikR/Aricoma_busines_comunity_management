import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type {
  RecoveryGroup,
  RecoveryGroupResourceConfiguration,
} from '../model/recoveryGroupTypes'
import type {
  RecoveryGroupApiRecord,
  RecoveryGroupSubmitPayload,
} from '../api/schemas/recoveryGroupsSchema'
import type { ValidatedRecoveryGroupDraft } from '../api/recoveryGroupsValidation'

function vmConfiguration(provider: ProviderRecord): RecoveryGroupResourceConfiguration {
  if (provider.type === 'VMWARE') {
    return {
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
    }
  }
  if (provider.type === 'IBM_POWER') {
    return {
      sourceCategory: 'backup_system_workload',
      workloadType: 'ibm_power_virtual_machines',
      resourceType: 'vm',
    }
  }
  throw new Error(`Unsupported VM provider type ${provider.type}`)
}

export function mapRecoveryGroupApiRecord(
  record: RecoveryGroupApiRecord,
  providers: ProviderRecord[],
): RecoveryGroup {
  const vmProviderId = record.provider_id_vm.trim()
  const volumeProviderId = record.provider_id_volume.trim()
  const vmResources = record.vms.map(resource => resource.name)
  const volumeResources = record.volumes.map(resource => resource.name)

  if (vmProviderId) {
    const provider = providers.find(candidate => candidate.id === vmProviderId)
    if (!provider || (provider.type !== 'VMWARE' && provider.type !== 'IBM_POWER')) {
      throw new Error(`Unknown VM provider ${vmProviderId}`)
    }
    return {
      id: record.id,
      name: record.name,
      description: record.description,
      providerId: vmProviderId,
      ...vmConfiguration(provider),
      resources: vmResources,
      relatedVolumeProviderId: volumeProviderId || null,
      relatedVolumes: volumeResources,
      resourceCount: vmResources.length,
      status: vmResources.length > 0 ? 'Active' : 'Draft',
    }
  }

  if (!volumeProviderId) {
    throw new Error(`Recovery group ${record.id} has no provider`)
  }

  return {
    id: record.id,
    name: record.name,
    description: record.description,
    providerId: volumeProviderId,
    sourceCategory: 'storage_system',
    workloadType: 'ibm_flashsystem',
    resourceType: 'volume',
    resources: volumeResources,
    relatedVolumeProviderId: null,
    relatedVolumes: [],
    resourceCount: volumeResources.length,
    status: volumeResources.length > 0 ? 'Active' : 'Draft',
  }
}

export function toRecoveryGroupSubmitPayload(
  draft: ValidatedRecoveryGroupDraft,
  id: string,
): RecoveryGroupSubmitPayload {
  const isVmGroup = draft.configuration.resourceType === 'vm'
  return {
    id,
    name: draft.name,
    description: draft.description,
    provider_id_vm: isVmGroup ? draft.providerId : '',
    provider_id_volume: isVmGroup
      ? (draft.relatedVolumeProviderId ?? '')
      : draft.providerId,
    vms: isVmGroup ? draft.resources.map(name => ({ name })) : [],
    volumes: (isVmGroup ? draft.relatedVolumes : draft.resources).map(name => ({ name })),
  }
}

export function toRecoveryGroup(
  draft: ValidatedRecoveryGroupDraft,
  id: string,
): RecoveryGroup {
  const isVmGroup = draft.configuration.resourceType === 'vm'
  return {
    id,
    name: draft.name,
    description: draft.description,
    providerId: draft.providerId,
    ...draft.configuration,
    resources: draft.resources,
    relatedVolumeProviderId: isVmGroup ? draft.relatedVolumeProviderId : null,
    relatedVolumes: isVmGroup ? draft.relatedVolumes : [],
    resourceCount: draft.resources.length,
    status: 'Active',
  }
}
