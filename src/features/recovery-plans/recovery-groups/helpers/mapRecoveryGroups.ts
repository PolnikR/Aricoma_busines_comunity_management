import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type {
  RecoveryGroup,
  RecoveryGroupReadRecord,
  RecoveryGroupResourceConfiguration,
  RecoveryGroupVmMetadata,
} from '../model/recoveryGroupTypes'
import type {
  RecoveryGroupApiRecord,
  RecoveryGroupSubmitPayload,
} from '../api/schemas/recoveryGroupsSchema'
import type { ValidatedRecoveryGroupDraft } from '../api/recoveryGroupsValidation'

function toVmMetadataByName(
  vms: RecoveryGroupApiRecord['vms'],
): Record<string, RecoveryGroupVmMetadata> {
  return Object.fromEntries(
    vms.map(({ name, ...metadata }) => [name, metadata] as const),
  )
}

function toVmsPayload(
  resources: string[],
  vmMetadataByName: Record<string, RecoveryGroupVmMetadata> | undefined,
): RecoveryGroupSubmitPayload['vms'] {
  return resources.map((name, index) => ({
    name,
    order: index + 1,
    ...vmMetadataByName?.[name],
  }))
}

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

  const common = {
    id: record.id,
    name: record.name,
    description: record.description,
    policySetId: record.policy_set_id,
    resourceCount: 0,
    status: 'Draft' as const,
    airflowRunId: record.airflow_run_id,
    pushToOrchestrator: record.push_to_orchestrator,
    orchestrationProviderId: record.orchestration_provider_id ?? null,
    rawRecord: record,
  }

  if (vmProviderId) {
    const provider = providers.find(candidate => candidate.id === vmProviderId)
    if (!provider || (provider.type !== 'VMWARE' && provider.type !== 'IBM_POWER')) {
      return {
        ...common,
        providerId: vmProviderId,
        sourceCategory: 'backup_system_workload',
        workloadType: null,
        resourceType: 'vm',
        resources: vmResources,
        relatedVolumeProviderId: volumeProviderId || null,
        relatedVolumes: volumeResources,
        resourceCount: vmResources.length,
        status: vmResources.length > 0 ? 'Active' : 'Draft',
        providerResolution: 'unresolved' as const,
        vmMetadataByName: toVmMetadataByName(record.vms),
      }
    }
    return {
      ...common,
      providerId: vmProviderId,
      ...vmConfiguration(provider),
      resources: vmResources,
      relatedVolumeProviderId: volumeProviderId || null,
      relatedVolumes: volumeResources,
      resourceCount: vmResources.length,
      status: vmResources.length > 0 ? 'Active' : 'Draft',
      providerResolution: 'resolved' as const,
      vmMetadataByName: toVmMetadataByName(record.vms),
    }
  }

  return {
    ...common,
    providerId: volumeProviderId || null,
    sourceCategory: 'storage_system',
    workloadType: 'ibm_flashsystem',
    resourceType: 'volume',
    resources: volumeResources,
    relatedVolumeProviderId: null,
    relatedVolumes: [],
    resourceCount: volumeResources.length,
    status: volumeResources.length > 0 ? 'Active' : 'Draft',
    providerResolution: volumeProviderId && providers.some(
      provider => provider.id === volumeProviderId && provider.type === 'FLASHCOPY',
    ) ? 'resolved' as const : 'unresolved' as const,
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
    policy_set_id: draft.policySetId,
    vms: isVmGroup ? toVmsPayload(draft.resources, draft.vmMetadataByName) : [],
    volumes: isVmGroup
      ? draft.relatedVolumes.map(name => ({ name }))
      : draft.resources.map(name => ({ name })),
  }
}

export function toRecoveryGroupJson(group: RecoveryGroup): RecoveryGroupReadRecord {
  if (group.rawRecord) return group.rawRecord

  const isVmGroup = group.resourceType === 'vm'
  return {
    id: group.id,
    name: group.name,
    description: group.description,
    provider_id_vm: isVmGroup ? (group.providerId ?? '') : '',
    provider_id_volume: isVmGroup
      ? (group.relatedVolumeProviderId ?? '')
      : (group.providerId ?? ''),
    policy_set_id: group.policySetId,
    vms: isVmGroup ? toVmsPayload(group.resources, group.vmMetadataByName) : [],
    volumes: isVmGroup
      ? group.relatedVolumes.map(name => ({ name }))
      : group.resources.map(name => ({ name })),
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
    policySetId: draft.policySetId,
    ...draft.configuration,
    resources: draft.resources,
    relatedVolumeProviderId: isVmGroup ? draft.relatedVolumeProviderId : null,
    relatedVolumes: isVmGroup ? draft.relatedVolumes : [],
    resourceCount: draft.resources.length,
    status: 'Active',
    vmMetadataByName: isVmGroup ? draft.vmMetadataByName : undefined,
    pushToOrchestrator: draft.pushToOrchestrator,
    airflowRunId: null,
    orchestrationProviderId: draft.orchestrationProviderId,
    providerResolution: 'resolved',
  }
}
