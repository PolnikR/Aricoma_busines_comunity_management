import type { RecoveryGroupRecordOutput } from '@/generated/api/zod.gen'

export type RecoveryGroupSourceCategory = 'backup_system_workload' | 'storage_system'
export type RecoveryGroupWorkloadType =
  | 'vmware_virtual_machines'
  | 'ibm_power_virtual_machines'
  | 'ibm_flashsystem'
export type RecoveryGroupResourceType = 'vm' | 'volume'
export type RecoveryGroupStatus = 'Draft' | 'Active'
export type RecoveryGroupProviderResolution = 'resolved' | 'unresolved'

export type RecoveryGroupResourceConfiguration =
  | {
      sourceCategory: 'backup_system_workload'
      workloadType: 'vmware_virtual_machines'
      resourceType: 'vm'
    }
  | {
      sourceCategory: 'backup_system_workload'
      workloadType: 'ibm_power_virtual_machines'
      resourceType: 'vm'
    }
  | {
      sourceCategory: 'backup_system_workload'
      workloadType: null
      resourceType: 'vm'
    }
  | {
      sourceCategory: 'storage_system'
      workloadType: 'ibm_flashsystem'
      resourceType: 'volume'
    }

export interface RecoveryGroupVmMetadata {
  order?: number | undefined
  hostname?: string | undefined
  ip_address?: string | undefined
  os?: string | undefined
  cpu?: number | undefined
  memory_gb?: number | undefined
  storage_gb?: number | undefined
}

interface RecoveryGroupBase {
  id: string
  name: string
  description: string
  providerId: string | null
  policySetId: string
  resourceCount: number
  status: RecoveryGroupStatus
  providerResolution?: RecoveryGroupProviderResolution
}

export type RecoveryGroupListItem = RecoveryGroupBase & RecoveryGroupResourceConfiguration

export type RecoveryGroup = RecoveryGroupListItem & {
  resources: string[]
  relatedVolumeProviderId: string | null
  relatedVolumes: string[]
  vmMetadataByName?: Record<string, RecoveryGroupVmMetadata> | undefined
  // Server-assigned DAG run id from the last orchestrator push. Read-only:
  // this is a run identifier, not the orchestration provider's id.
  airflowRunId?: string | null | undefined
  pushToOrchestrator?: boolean | undefined
  // Platform provider (AIRFLOW) this group is/was orchestrated to. Read-only.
  orchestrationProviderId?: string | null | undefined
  rawRecord?: RecoveryGroupReadRecord | undefined
}

// Read record with non-null defaults for the fields the mapper relies on. VM
// metadata is a SPEC GAP: the generated RecoveryVM declares only `name`.
export type RecoveryGroupReadRecord = Omit<
  RecoveryGroupRecordOutput,
  'description' | 'provider_id_vm' | 'provider_id_volume' | 'policy_set_id' | 'vms'
> & {
  description: string
  provider_id_vm: string
  provider_id_volume: string
  policy_set_id: string
  vms: ({ name: string } & RecoveryGroupVmMetadata)[]
}

export interface RecoveryGroupDraft {
  id: string
  name: string
  description: string
  sourceCategory: RecoveryGroupSourceCategory | null
  workloadType: RecoveryGroupWorkloadType | null
  resourceType: RecoveryGroupResourceType | null
  providerId: string | null
  policySetId: string | null
  resources: string[]
  relatedVolumeProviderId?: string | null
  relatedVolumes?: string[]
  vmMetadataByName?: Record<string, RecoveryGroupVmMetadata> | undefined
  orchestrationProviderId: string | null
  pushToOrchestrator: boolean
}
