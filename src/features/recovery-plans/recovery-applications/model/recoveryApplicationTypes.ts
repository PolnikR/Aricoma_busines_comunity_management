import type { RecoveryAppRecordOutput } from '@/generated/api/zod.gen'

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
  id: string
  name: string
  description?: string | undefined
  vms: RecoveryVM[]
  volumes?: { name: string }[] | undefined
}

// A tier being edited in the builder, before a recovery group has necessarily
// been attached. Only `DraftRecoveryTier` allows an absent `recovery_group` —
// every other tier type below requires one, matching the backend contract.
export interface DraftRecoveryTier {
  order: number
  description: string
  vms?: RecoveryVM[] | undefined
  recovery_group?: RecoveryGroup | undefined
}

// A tier ready for (or read from) the backend: submit_recovery_dag and
// get_recovery_apps both require every tier to carry a recovery group.
export interface RecoveryTier {
  order: number
  description: string
  vms?: RecoveryVM[] | undefined
  recovery_group: RecoveryGroup
}

export interface RecoveryApplicationData {
  id: string
  policy_set_id: string
  application: {
    name: string
    description: string
    environment: string
    platform: string
    source_connection: string
    target_connection: string
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
  applications: RecoveryApplicationApiRecord[]
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
  policy_set_id?: string | null | undefined
  application: RecoveryApplicationData['application']
  airflow_run_id?: string | null | undefined
  push_to_orchestrator?: boolean | null | undefined
  orchestration_provider_id?: string | null | undefined
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
      tiers: Record<string, DraftRecoveryTier>
      airflow_run_id?: string | null | undefined
      push_to_orchestrator?: boolean | undefined
    }
  }
  airflowRunId?: string | null | undefined
  pushToOrchestrator?: boolean | undefined
  orchestrationProviderId?: string | null | undefined
  submission?: ApplicationSubmission
  /** Validated GET record before UI mapping; unknown API fields are removed by Zod. */
  rawRecord?: RecoveryAppRecordOutput | undefined
}

export interface RecoveryApplicationFormState {
  fileName: string
  policySetId: string
  pushToOrchestrator: boolean
  name: string
  description: string
  environment: string
  platform: string
  orchestrationProviderId: string
  sourceConnection: string
  targetConnection: string
  tiers: Map<string, DraftRecoveryTier>
}
