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
  id: string
  policy_set_id: string
  application: {
    name: string
    description?: string | undefined
    environment: string
    platform: string
    source_connection?: string | undefined
    target_connection?: string | undefined
    tiers: Record<string, RecoveryTier>
  }
}

export interface SubmitRecoveryApplicationInput {
  providerId: string
  data: RecoveryApplicationData
  pushToOrchestrator: boolean
}

export interface ApplicationSubmission {
  status: string
  remotePath: string
}

export interface SubmitDagLocalResponse {
  recovery_applications: RecoveryApplicationApiRecord[]
}

export interface SubmitDagOrchestratedResponse extends SubmitDagLocalResponse {
  orchestrator_push: OrchestratorPush
}

export type SubmitDagResponse = SubmitDagLocalResponse | SubmitDagOrchestratedResponse

export interface OrchestratorPush {
  status: string
  dag: string
  json: string
  dag_id: string
}

export interface RecoveryApplicationApiRecord {
  id: string
  policy_set_id: string
  application: RecoveryApplicationData['application']
  airflow_run_id?: string | null | undefined
  push_to_orchestrator: boolean
}

export interface RecoveryApplicationListItem {
  id: string
  policySetId?: string | undefined
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
  airflowRunId?: string | null | undefined
  pushToOrchestrator?: boolean | undefined
  submission?: ApplicationSubmission
}

export interface RecoveryApplicationFormState {
  fileName: string
  policySetId: string
  pushToOrchestrator: boolean
  name: string
  description: string
  environment: 'dev' | 'staging' | 'prod'
  platform: string
  orchestrationProviderId: string
  sourceConnection: string
  targetConnection: string
  tiers: Map<string, RecoveryTier>
}
