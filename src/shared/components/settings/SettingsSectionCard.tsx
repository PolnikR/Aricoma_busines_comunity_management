import { useId } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface SettingsSectionCardProps {
  icon: ReactNode
  title: string
  description: string
  children: ReactNode
  action?: ReactNode
  footer?: ReactNode
  className?: string
  contentClassName?: string
  showHeader?: boolean
}

export function SettingsSectionCard({
  icon,
  title,
  description,
  children,
  action,
  footer,
  className,
  contentClassName,
  showHeader = true,
}: SettingsSectionCardProps) {
  const headingId = useId()

  return (
    <section
      aria-labelledby={showHeader ? headingId : undefined}
      className={cn(
        'overflow-hidden rounded-[20px] border border-border bg-surface shadow-[0_14px_35px_-28px_rgba(37,72,112,0.45)]',
        className,
      )}
    >
      {showHeader ? (
        <div className="flex items-start gap-3 border-b border-border px-5 py-4 sm:px-6 lg:px-3 lg:py-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <h2 id={headingId} className="text-sm font-semibold text-text-primary sm:text-base">
              {title}
            </h2>
            <p className="mt-1 text-xs leading-5 text-text-muted">{description}</p>
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      ) : null}
      <div className={contentClassName ?? 'p-5 sm:p-6 lg:p-3'}>{children}</div>
      {footer ? <div className="border-t border-border p-5 sm:px-6 lg:px-3">{footer}</div> : null}
    </section>
  )
}
