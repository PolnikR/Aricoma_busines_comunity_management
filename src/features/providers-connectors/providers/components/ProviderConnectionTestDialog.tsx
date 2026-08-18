import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Modal } from '@/shared/components/modal/Modal'
import { ResponseBodyViewer } from '@/shared/components/response-body/ResponseBodyViewer'
import { CheckIcon, ChevronDownIcon, PlugIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { providerTypeLabel } from '../helpers/providerTypeLabel'
import { toProviderConnectionTestJson } from '../helpers/providerConnectionTestJson'
import type { ProviderRole } from '../model/providerTypes'
import type { ProviderConnectionCheck, ProviderConnectionTestResult } from '../model/providerConnectionTestTypes'

interface ProviderConnectionTestDialogProps {
  open: boolean
  providerName: string
  providerId: string
  providerRole?: ProviderRole
  isPending: boolean
  result: ProviderConnectionTestResult | null
  error: Error | null
  onClose: () => void
  onRetry: () => void
}

function isCheckOk(status: string): boolean {
  return status.trim().toLowerCase() === 'ok'
}

function CheckStatusIcon({ status }: { status: string }) {
  if (isCheckOk(status)) return <CheckIcon className="size-4" />
  return <span aria-hidden="true">!</span>
}

export function ProviderConnectionTestDialog({
  open,
  providerName,
  providerId,
  providerRole = 'source',
  isPending,
  result,
  error,
  onClose,
  onRetry,
}: ProviderConnectionTestDialogProps) {
  const { t } = useTranslation()
  const isFailed = Boolean(error) || (result !== null && !result.ok)
  const okCount = result ? result.checks.filter(check => isCheckOk(check.status)).length : 0

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
          {result ? (
            <div className="flex shrink-0 items-center gap-2">
              <Badge color="info" size="sm">{providerTypeLabel(result.providerType)}</Badge>
              <Badge color={providerRole === 'source' ? 'success' : 'warning'} size="sm">
                {t(`forms.role.${providerRole}`)}
              </Badge>
            </div>
          ) : null}
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

        {result?.ok ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-success-200 bg-success-50 px-3 py-2 text-sm text-success-700 dark:border-success-500/30 dark:bg-success-500/10 dark:text-success-300">
            <span className="inline-flex items-center gap-2"><CheckIcon className="size-4" />{t('providers.connectionTest.success')}</span>
            <span className="shrink-0 rounded-full border border-success-200 px-2 py-0.5 font-mono text-xs tabular-nums dark:border-success-500/30">
              {t('providers.connectionTest.passedCount').replace('{ok}', String(okCount)).replace('{total}', String(result.checks.length))}
            </span>
          </div>
        ) : null}

        {result ? (
          result.checks.length > 0 ? (
            <ol className="space-y-2" aria-label={t('providers.connectionTest.checksLabel')}>
              {result.checks.map((check: ProviderConnectionCheck, index) => (
                <li key={`${check.name}-${String(index)}`} className="flex items-start gap-3 rounded-lg border border-border bg-surface-subtle px-3 py-2.5">
                  <span className={`flex size-7 shrink-0 items-center justify-center rounded-full ${isCheckOk(check.status) ? 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400' : 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400'}`}>
                    <CheckStatusIcon status={check.status} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-text-primary">{check.name}</span>
                      <span className="shrink-0 text-xs text-text-muted">{check.status}</span>
                    </div>
                    {check.detail ? (
                      <p className="mt-0.5 font-mono text-xs text-text-muted">{check.detail}</p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-text-muted">{t('providers.connectionTest.noChecks')}</p>
          )
        ) : null}

        {result ? (
          <details className="group rounded-lg border border-border">
            <summary className="flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2 text-sm font-medium text-text-secondary">
              {t('providers.connectionTest.responseBody')}
              <ChevronDownIcon className="size-3.5 text-text-muted transition-transform group-open:rotate-180" />
            </summary>
            <div className="border-t border-border px-3 py-3">
              <p className="mb-2 text-xs text-text-subtle">
                {t('providers.connectionTest.schemaNote')} <code className="rounded bg-surface-muted px-1 py-0.5 font-mono">ProviderTestResponse</code>
              </p>
              <ResponseBodyViewer data={toProviderConnectionTestJson(result)} />
            </div>
          </details>
        ) : null}
      </div>
    </Modal>
  )
}
