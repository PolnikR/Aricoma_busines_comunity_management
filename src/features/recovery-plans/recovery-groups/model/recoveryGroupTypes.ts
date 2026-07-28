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
