import { normalizeAirflowDagId } from '@/config/externalServices'
import { getRecoveryGroupOrchestrationState } from '@/features/recovery-plans/recovery-groups/helpers/recoveryGroupOrchestrationState'
import type { OrchestrationState } from '@/features/recovery-plans/recovery-groups/helpers/recoveryGroupOrchestrationState'
import { useLatestOrchestratorRun } from './useLatestOrchestratorRun'

export interface SelectedOrchestrationEntity {
  pushToOrchestrator?: boolean | undefined
  orchestrationProviderId?: string | null | undefined
  airflowRunId?: string | null | undefined
}

export interface SelectedOrchestrationProviders {
  providers: readonly {
    id: string
    name: string
    url?: string | null | undefined
  }[]
  isLoading: boolean
  isError: boolean
}

export interface SelectedOrchestrationInput {
  entityType: 'application' | 'group'
  selected: SelectedOrchestrationEntity | null
  providers: SelectedOrchestrationProviders
}

export interface SelectedOrchestrationDetails {
  state: OrchestrationState
  providerUrl: string | null | undefined
  displayRunId: string | null
  canViewRecoveryRuns: boolean
}

export function useSelectedOrchestrationDetails(
  { entityType, selected, providers }: SelectedOrchestrationInput,
): SelectedOrchestrationDetails | null {
  const pushedRunId = selected?.pushToOrchestrator ? selected.airflowRunId : null
  const canViewRecoveryRuns = Boolean(pushedRunId && selected?.orchestrationProviderId)
  // Applications retain their normalized DAG argument even when the provider ID
  // is missing; Groups pass null in that disabled-query case.
  const queryRunId = entityType === 'application' || canViewRecoveryRuns ? pushedRunId : null
  const latest = useLatestOrchestratorRun(
    canViewRecoveryRuns ? (selected?.orchestrationProviderId ?? null) : null,
    queryRunId ? normalizeAirflowDagId(queryRunId) : null,
  )

  if (!selected) return null

  return {
    state: getRecoveryGroupOrchestrationState(selected, providers, latest),
    providerUrl: providers.providers.find(provider => provider.id === selected.orchestrationProviderId)?.url,
    displayRunId: entityType === 'group' || canViewRecoveryRuns ? (selected.airflowRunId ?? null) : null,
    canViewRecoveryRuns,
  }
}
