import { ChecklistResultDialog, type CheckItem } from '@/shared/components/modal/ChecklistResultDialog'
import { useTranslation } from '@/hooks/useTranslation'
import type { RollbackReport } from '../api/schemas/recoveryApplicationsSchema'
import { isRollbackClean } from '../utils/rollbackReport'

interface RecoveryApplicationRollbackResultModalProps {
  open: boolean
  onClose: () => void
  applicationName: string
  report: RollbackReport | null
}

export function RecoveryApplicationRollbackResultModal({
  open,
  onClose,
  applicationName,
  report,
}: RecoveryApplicationRollbackResultModalProps) {
  const { t } = useTranslation()

  if (!report) return null

  const isClean = isRollbackClean(report)

  const checks: CheckItem[] = []

  if (report.status) {
    checks.push({
      name: t('recovery.application.rollback.resultStatusSection'),
      detail: report.status,
      status: isClean ? 'ok' : 'warning',
    })
  }

  if (report.airflow) {
    checks.push({
      name: t('recovery.application.rollback.resultAirflowSection'),
      detail: `${report.airflow.status}${report.airflow.dag_id ? ` - ${report.airflow.dag_id}` : ''}`,
      status: report.airflow.status === 'ok' ? 'ok' : 'warning',
    })
  }

  if (report.ibm) {
    const errorCount = report.ibm.errors?.length ?? 0
    checks.push({
      name: t('recovery.application.rollback.resultIbmSection'),
      detail: `${report.ibm.status}${errorCount > 0 ? ` - ${String(errorCount)} errors` : ''}`,
      status: report.ibm.status === 'ok' ? 'ok' : 'warning',
    })
  }

  const passedCount = checks.filter(c => c.status === 'ok').length

  return (
    <ChecklistResultDialog
      open={open}
      title={t('recovery.application.rollback.title')}
      primaryName={applicationName}
      subtitle={t('recovery.application.rollback.subtitle')}
      statusBar={{
        title: t(isClean ? 'recovery.application.rollback.resultSuccessTitle' : 'recovery.application.rollback.resultWarningTitle'),
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
