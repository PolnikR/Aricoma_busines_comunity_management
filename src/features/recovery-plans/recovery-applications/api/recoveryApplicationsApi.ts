import {
  deleteRecoveryAppRouteDeleteRecoveryAppDelete,
  getRecoveryAppsGetRecoveryAppsGet,
  submitRecoveryDagSubmitRecoveryDagPost,
} from '@/generated/api/client.gen'
import {
  RecoveryAppsResponse,
  RecoveryAppSubmitResponse,
  type OrchestratorPushOutput,
  type RecoveryAppSubmitResponseOutput,
} from '@/generated/api/zod.gen'
import { parseGeneratedResponse } from '@/shared/api/generatedResponse'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type {
  RecoveryApplicationData,
  RecoveryApplicationListItem,
  SubmitDagResponse,
} from '../model/recoveryApplicationTypes'
import { mapRecoveryApplications } from '../helpers/mapRecoveryApplications'
import { rollbackReportSchema, type RollbackReport } from './schemas/recoveryApplicationsSchema'

export async function fetchRecoveryApplications(): Promise<RecoveryApplicationListItem[]> {
  try {
    const payload = await getRecoveryAppsGetRecoveryAppsGet()
    const parsed = parseGeneratedResponse(
      RecoveryAppsResponse,
      payload,
      'GET /get_recovery_apps',
    )
    return mapRecoveryApplications(parsed)
  } catch (error) {
    if (error instanceof OrvalApiError) {
      const reason = error.statusText || String(error.status)
      throw new Error(`Failed to fetch recovery applications: ${reason}`, { cause: error })
    }
    throw error
  }
}

// Submits the application JSON to the Airflow recovery-orchestration DAG.
// In dev the /api prefix is proxied to the backend (see vite.config.ts),
// so this becomes POST http://<backend>/submit_recovery_dag.
export async function submitRecoveryApplicationDag(
  providerId: string,
  data: RecoveryApplicationData,
  pushToOrchestrator = false,
): Promise<SubmitDagResponse> {
  const normalizedProviderId = providerId.trim()
  if (pushToOrchestrator && !normalizedProviderId) {
    throw new Error('Platform provider ID is required')
  }

  let payload: unknown
  try {
    const params = normalizedProviderId
      ? { provider_id: normalizedProviderId, push_to_orchestrator: pushToOrchestrator }
      : { push_to_orchestrator: pushToOrchestrator }
    payload = await submitRecoveryDagSubmitRecoveryDagPost(data, params)
  } catch (error) {
    if (error instanceof OrvalApiError) {
      const body = typeof error.body === 'string' ? ` — ${error.body}` : ''
      const status = [String(error.status), error.statusText].filter(Boolean).join(' ')
      throw new Error(`submit_recovery_dag failed: ${status}${body}`, { cause: error })
    }
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Network error calling /submit_recovery_dag: ${reason}`, { cause: error })
  }

  const parsed = parseGeneratedResponse(
    RecoveryAppSubmitResponse,
    payload,
    'POST /submit_recovery_dag',
  )
  return toSubmitDagResponse(parsed, pushToOrchestrator)
}

function toSubmitDagResponse(
  response: RecoveryAppSubmitResponseOutput,
  pushToOrchestrator: boolean,
): SubmitDagResponse {
  const localResponse = { applications: response.applications }
  if (!pushToOrchestrator) return localResponse

  return {
    ...localResponse,
    orchestrator_push: requireOrchestratorPush(response.orchestrator_push),
  }
}

function requireOrchestratorPush(
  push: OrchestratorPushOutput | null | undefined,
) {
  if (!push?.dag || !push.json || !push.dag_id) {
    throw new Error('Orchestrator response is missing DAG details')
  }
  return {
    status: push.status,
    dag: push.dag,
    json: push.json,
    dag_id: push.dag_id,
  }
}

export type DeleteRecoveryApplicationRequest =
  | {
      recoveryAppId: string
      rollbackFromOrchestrator: false
    }
  | {
      recoveryAppId: string
      rollbackFromOrchestrator: true
      providerId: string
      computeProviderId: string
    }

export async function deleteRecoveryApplication(
  request: DeleteRecoveryApplicationRequest,
): Promise<{ applications: RecoveryApplicationListItem[]; rollback: RollbackReport | null }> {
  const params = {
    recovery_app_id: request.recoveryAppId,
    rollback_from_orchestrator: request.rollbackFromOrchestrator,
    ...(request.rollbackFromOrchestrator && {
      provider_id: request.providerId,
      compute_provider_id: request.computeProviderId,
    }),
  }

  try {
    const payload = await deleteRecoveryAppRouteDeleteRecoveryAppDelete(params)
    const parsed = parseGeneratedResponse(
      RecoveryAppsResponse,
      payload,
      'DELETE /delete_recovery_app',
    )

    return {
      applications: mapRecoveryApplications(parsed),
      rollback: request.rollbackFromOrchestrator && parsed.rollback ? rollbackReportSchema.parse(parsed.rollback) : null,
    }
  } catch (error) {
    if (error instanceof OrvalApiError) {
      const reason = error.statusText || String(error.status)
      throw new Error(`Failed to delete recovery application: ${reason}`, { cause: error })
    }
    throw error
  }
}
