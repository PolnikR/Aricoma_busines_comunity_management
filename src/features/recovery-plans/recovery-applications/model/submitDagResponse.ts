import type { OrchestratorPushOutput, RecoveryAppSubmitResponseOutput } from '@/generated/query/zod'
import type { OrchestratorPush, SubmitDagResponse } from './recoveryApplicationTypes'

// A push to the orchestrator is only successful when the response carries the
// generated DAG; the page shows these details after saving.
function requireOrchestratorPush(push: OrchestratorPushOutput | null | undefined): OrchestratorPush {
  if (!push?.dag || !push.json || !push.dag_id) {
    throw new Error('Orchestrator response is missing DAG details')
  }
  return { status: push.status, dag: push.dag, json: push.json, dag_id: push.dag_id }
}

export function toSubmitDagResponse(
  response: RecoveryAppSubmitResponseOutput,
  pushToOrchestrator: boolean,
): SubmitDagResponse {
  const localResponse = { applications: response.applications }
  if (!pushToOrchestrator) return localResponse
  return { ...localResponse, orchestrator_push: requireOrchestratorPush(response.orchestrator_push) }
}
