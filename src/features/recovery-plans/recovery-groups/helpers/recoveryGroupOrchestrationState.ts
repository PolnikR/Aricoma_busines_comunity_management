import { formatRunDuration } from '@/features/recovery-plans/recovery-runs/helpers/formatRecoveryRun'
import type { OrchestratorRun } from '@/features/recovery-plans/recovery-runs/model/recoveryRunTypes'

type Translate = (key: string, params?: Record<string, string | number>) => string

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

// States A–E of the Model C plan (tasks/detail-drawer-model-c-plan.md §5).
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

// Short fact for the detail meta row; null leaves the fact out (pending or failed data).
export function orchestrationMetaText(state: OrchestrationState, t: Translate): string | null {
  switch (state.kind) {
    case 'notOrchestrated': return t('recoveryGroups.drawer.notOrchestrated')
    case 'incomplete': return t('recoveryGroups.drawer.orchestrationIncomplete')
    case 'orchestratorUnavailable': return t('recoveryGroups.drawer.orchestratorUnavailable')
    case 'noRunId': return t('recoveryGroups.drawer.noRunId')
    case 'noRuns': return t('recoveryRuns.table.noRuns')
    case 'lastRun': return t('recoveryGroups.drawer.lastRun', {
      status: state.run.status,
      duration: formatRunDuration(state.run.durationSeconds),
    })
    case 'providersPending':
    case 'providersFailed':
    case 'runPending':
    case 'runFailed':
      return null
  }
}

// Summary for the Orchestration section header; undefined shows none.
export function orchestrationSummaryText(state: OrchestrationState, t: Translate): string | undefined {
  switch (state.kind) {
    case 'notOrchestrated': return t('recoveryGroups.drawer.notConfigured')
    case 'incomplete': return t('recoveryGroups.drawer.orchestrationIncomplete')
    case 'orchestratorUnavailable': return t('recoveryGroups.drawer.orchestratorUnavailable')
    case 'providersPending':
    case 'providersFailed':
      return undefined
    case 'noRunId':
    case 'runPending':
    case 'runFailed':
    case 'noRuns':
    case 'lastRun':
      return state.providerName
  }
}
