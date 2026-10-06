import { Children } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangleIcon, CheckIcon } from '@/shared/icons/Icons'
import { cn } from '@/shared/utils/cn'
import { DetailCopyButton } from './DetailCopyButton'

export type DetailStatusTone = 'success' | 'warning' | 'error' | 'info' | 'neutral'

interface DetailStatusReference {
  label: string
  // Usually a link (e.g. a run in the orchestrator); rendered mono.
  value: ReactNode
  copyValue?: string | undefined
}

interface DetailStatusBlockProps {
  // What the state is about: "Latest run", "Replication", "Credential", "Response".
  title: string
  status: ReactNode
  tone: DetailStatusTone
  timestamp?: ReactNode | undefined
  reference?: DetailStatusReference | undefined
  action?: ReactNode | undefined
  // Small facts as DetailFields, 2–3 per row.
  children?: ReactNode | undefined
}

// Same tone colours as the light Badge, so states read the same everywhere.
const TONE: Record<DetailStatusTone, string> = {
  success: 'bg-success-50 text-success-600 dark:bg-success-500/15 dark:text-success-500',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-500/15 dark:text-orange-400',
  error: 'bg-error-50 text-error-600 dark:bg-error-500/15 dark:text-error-500',
  info: 'bg-blue-light-50 text-blue-light-500 dark:bg-blue-light-500/15 dark:text-blue-light-500',
  neutral: 'bg-surface-muted text-text-secondary',
}

function ToneIcon({ tone }: { tone: DetailStatusTone }) {
  if (tone === 'success') return <CheckIcon className="size-4" />
  if (tone === 'warning' || tone === 'error') return <AlertTriangleIcon className="size-4" />
  return <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
}

// Operational state (latest run, replication, connection, monitoring, HTTP response): the
// status first, then when, a few facts, one technical reference and one action. It is the only
// bordered surface of the detail system, so it never reads like a generic property list.
export function DetailStatusBlock({ title, status, tone, timestamp, reference, action, children }: DetailStatusBlockProps) {
  // Conditional facts may all be null; no empty facts row then.
  const hasFacts = Children.toArray(children).length > 0
  return (
    <section className="rounded-xl border border-border" data-tone={tone}>
      <div className="px-5 py-4">
        <h4 className="text-xs font-normal text-text-muted">{title}</h4>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-semibold', TONE[tone])}>
            <ToneIcon tone={tone} />
            {status}
          </span>
          {timestamp ? <span className="text-sm text-text-secondary">{timestamp}</span> : null}
        </div>
      </div>
      {hasFacts ? (
        <dl className="grid grid-cols-2 gap-x-10 gap-y-4 border-t border-border/70 px-5 py-4 @min-[600px]/detail-content:grid-cols-3">
          {children}
        </dl>
      ) : null}
      {reference ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border/70 px-5 py-3">
          <span className="text-xs text-text-muted">{reference.label}</span>
          <span className="min-w-0 flex-1 font-mono text-[12.5px] text-text-secondary wrap-anywhere">{reference.value}</span>
          {reference.copyValue ? <DetailCopyButton value={reference.copyValue} label={reference.label} /> : null}
        </div>
      ) : null}
      {action ? <div className="flex justify-end border-t border-border/70 px-5 py-3">{action}</div> : null}
    </section>
  )
}
