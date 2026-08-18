import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { DetailRow } from '@/shared/components/data-table'
import { Modal } from '@/shared/components/modal/Modal'
import { CheckIcon, ExternalLinkIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { buildAirflowDagUrl } from '@/config/externalServices'
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
  const iconColor = isClean ? 'text-success-600 dark:text-success-500' : 'text-warning-600 dark:text-warning-500'
  const bgColor = isClean ? 'bg-success-50 dark:bg-success-500/15' : 'bg-warning-50 dark:bg-warning-500/15'

  return (
    <Modal
      open={open}
      onClose={onClose}
      ariaLabel={t('recovery.application.rollback.resultAriaLabel')}
      footer={
        <Button size="sm" className="w-full" onClick={onClose}>
          {t('buttons.close')}
        </Button>
      }
    >
      <div className="flex items-start gap-3.5 border-b border-border px-6 py-5">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-full ${bgColor} ${iconColor}`}>
          <CheckIcon className="size-5" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-text-primary">
            {t(isClean ? 'recovery.application.rollback.resultSuccessTitle' : 'recovery.application.rollback.resultWarningTitle')}
          </h2>
          <p className="mt-1 text-xs text-text-muted">
            {t(
              isClean ? 'recovery.application.rollback.resultSuccessDescription' : 'recovery.application.rollback.resultWarningDescription'
            ).replace('{applicationName}', applicationName)}
          </p>
        </div>
      </div>
      <dl className="space-y-3 px-6 py-4">
        {report.airflow?.dag_id ? (
          <DetailRow
            label={t('recovery.application.rollback.resultDagId')}
            value={
              <a
                href={buildAirflowDagUrl(report.airflow.dag_id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-focus/15"
              >
                {report.airflow.dag_id}
                <ExternalLinkIcon className="size-3 shrink-0" />
              </a>
            }
          />
        ) : null}

        {report.airflow ? (
          <DetailRow
            label={t('recovery.application.rollback.resultAirflowSection')}
            value={
              <Badge color={report.airflow.status === 'ok' ? 'success' : 'warning'} size="sm">
                {report.airflow.status}
              </Badge>
            }
          />
        ) : null}

        {report.ibm ? (
          <DetailRow
            label={t('recovery.application.rollback.resultIbmSection')}
            value={
              <Badge color={report.ibm.status === 'ok' ? 'success' : 'warning'} size="sm">
                {report.ibm.status}
              </Badge>
            }
          />
        ) : null}

        {report.ibm?.errors && report.ibm.errors.length > 0 ? (
          <DetailRow
            label={t('recovery.application.rollback.resultErrors')}
            value={
              <div className="text-xs space-y-1">
                {report.ibm.errors.map((error, idx) => (
                  <div key={idx} className="text-warning-600 dark:text-warning-400">
                    {String(error)}
                  </div>
                ))}
              </div>
            }
          />
        ) : null}

        <div className="border-t border-border pt-3 mt-3">
          <p className="text-xs font-medium text-text-muted mb-2">{t('recovery.application.rollback.resultRawDetails')}</p>
          <pre className="text-xs font-mono text-text-secondary whitespace-pre-wrap break-word bg-surface-subtle rounded p-2 overflow-x-auto max-h-40">
            {JSON.stringify(report, null, 2)}
          </pre>
        </div>
      </dl>
    </Modal>
  )
}
