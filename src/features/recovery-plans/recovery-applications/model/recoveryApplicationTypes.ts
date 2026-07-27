export interface RecoveryVM {
  name: string
}

export interface RecoveryTier {
  name: string
  order: number
  description: string
  vms: RecoveryVM[]
}

export interface RecoveryApplicationData {
  application: {
    name: string
    description: string
    environment: 'dev' | 'staging' | 'prod'
    provider_id: string
    platform: 'VMware vCenter ESXi'
    source_connection: 'vcenter_default'
    target_connection: 'vcenter_default_destination'
    tiers: Record<string, RecoveryTier>
  }
}

export interface ApplicationSubmission {
  status: string
  remotePath: string
}

export interface RecoveryApplication {
  id: string
  data: RecoveryApplicationData
  submission?: ApplicationSubmission
  createdAt: string
  updatedAt: string
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
      tiers: Record<string, unknown>
    }
  }
  submission?: ApplicationSubmission
}

export interface RecoveryApplicationFormState {
  name: string
  description: string
  environment: 'dev' | 'staging' | 'prod'
  provider: string
  tiers: Map<string, RecoveryTier>
}
