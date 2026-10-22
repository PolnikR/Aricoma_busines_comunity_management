import type { RecoveryAppSubmitResponseOutput } from '@/generated/query/zod'
import type { SubmitDagResponse } from './recoveryApplicationTypes'

export function toSubmitDagResponse(
  response: RecoveryAppSubmitResponseOutput,
  pushToOrchestrator: boolean,
): SubmitDagResponse {
  const localResponse = { applications: response.applications }
  if (!pushToOrchestrator) return localResponse
  return { ...localResponse, orchestrator_push: response.orchestrator_push ?? null }
}
