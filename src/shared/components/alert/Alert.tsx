import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

export type AlertVariant = 'info' | 'success' | 'warning' | 'error'

interface AlertProps {
  title: string
  description?: ReactNode
  variant?: AlertVariant
  className?: string
}

const variantClassNames: Record<AlertVariant, string> = {
  info: 'border-blue-light-200 bg-blue-light-50 text-blue-light-800',
  success: 'border-success-200 bg-success-50 text-success-800',
  warning: 'border-warning-200 bg-warning-50 text-warning-800',
  error: 'border-error-200 bg-error-25 text-error-800',
}

const iconClassNames: Record<AlertVariant, string> = {
  info: 'bg-blue-light-100 text-blue-light-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  error: 'bg-error-100 text-error-700',
}

const symbols: Record<AlertVariant, string> = {
  info: 'i',
  success: '✓',
  warning: '!',
  error: '!',
}

export function Alert({
  title,
  description,
  variant = 'info',
  className,
}: AlertProps) {
  const role = variant === 'error' || variant === 'warning' ? 'alert' : 'status'

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-theme-xs',
        variantClassNames[variant],
        className,
      )}
      role={role}
    >
      <span
        className={cn('mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold', iconClassNames[variant])}
        aria-hidden="true"
      >
        {symbols[variant]}
      </span>
      <div className="min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        {description ? <div className="mt-1 break-words text-xs leading-5">{description}</div> : null}
      </div>
    </div>
  )
}
