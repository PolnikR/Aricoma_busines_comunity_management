import type { RecoveryGroup as GeneratedRecoveryGroup } from '@/generated/query/zod'
import type {
  RecoveryGroupInventoryResponse,
  RecoveryGroupInventoryResponseOutput,
  RecoveryGroupRecordOutput,
  RecoveryVMOutput,
  RollbackReportOutput,
} from '@/generated/query/zod'

// Rollback report of delete/rollback responses, typed by the patched spec.
export type RollbackReport = RollbackReportOutput

// Body of POST /submit_recovery_group, including per-VM metadata (patched spec).
export type RecoveryGroupSubmitPayload = GeneratedRecoveryGroup

export type RecoveryGroupSourceCategory = 'backup_system_workload' | 'storage_system'
export type RecoveryGroupWorkloadType =
  | 'vmware_virtual_machines'
  | 'ibm_power_virtual_machines'
  | 'ibm_flashsystem'
export type RecoveryGroupResourceType = 'vm' | 'volume'
export type RecoveryGroupStatus = 'Draft' | 'Active'
export type RecoveryGroupProviderResolution = 'resolved' | 'unresolved'

// Discovery scope configured on the selected provider (Providers & Connectors).
export interface RecoveryGroupProviderScope {
  vmPrefix?: string | null
  vmTags?: readonly string[]
}

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

export type RecoveryGroupVmMetadata = Omit<RecoveryVMOutput, 'name'>
export type RecoveryGroupTopology = RecoveryGroupRecordOutput['topology']
export type RecoveryGroupMetroMirrorMode = NonNullable<RecoveryGroupRecordOutput['metro_mirror']>['mode']

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
  topology?: RecoveryGroupTopology | undefined
  metroMirrorMode?: RecoveryGroupMetroMirrorMode | null | undefined
  consistencyGroupId?: string | null | undefined
  auxiliaryNamesByVolume?: Record<string, string> | undefined
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
  'description' | 'provider_id_vm' | 'provider_id_volume' | 'policy_set_id'
> & {
  description: string
  provider_id_vm: string
  provider_id_volume: string
  policy_set_id: string
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
  topology?: RecoveryGroupTopology | null | undefined
  metroMirrorMode?: RecoveryGroupMetroMirrorMode | null | undefined
  consistencyGroupId?: string | null | undefined
  auxiliaryNamesByVolume?: Record<string, string> | undefined
  vmMetadataByName?: Record<string, RecoveryGroupVmMetadata> | undefined
  orchestrationProviderId: string | null
  pushToOrchestrator: boolean
}

// validatingMutator hands select the parsed Output shape (defaults applied, e.g.
// empty relation lists); the generated hook declares the Input shape.
export const selectRecoveryGroupInventory = (response: RecoveryGroupInventoryResponse) =>
  response as RecoveryGroupInventoryResponseOutput
