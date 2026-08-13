import {
  getRecoveryAppsGetRecoveryAppsGet,
  submitRecoveryDagSubmitRecoveryDagPost,
} from '@/generated/api/client.gen'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type {
  RecoveryApplicationData,
  RecoveryApplicationListItem,
  SubmitDagResponse,
} from '../model/recoveryApplicationTypes'
import {
  recoveryApplicationListResponseSchema,
  submitDagLocalResponseSchema,
  submitDagOrchestratedResponseSchema,
} from './schemas/recoveryApplicationsSchema'
import { mapRecoveryApplications } from '../helpers/mapRecoveryApplications'

export async function fetchRecoveryApplications(): Promise<RecoveryApplicationListItem[]> {
  try {
    const payload = await getRecoveryAppsGetRecoveryAppsGet()
    const parsed = recoveryApplicationListResponseSchema.parse(payload)
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
    payload = await submitRecoveryDagSubmitRecoveryDagPost(
      data as Parameters<typeof submitRecoveryDagSubmitRecoveryDagPost>[0],
      params,
    )
  } catch (error) {
    if (error instanceof OrvalApiError) {
      const body = typeof error.body === 'string' ? ` — ${error.body}` : ''
      const status = [String(error.status), error.statusText].filter(Boolean).join(' ')
      throw new Error(`submit_recovery_dag failed: ${status}${body}`, { cause: error })
    }
    const reason = error instanceof Error ? error.message : String(error)
    throw new Error(`Network error calling /submit_recovery_dag: ${reason}`, { cause: error })
  }

  const normalized = normalizeSubmitResponse(payload)
  return (pushToOrchestrator
    ? submitDagOrchestratedResponseSchema
    : submitDagLocalResponseSchema
  ).parse(normalized)
}

function normalizeSubmitResponse(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload
  const record = payload as Record<string, unknown>
  if ('recovery_applications' in record || !('applications' in record)) return payload
  return { ...record, recovery_applications: record['applications'] }
}
