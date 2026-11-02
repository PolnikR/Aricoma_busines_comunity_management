import { ChecklistResultDialog, type CheckItem } from '@/shared/components/modal/ChecklistResultDialog'
import { useTranslation } from '@/hooks/useTranslation'
import type { RollbackReport } from '../model/recoveryApplicationTypes'
import { isRollbackClean } from '../utils/rollbackReport'

interface RecoveryApplicationRollbackResultModalProps {
  open: boolean
  onClose: () => void
  applicationName: string
  report: RollbackReport | null
  standalone?: boolean
}

export function RecoveryApplicationRollbackResultModal({
  open,
  onClose,
  applicationName,
  report,
  standalone = false,
}: RecoveryApplicationRollbackResultModalProps) {
  const { t } = useTranslation()

  if (!report) return null

  const isClean = isRollbackClean(report)
  const sectionStatus = (section: { status?: string; errors?: unknown[] }) =>
    section.errors?.length ? 'partial' : (section.status ?? (report.status === 'ok' ? 'ok' : 'unknown'))

  const checks: CheckItem[] = []

  checks.push({
    name: t('recovery.application.rollback.resultStatusSection'),
    detail: report.status,
    status: isClean ? 'ok' : 'warning',
  })

  if (report.airflow) {
    checks.push({
      name: t('recovery.application.rollback.resultAirflowSection'),
      detail: `${report.airflow.status}${report.airflow.dag_id ? ` - ${report.airflow.dag_id}` : ''}`,
      status: report.airflow.status === 'ok' ? 'ok' : 'warning',
    })
  }

  if (report.ibm) {
    const errorCount = report.ibm.errors?.length ?? 0
    const status = sectionStatus(report.ibm)
    checks.push({
      name: t('recovery.application.rollback.resultIbmSection'),
      detail: `${status}${errorCount > 0 ? ` - ${String(errorCount)} errors` : ''}`,
      status: status === 'ok' ? 'ok' : 'warning',
    })
  }

  if (report.compute) {
    const errorCount = report.compute.errors?.length ?? 0
    const status = sectionStatus(report.compute)
    checks.push({
      name: t('recovery.application.rollback.resultComputeSection'),
      detail: `${status}${errorCount > 0 ? ` - ${String(errorCount)} errors` : ''}`,
      status: status === 'ok' ? 'ok' : 'warning',
    })
  }

  if (report.vcenter) {
    const errorCount = report.vcenter.errors?.length ?? 0
    const status = sectionStatus(report.vcenter)
    checks.push({
      name: t('recovery.application.rollback.resultVcenterSection'),
      detail: `${status}${errorCount > 0 ? ` - ${String(errorCount)} errors` : ''}`,
      status: status === 'ok' ? 'ok' : 'warning',
    })
  }

  const passedCount = checks.filter(c => c.status === 'ok').length

  return (
    <ChecklistResultDialog
      open={open}
      title={t(standalone ? 'recovery.application.lifecycle.rollbackResultTitle' : 'recovery.application.rollback.title')}
      primaryName={applicationName}
      subtitle={t(standalone ? 'recovery.application.lifecycle.rollbackResultSubtitle' : 'recovery.application.rollback.subtitle')}
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
