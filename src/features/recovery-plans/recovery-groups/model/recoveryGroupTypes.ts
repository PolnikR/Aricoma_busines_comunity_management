export type RecoveryGroupWorkloadType = 'VMware' | 'IBM FlashSystem'
export type RecoveryGroupResourceType = 'VM' | 'Volume'
export type RecoveryGroupStatus = 'Draft' | 'Active'

export interface RecoveryGroupListItem {
  id: string
  name: string
  description: string
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
  workloadType: RecoveryGroupWorkloadType | null
  resourceType: RecoveryGroupResourceType | null
  resources: string[]
}
