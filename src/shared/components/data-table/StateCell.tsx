export type StateTone = 'on' | 'warn' | 'off'

const dotColor: Record<StateTone, string> = {
  on: 'bg-[#16a34a]',
  warn: 'bg-[#d69326]',
  off: 'bg-[#94a3b8]',
}

const textColor: Record<StateTone, string> = {
  on: 'text-[#047857]',
  warn: 'text-[#a16207]',
  off: 'text-[#64748b]',
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
