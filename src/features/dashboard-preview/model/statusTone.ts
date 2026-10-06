import type { StateTone } from '@/shared/components/data-table'

// Same palette as StateCell: success / warning / error / neutral, nothing else.
export const toneFillClass: Record<StateTone, string> = {
  on: 'bg-success-500',
  warn: 'bg-warning-500',
  error: 'bg-error-500',
  off: 'bg-border-strong',
}

export const toneTextClass: Record<StateTone, string> = {
  on: 'text-success-700 dark:text-success-400',
  warn: 'text-warning-700 dark:text-warning-400',
  error: 'text-error-700 dark:text-error-400',
  off: 'text-text-muted',
}

export const toneSoftClass: Record<StateTone, string> = {
  on: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-400',
  warn: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-warning-400',
  error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-400',
  off: 'bg-surface-muted text-text-muted',
}
