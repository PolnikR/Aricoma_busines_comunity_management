export type RecoveryGroupSourceCategory = 'backup_system_workload' | 'storage_system'
export type RecoveryGroupWorkloadType =
  | 'vmware_virtual_machines'
  | 'ibm_power_virtual_machines'
  | 'ibm_flashsystem'
export type RecoveryGroupResourceType = 'vm' | 'volume'
export type RecoveryGroupStatus = 'Draft' | 'Active'

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
}

export type RecoveryGroupListItem = RecoveryGroupBase & RecoveryGroupResourceConfiguration

export type RecoveryGroup = RecoveryGroupListItem & {
  resources: string[]
  relatedVolumeProviderId: string | null
  relatedVolumes: string[]
  vmMetadataByName?: Record<string, RecoveryGroupVmMetadata> | undefined
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
}
