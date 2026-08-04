export type StateTone = 'on' | 'warn' | 'off'

const dotColor: Record<StateTone, string> = {
  on: 'bg-success-600',
  warn: 'bg-warning-500',
  off: 'bg-text-subtle',
}

const textColor: Record<StateTone, string> = {
  on: 'text-success-700 dark:text-success-400',
  warn: 'text-warning-700 dark:text-warning-400',
  off: 'text-text-muted',
}

interface StateCellProps {
  tone: StateTone
  label: string
  title?: string
}

// Colored status dot + label, matching the Virtual Machines table.
export function StateCell({ tone, label, title }: StateCellProps) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${textColor[tone]}`} title={title ?? label}>
      <span className={`size-2 shrink-0 rounded-full ${dotColor[tone]}`} />
      {label}
    </span>
  )
}
