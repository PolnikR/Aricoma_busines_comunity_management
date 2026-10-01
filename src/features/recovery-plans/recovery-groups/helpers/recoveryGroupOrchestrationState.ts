import type { OrchestratorRun } from '@/features/recovery-plans/recovery-runs/model/recoveryRunTypes'

interface OrchestrationFields {
  pushToOrchestrator?: boolean | undefined
  orchestrationProviderId?: string | null | undefined
  airflowRunId?: string | null | undefined
}

interface ProvidersState {
  providers: readonly { id: string; name: string }[]
  isLoading: boolean
  isError: boolean
}

interface LatestRunState {
  latestRun: OrchestratorRun | null
  isLoading: boolean
  error: Error | null
}

// States A–E of the Model C drawer plan (tasks/detail-drawer-model-c-plan.md §5).
// Only "notOrchestrated" (A) means orchestration is not configured; every other
// state is a configured orchestration with incomplete or pending data.
export type OrchestrationState =
  | { kind: 'notOrchestrated' }
  | { kind: 'incomplete' }
  | { kind: 'providersPending' }
  | { kind: 'providersFailed' }
  | { kind: 'orchestratorUnavailable' }
  | { kind: 'noRunId'; providerName: string }
  | { kind: 'runPending'; providerName: string }
  | { kind: 'runFailed'; providerName: string }
  | { kind: 'noRuns'; providerName: string }
  | { kind: 'lastRun'; providerName: string; run: OrchestratorRun }

// Maps existing record fields and query states to one display state. The first
// matching rule wins; nothing here adds a request or changes when one runs.
export function getRecoveryGroupOrchestrationState(
  entity: OrchestrationFields,
  providers: ProvidersState,
  latest: LatestRunState,
): OrchestrationState {
  if (!entity.pushToOrchestrator) return { kind: 'notOrchestrated' }
  if (!entity.orchestrationProviderId) return { kind: 'incomplete' }
  if (providers.isLoading) return { kind: 'providersPending' }
  if (providers.isError) return { kind: 'providersFailed' }

  const provider = providers.providers.find(candidate => candidate.id === entity.orchestrationProviderId)
  if (!provider) return { kind: 'orchestratorUnavailable' }

  const providerName = provider.name
  if (!entity.airflowRunId) return { kind: 'noRunId', providerName }
  if (latest.isLoading) return { kind: 'runPending', providerName }
  if (latest.error) return { kind: 'runFailed', providerName }
  if (!latest.latestRun) return { kind: 'noRuns', providerName }
  return { kind: 'lastRun', providerName, run: latest.latestRun }
}
