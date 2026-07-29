export type RecoveryGroupSourceCategory = 'backup_system_workload' | 'storage_system'
export type RecoveryGroupWorkloadType = 'vmware_virtual_machines' | 'ibm_flashsystem'
export type RecoveryGroupResourceType = 'vm' | 'volume'
export type RecoveryGroupStatus = 'Draft' | 'Active'

export type RecoveryGroupResourceConfiguration =
  | {
      sourceCategory: 'backup_system_workload'
      workloadType: 'vmware_virtual_machines'
      resourceType: 'vm'
    }
  | {
      sourceCategory: 'storage_system'
      workloadType: 'ibm_flashsystem'
      resourceType: 'volume'
    }

interface RecoveryGroupBase {
  id: string
  name: string
  description: string
  resourceCount: number
  status: RecoveryGroupStatus
}

export type RecoveryGroupListItem = RecoveryGroupBase & RecoveryGroupResourceConfiguration

export type RecoveryGroup = RecoveryGroupListItem & {
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
