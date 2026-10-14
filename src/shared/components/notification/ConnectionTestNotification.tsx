import { useTranslation } from '@/hooks/useTranslation'

interface ConnectionTestNotificationProps {
  providerName: string
  failed: boolean
  onViewResult: () => void
  onDismiss: () => void
}

export function ConnectionTestNotification({
  providerName,
  failed,
  onViewResult,
  onDismiss,
}: ConnectionTestNotificationProps) {
  const { t } = useTranslation()
  const dismiss = () => {
    const fallback = document.querySelector<HTMLElement>('main button:not([disabled]), main a[href], main [tabindex="0"]')
    fallback?.focus()
    onDismiss()
  }

  return (
    <aside
      className={`flex w-full gap-3 rounded-xl border border-border border-l-4 bg-surface p-4 shadow-lg ${failed ? 'border-l-error-500' : 'border-l-success-500'}`}
      role="status"
      aria-live="polite"
    >
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${failed ? 'bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-300' : 'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-300'}`} aria-hidden="true">
        {failed ? '!' : '✓'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-text-secondary">
          {t('providers.connectionTest.notification.kicker')}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-text-primary">
          {t(failed ? 'providers.connectionTest.notification.failedTitle' : 'providers.connectionTest.notification.successTitle')}
        </h3>
        <p className="mt-1 break-words text-xs font-medium leading-relaxed text-text-primary">
          {providerName}
        </p>
        <button type="button" className="mt-1 min-h-8 rounded text-xs font-semibold text-blue-light-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus dark:text-accent" onClick={onViewResult}>
          {t('providers.connectionTest.notification.viewResult')} <span className="ml-2" aria-hidden="true">→</span>
        </button>
      </div>
      <button type="button" className="flex size-8 shrink-0 items-center justify-center self-start rounded text-xl text-text-secondary hover:bg-surface-hover hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" aria-label={t('providers.connectionTest.notification.dismiss')} onClick={dismiss}>
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  )
}
