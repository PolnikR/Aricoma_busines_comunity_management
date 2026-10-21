import type { OrchestratorPushOutput } from '@/generated/query/zod'
import { useTranslation } from '@/hooks/useTranslation'
import { buildAirflowDagUrl } from '@/config/externalServices'
import { ChecklistResultDialog, type CheckItem } from './ChecklistResultDialog'

// Both submit APIs expose the same push contract, independently of DAG execution.
export type OrchestratorPushResult = OrchestratorPushOutput

interface OrchestratorPushResultDialogProps {
  open: boolean
  onClose: () => void
  entityName: string
  entityType: 'application' | 'group'
  result: OrchestratorPushResult | null | undefined
  providerUrl?: string | null | undefined
}

export function OrchestratorPushResultDialog({
  open, onClose, entityName, entityType, result, providerUrl,
}: OrchestratorPushResultDialogProps) {
  const { t } = useTranslation()
  const pushed = result?.status === 'pushed'
  const title = pushed
    ? t(entityType === 'application'
      ? 'recovery.application.orchestratorModal.title'
      : 'orchestratorPush.groupPushed')
    : t(result ? 'orchestratorPush.skipped' : 'orchestratorPush.missing')
  const checks: CheckItem[] = result ? [{
    name: t('recovery.application.orchestratorModal.status'),
    detail: [result.status, result.reason].filter(Boolean).join(' · '),
    status: pushed ? 'ok' : 'skipped',
  }] : []
  if (result?.dag?.trim()) {
    checks.push({
      name: t('recovery.application.orchestratorModal.dag'),
      detail: result.dag,
      status: pushed ? 'ok' : 'skipped',
    })
  }
  const dagId = result?.dag_id?.trim()

  return (
    <ChecklistResultDialog
      open={open}
      title={title}
      primaryName={entityName}
      subtitle={dagId ?? ''}
      statusBar={{
        title,
        status: pushed ? 'success' : 'warning',
        ...(checks.length ? {
          passedCount: checks.filter(check => check.status === 'ok').length,
          totalCount: checks.length,
        } : {}),
      }}
      checks={checks}
      responseData={result}
      responseSchemaType="OrchestratorPush"
      onClose={onClose}
      {...(dagId ? {
        externalActionLabel: t('recovery.application.orchestratorModal.viewInAirflow'),
        onExternalAction: () => {
          window.open(buildAirflowDagUrl(dagId, providerUrl), '_blank', 'noopener,noreferrer')
        },
      } : {})}
    />
  )
}
