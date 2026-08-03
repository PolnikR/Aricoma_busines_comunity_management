import type { ReactNode } from 'react'
import { cn } from '@/shared/utils/cn'

interface StatCardProps {
  icon: ReactNode
  value: ReactNode
  label: ReactNode
  helper?: ReactNode
  size?: 'sm' | 'md'
  className?: string
}

export function StatCard({
  icon,
  value,
  label,
  helper,
  size = 'md',
  className,
}: StatCardProps) {
  const isSmall = size === 'sm'

  return (
    <article
      className={cn(
        'flex items-center border border-border bg-surface shadow-[0_12px_28px_-24px_rgba(37,72,112,0.5)]',
        isSmall ? 'gap-2.5 rounded-xl px-3 py-2' : 'min-h-20 gap-3 rounded-[18px] p-3.5',
        className,
      )}
    >
      <div className={cn(
        'flex shrink-0 items-center justify-center bg-accent-soft text-accent',
        isSmall ? 'size-8 rounded-lg' : 'size-11 rounded-xl',
      )}>
        {icon}
      </div>
      <div className="min-w-0">
        <strong className={cn(
          'block truncate font-semibold text-text-primary',
          isSmall ? 'text-sm leading-tight' : 'text-lg',
        )}>
          {value}
        </strong>
        <p className={cn(
          'font-medium text-text-secondary',
          isSmall ? 'truncate text-xs leading-tight' : 'text-sm',
        )}>
          {label}
        </p>
        {helper ? (
          <p className={cn(
            'truncate text-text-muted',
            isSmall ? 'text-[10px] leading-tight' : 'text-[11px]',
          )}>
            {helper}
          </p>
        ) : null}
      </div>
    </article>
  )
}
