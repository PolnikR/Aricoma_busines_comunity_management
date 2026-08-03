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
    platform: string
    source_connection: string
    target_connection: string
    tiers: Record<string, RecoveryTier>
  }
}

export interface SubmitRecoveryApplicationInput {
  fileName: string
  providerId: string
  data: RecoveryApplicationData
}

export interface ApplicationSubmission {
  status: string
  remotePath: string
}

export interface SubmitDagResponse {
  status: string
  filename: string
  local: string
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
  platform: string
  sourceConnection: string
  targetConnection: string
  tiers: Map<string, RecoveryTier>
}
