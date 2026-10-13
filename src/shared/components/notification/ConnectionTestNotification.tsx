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
      className={`flex w-full gap-3 rounded-lg border border-border border-l-4 bg-surface p-4 shadow-lg ${failed ? 'border-l-error-500' : 'border-l-success-500'}`}
      role="status"
      aria-live="polite"
    >
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full text-sm font-bold ${failed ? 'bg-error-50 text-error-600 dark:bg-error-500/15' : 'bg-success-50 text-success-600 dark:bg-success-500/15'}`} aria-hidden="true">
        {failed ? '!' : '✓'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
          {t('providers.connectionTest.notification.kicker')} · {providerName}
        </p>
        <h3 className="mt-1 text-sm font-semibold text-text-primary">
          {t(failed ? 'providers.connectionTest.notification.failedTitle' : 'providers.connectionTest.notification.successTitle')}
        </h3>
        <p className="mt-1 break-words text-xs leading-relaxed text-text-secondary">
          {t(failed ? 'providers.connectionTest.notification.failedDescription' : 'providers.connectionTest.notification.successDescription', { name: providerName })}
        </p>
        <button type="button" className="mt-2 text-xs font-semibold text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" onClick={onViewResult}>
          {t('providers.connectionTest.notification.viewResult')} →
        </button>
      </div>
      <button type="button" className="self-start rounded p-1 text-text-muted hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus" aria-label={t('providers.connectionTest.notification.dismiss')} onClick={dismiss}>
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  )
}
