export type RecoveryGroupSourceCategory = 'backup_system_workload' | 'storage_system'
export type RecoveryGroupWorkloadType = 'vmware_virtual_machines' | 'ibm_flashsystem'
export type RecoveryGroupResourceType = 'vm' | 'volume'
export type RecoveryGroupStatus = 'Draft' | 'Active'

export interface RecoveryGroupListItem {
  id: string
  name: string
  description: string
  sourceCategory: RecoveryGroupSourceCategory
  workloadType: RecoveryGroupWorkloadType
  resourceType: RecoveryGroupResourceType
  resourceCount: number
  status: RecoveryGroupStatus
}

export interface RecoveryGroup extends RecoveryGroupListItem {
  resources: string[]
}

export interface RecoveryGroupDraft {
  id: string
  name: string
  description: string
  sourceCategory: RecoveryGroupSourceCategory | null
  workloadType: RecoveryGroupWorkloadType | null
  resourceType: RecoveryGroupResourceType | null
  resources: string[]
}
