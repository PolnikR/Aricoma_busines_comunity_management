import { apiFetch } from '@/shared/api/apiClient'
import { API_ENDPOINTS } from '@/config/apiEndpoints'
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
  const response = await apiFetch(API_ENDPOINTS.recoveryApplications.list)
  if (!response.ok) {
    throw new Error(`Failed to fetch recovery applications: ${response.statusText}`)
  }

  const payload: unknown = await response.json()
  const parsed = recoveryApplicationListResponseSchema.parse(payload)
  return mapRecoveryApplications(parsed)
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

  const params = new URLSearchParams()
  if (normalizedProviderId) params.set('provider_id', normalizedProviderId)
  params.set('push_to_orchestrator', String(pushToOrchestrator))
  const url = `${API_ENDPOINTS.recoveryApplications.submitDag}?${params.toString()}`
  let response: Response
  try {
    response = await apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  } catch (cause) {
    // Network-level failure (proxy unreachable, CORS, backend down, DNS).
    const reason = cause instanceof Error ? cause.message : String(cause)
    throw new Error(`Network error calling ${url}: ${reason}`, { cause })
  }
  if (!response.ok) {
    const body = await response.text().catch(() => '')
    throw new Error(`submit_recovery_dag failed: ${String(response.status)} ${response.statusText}${body ? ` — ${body}` : ''}`)
  }
  const payload: unknown = await response.json()
  return (pushToOrchestrator
    ? submitDagOrchestratedResponseSchema
    : submitDagLocalResponseSchema
  ).parse(payload)
}
