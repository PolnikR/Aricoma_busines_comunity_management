import { cn } from '@/shared/utils/cn'

interface FetchErrorAlertProps {
  title: string
  description?: string
  onRetry: () => void
  isRetrying?: boolean
  retryLabel?: string
  variant?: 'compact' | 'full'
  className?: string
}

export function FetchErrorAlert({
  title,
  description,
  onRetry,
  isRetrying = false,
  retryLabel = 'Retry',
  variant = 'compact',
  className,
}: FetchErrorAlertProps) {
  const isFull = variant === 'full'

  return (
    <div
      className={cn(
        'rounded-xl border border-error-200 bg-error-25 text-error-800 shadow-theme-xs',
        isFull ? 'px-5 py-7 sm:px-8 sm:py-9' : 'px-4 py-3',
        className,
      )}
      role="alert"
      aria-busy={isRetrying}
    >
      <div
        className={cn(
          'flex flex-col gap-4 sm:flex-row sm:items-center',
          isFull ? 'mx-auto max-w-3xl sm:gap-5' : 'sm:justify-between',
        )}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              'flex shrink-0 items-center justify-center rounded-full bg-error-100 font-bold text-error-700',
              isFull ? 'size-11 text-lg' : 'mt-0.5 size-8 text-sm',
            )}
            aria-hidden="true"
          >
            !
          </span>

          <div className="min-w-0">
            <p className={cn('font-semibold', isFull ? 'text-base' : 'text-sm')}>{title}</p>
            {description ? (
              <p className={cn('mt-1 break-words text-error-700', isFull ? 'text-sm leading-6' : 'text-xs leading-5')}>
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          className="inline-flex h-9 w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-error-300 bg-white px-3 text-sm font-semibold text-error-700 shadow-theme-xs transition hover:border-error-400 hover:bg-error-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-error-200 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          disabled={isRetrying}
          onClick={onRetry}
        >
          {isRetrying ? (
            <span className="size-3.5 animate-spin rounded-full border-2 border-error-300 border-t-error-700" aria-hidden="true" />
          ) : null}
          {isRetrying ? 'Retrying' : retryLabel}
        </button>
      </div>
    </div>
  )
}
