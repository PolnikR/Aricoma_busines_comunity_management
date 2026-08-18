import { ChecklistResultDialog, type CheckItem } from '@/shared/components/modal/ChecklistResultDialog'
import { useTranslation } from '@/hooks/useTranslation'
import type { RollbackReport } from '../api/schemas/recoveryGroupsSchema'
import { isRollbackClean } from '../utils/rollbackReport'

interface RecoveryGroupRollbackResultModalProps {
  open: boolean
  onClose: () => void
  groupName: string
  report: RollbackReport | null
}

export function RecoveryGroupRollbackResultModal({
  open,
  onClose,
  groupName,
  report,
}: RecoveryGroupRollbackResultModalProps) {
  const { t } = useTranslation()

  if (!report) return null

  const isClean = isRollbackClean(report)

  const checks: CheckItem[] = []

  if (report.status) {
    checks.push({
      name: t('recoveryGroups.rollback.status'),
      detail: report.status,
      status: isClean ? 'ok' : 'warning',
    })
  }

  if (report.airflow) {
    checks.push({
      name: t('recoveryGroups.rollback.resultAirflowSection'),
      detail: `${report.airflow.status}${report.airflow.dag_id ? ` - ${report.airflow.dag_id}` : ''}`,
      status: report.airflow.status === 'ok' ? 'ok' : 'warning',
    })
  }

  if (report.ibm) {
    const errorCount = report.ibm.errors?.length ?? 0
    checks.push({
      name: t('recoveryGroups.rollback.resultIbmSection'),
      detail: `${report.ibm.status}${errorCount > 0 ? ` - ${errorCount} errors` : ''}`,
      status: report.ibm.status === 'ok' ? 'ok' : 'warning',
    })
  }

  const passedCount = checks.filter(c => c.status === 'ok').length

  return (
    <ChecklistResultDialog
      open={open}
      title={t('recoveryGroups.rollback.resultTitle')}
      primaryName={groupName}
      subtitle={t('recoveryGroups.rollback.resultSubtitle')}
      statusBar={{
        title: t(isClean ? 'recoveryGroups.rollback.resultSuccessTitle' : 'recoveryGroups.rollback.resultWarningTitle'),
        status: isClean ? 'success' : 'warning',
        passedCount,
        totalCount: checks.length,
      }}
      checks={checks}
      responseData={report}
      responseSchemaType="RollbackReport"
      onClose={onClose}
    />
  )
}
