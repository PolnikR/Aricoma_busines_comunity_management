import { Button } from '@/shared/components/button/Button'
import { AirflowDagLink } from '@/shared/components/airflow/AirflowDagLink'
import { DetailField, DetailStatusBlock } from '@/shared/components/detail-view'
import type { DetailStatusTone } from '@/shared/components/detail-view'
import { useTranslation } from '@/hooks/useTranslation'
import { formatRunDuration, formatRunTimestamp, runStatusBadgeColor } from '@/features/recovery-plans/recovery-runs/helpers/formatRecoveryRun'
import type { OrchestrationState } from '../helpers/recoveryGroupOrchestrationState'

type Translate = (key: string, params?: Record<string, string | number>) => string

interface RecoveryGroupOrchestrationStatusProps {
  state: OrchestrationState
  airflowRunId: string | null | undefined
  providerUrl: string | null | undefined
  // Present only when the group is orchestrated (same rule as before the DetailView).
  onViewRecoveryRuns?: (() => void) | undefined
}

const RUN_TONE: Record<ReturnType<typeof runStatusBadgeColor>, DetailStatusTone> = {
  success: 'success',
  info: 'info',
  error: 'error',
  light: 'neutral',
}

// Status line for each orchestration state A–E (getRecoveryGroupOrchestrationState).
function statusOf(state: OrchestrationState, t: Translate): { status: string; tone: DetailStatusTone } {
  switch (state.kind) {
    case 'notOrchestrated': return { status: t('recoveryGroups.drawer.notConfigured'), tone: 'neutral' }
    case 'incomplete': return { status: t('recoveryGroups.drawer.orchestrationIncomplete'), tone: 'warning' }
    case 'orchestratorUnavailable': return { status: t('recoveryGroups.drawer.orchestratorUnavailable'), tone: 'warning' }
    case 'providersPending':
    case 'runPending':
      return { status: t('common.loading'), tone: 'neutral' }
    case 'providersFailed':
    case 'runFailed':
      return { status: t('recoveryGroups.drawer.latestRunUnavailable'), tone: 'warning' }
    case 'noRunId': return { status: t('recoveryGroups.drawer.noRunId'), tone: 'neutral' }
    case 'noRuns': return { status: t('recoveryRuns.table.noRuns'), tone: 'neutral' }
    case 'lastRun': return { status: state.run.status, tone: RUN_TONE[runStatusBadgeColor(state.run.status)] }
  }
}

// Orchestration section content of the Recovery Group detail: the latest run as a shared
// DetailStatusBlock — status, execution time, duration, orchestrator, Airflow run ID and the
// way to Recovery Runs. It only presents the existing orchestration state.
export function RecoveryGroupOrchestrationStatus({ state, airflowRunId, providerUrl, onViewRecoveryRuns }: RecoveryGroupOrchestrationStatusProps) {
  const { t } = useTranslation()
  const { status, tone } = statusOf(state, t)
  const providerName = 'providerName' in state ? state.providerName : undefined
  const run = state.kind === 'lastRun' ? state.run : undefined

  return (
    <DetailStatusBlock
      title={t('details.latestRunStatus')}
      status={status}
      tone={tone}
      timestamp={run ? formatRunTimestamp(run.startedAt) : undefined}
      reference={airflowRunId ? {
        label: t('tables.recoveryGroups.airflowRunId'),
        value: <AirflowDagLink runId={airflowRunId} providerUrl={providerUrl} />,
        copyValue: airflowRunId,
      } : undefined}
      action={onViewRecoveryRuns ? (
        <Button size="sm" variant="soft" onClick={onViewRecoveryRuns}>{t('buttons.viewRecoveryRuns')}</Button>
      ) : undefined}
    >
      {run ? <DetailField label={t('details.duration')} value={formatRunDuration(run.durationSeconds)} /> : null}
      {providerName ? <DetailField label={t('recoveryGroups.detail.orchestrator')} value={providerName} /> : null}
    </DetailStatusBlock>
  )
}
