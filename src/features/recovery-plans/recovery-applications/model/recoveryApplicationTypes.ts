export interface RecoveryVM {
  name: string
  order?: number | undefined
  hostname?: string | undefined
  ip_address?: string | undefined
  os?: string | undefined
  cpu?: number | undefined
  memory_gb?: number | undefined
  storage_gb?: number | undefined
}

export interface RecoveryGroup {
  name: string
  description: string
  vms: RecoveryVM[]
  volumes?: { name: string }[] | undefined
}

export interface RecoveryTier {
  order: number
  description: string
  vms?: RecoveryVM[] | undefined
  recovery_group?: RecoveryGroup | undefined
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
      description?: string | undefined
      environment: string
      platform: string
      source_connection?: string | undefined
      target_connection?: string | undefined
      tiers: Record<string, RecoveryTier>
      airflow_run_id?: string | null | undefined
      push_to_orchestrator?: boolean | undefined
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
  orchestrationProviderId: string
  sourceConnection: string
  targetConnection: string
  tiers: Map<string, RecoveryTier>
}
