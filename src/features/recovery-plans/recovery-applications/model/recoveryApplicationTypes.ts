export interface RecoveryVM {
  name: string
}

export interface RecoveryGroup {
  name: string
  description: string
  vms: RecoveryVM[]
}

export interface RecoveryTier {
  order: number
  description: string
  recovery_group?: RecoveryGroup
}

export interface RecoveryApplicationData {
  application: {
    name: string
    description: string
    environment: 'dev' | 'staging' | 'prod'
    platform: 'VMware vCenter ESXi'
    source_connection: 'vcenter_default'
    target_connection: 'vcenter_default_destination'
    tiers: Record<string, RecoveryTier>
  }
}

export interface SubmitRecoveryApplicationInput {
  fileName: string
  data: RecoveryApplicationData
}

export interface ApplicationSubmission {
  status: string
  remotePath: string
}

export interface RecoveryApplicationListItem {
  id: string
  data: {
    application: {
      name: string
      description: string
      environment: 'dev' | 'staging' | 'prod'
      platform: string
      source_connection: string
      target_connection: string
      tiers: Record<string, RecoveryTier>
    }
  }
  submission?: ApplicationSubmission
}

export interface RecoveryApplicationFormState {
  fileName: string
  name: string
  description: string
  environment: 'dev' | 'staging' | 'prod'
  tiers: Map<string, RecoveryTier>
}
