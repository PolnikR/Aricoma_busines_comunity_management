import type { RecoveryPoint } from '../model/recoveryActionTypes'

interface RecoveryPointSummaryProps {
  point: RecoveryPoint
  configurationLabel: string
  snapshotsLabel: string
  className?: string
}

export function RecoveryPointSummary({ point, configurationLabel, snapshotsLabel, className }: RecoveryPointSummaryProps) {
  return (
    <dl className={`grid gap-2 text-xs sm:grid-cols-2 ${className ?? ''}`}>
      <div className="min-w-0"><dt className="font-medium uppercase tracking-wide text-text-subtle">{configurationLabel}</dt><dd className="mt-1 truncate font-semibold text-text-primary">{point.configurationAt.replace('T', ' ')}</dd></div>
      <div className="min-w-0"><dt className="font-medium uppercase tracking-wide text-text-subtle">{snapshotsLabel}</dt><dd className="mt-1 truncate font-semibold text-text-primary">{point.snapshotAt.replace('T', ' ')}</dd></div>
    </dl>
  )
}
