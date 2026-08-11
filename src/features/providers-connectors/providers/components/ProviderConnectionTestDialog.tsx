import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Modal } from '@/shared/components/modal/Modal'
import { CheckIcon, PlugIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import type { ProviderConnectionStepId, ProviderConnectionTestResult, ProviderConnectionStepStatus } from '../model/providerConnectionTestTypes'

interface ProviderConnectionTestDialogProps {
  open: boolean
  providerName: string
  providerId: string
  isPending: boolean
  result: ProviderConnectionTestResult | null
  error: Error | null
  onClose: () => void
  onRetry: () => void
}

const stepIds: ProviderConnectionStepId[] = ['configuration', 'credentials', 'connection', 'metadata']

function statusIcon(status: ProviderConnectionStepStatus) {
  if (status === 'success') return <CheckIcon className="size-4" />
  if (status === 'running') return <span className="size-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
  if (status === 'failed') return <span aria-hidden="true">!</span>
  return <span aria-hidden="true">–</span>
}

export function ProviderConnectionTestDialog({
  open,
  providerName,
  providerId,
  isPending,
  result,
  error,
  onClose,
  onRetry,
}: ProviderConnectionTestDialogProps) {
  const { t } = useTranslation()
  const isFailed = Boolean(error) || result?.status === 'failed'
  const statuses: Record<ProviderConnectionStepId, ProviderConnectionStepStatus> = {
    configuration: result?.steps.find((step) => step.id === 'configuration')?.status ?? 'success',
    credentials: result?.steps.find((step) => step.id === 'credentials')?.status ?? 'success',
    connection: result?.steps.find((step) => step.id === 'connection')?.status ?? (isPending ? 'running' : isFailed ? 'failed' : 'skipped'),
    metadata: result?.steps.find((step) => step.id === 'metadata')?.status ?? (isPending ? 'skipped' : isFailed ? 'skipped' : 'skipped'),
  }
  const statusLabel = (status: ProviderConnectionStepStatus) => t(`providers.connectionTest.status.${status}`)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('providers.connectionTest.title')}
      ariaLabel={t('providers.connectionTest.ariaLabel')}
      size="lg"
      closeOnBackdrop={!isPending}
      footer={(
        <>
          {isFailed ? (
            <Button size="sm" variant="outline" onClick={onRetry} disabled={isPending} fullWidth>
              {t('providers.connectionTest.retry')}
            </Button>
          ) : null}
          <Button size="sm" variant="primary" onClick={onClose} disabled={isPending} fullWidth>
            {t('buttons.close')}
          </Button>
        </>
      )}
    >
      <div className="space-y-5 px-6 py-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text-primary">{providerName}</p>
            <p className="mt-1 break-all font-mono text-xs text-text-muted">{providerId}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge color="warning" size="sm">{t('providers.connectionTest.mockBadge')}</Badge>
            <span className="text-[11px] text-text-muted">{t('providers.connectionTest.mockNotice')}</span>
          </div>
        </div>

        {isPending ? (
          <div className="rounded-lg border border-blue-light-200 bg-blue-light-50 px-3 py-2 text-sm text-blue-light-700 dark:border-blue-light-500/30 dark:bg-blue-light-500/10 dark:text-blue-light-300" role="status" aria-live="polite">
            <span className="inline-flex items-center gap-2"><PlugIcon className="size-4" />{t('providers.connectionTest.running')}</span>
          </div>
        ) : null}

        {isFailed ? (
          <div className="rounded-lg border border-error-200 bg-error-50 px-3 py-2 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/10 dark:text-error-300" role="alert">
            {t('providers.connectionTest.failed')}
          </div>
        ) : null}

        <ol className="space-y-2" aria-label={t('providers.connectionTest.stepsLabel')}>
          {stepIds.map((stepId) => {
            const status = statuses[stepId]
            return (
              <li key={stepId} className="flex items-center gap-3 rounded-lg border border-border bg-surface-subtle px-3 py-2.5">
                <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${status === 'success' ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400' : status === 'failed' ? 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400' : status === 'running' ? 'bg-blue-light-50 text-blue-light-600 dark:bg-blue-light-500/15 dark:text-blue-light-400' : 'bg-surface-muted text-text-muted'}`}>
                  {statusIcon(status)}
                </span>
                <span className="min-w-0 flex-1 text-sm text-text-primary">{t(`providers.connectionTest.steps.${stepId}`)}</span>
                <span className="shrink-0 text-xs text-text-muted">{statusLabel(status)}</span>
              </li>
            )
          })}
        </ol>

        {result?.status === 'success' && result.providerInfo ? (
          <div className="rounded-xl border border-success-200 bg-success-50/60 p-4 dark:border-success-500/30 dark:bg-success-500/10">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-success-700 dark:text-success-300">
              <CheckIcon className="size-4" />
              {t('providers.connectionTest.success')}
            </div>
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-text-muted">{t('providers.connectionTest.info.name')}</dt><dd className="mt-0.5 break-words font-medium text-text-primary">{result.providerInfo.name}</dd></div>
              <div><dt className="text-xs text-text-muted">{t('providers.connectionTest.info.hostname')}</dt><dd className="mt-0.5 break-all font-mono text-xs font-medium text-text-primary">{result.providerInfo.hostname}</dd></div>
              <div><dt className="text-xs text-text-muted">{t('providers.connectionTest.info.version')}</dt><dd className="mt-0.5 font-medium text-text-primary">{result.providerInfo.version}</dd></div>
              <div><dt className="text-xs text-text-muted">{t('providers.connectionTest.info.ipAddress')}</dt><dd className="mt-0.5 font-mono text-xs font-medium text-text-primary">{result.providerInfo.ipAddress}</dd></div>
            </dl>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
