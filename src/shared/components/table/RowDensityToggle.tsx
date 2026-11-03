export type TableDensity = 'comfortable' | 'compact'

interface RowDensityToggleProps {
  density: TableDensity
  onDensityChange: (density: TableDensity) => void
  isFetching?: boolean
  ariaLabel?: string
  comfortableLabel?: string
  compactLabel?: string
}

export function RowDensityToggle({
  density,
  onDensityChange,
  isFetching,
  ariaLabel = 'Row density',
  comfortableLabel = 'comfortable',
  compactLabel = 'compact',
}: RowDensityToggleProps) {
  const labels = { comfortable: comfortableLabel, compact: compactLabel }

  return (
    <div className="flex items-center gap-3">
      {isFetching ? (
        <span className="inline-flex items-center gap-2 text-xs text-text-muted">
          <span className="size-2 animate-pulse rounded-full bg-accent" />
          Updating
        </span>
      ) : null}
      <div className="inline-flex h-10 overflow-x-auto rounded-xl bg-surface-muted p-0.5" role="group" aria-label={ariaLabel}>
        {(['comfortable', 'compact'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              onDensityChange(mode)
            }}
            aria-pressed={density === mode}
            className={`shrink-0 rounded-[10px] px-3 text-xs font-medium capitalize transition sm:text-sm ${density === mode ? 'bg-surface text-accent shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
          >
            {labels[mode]}
          </button>
        ))}
      </div>
    </div>
  )
}
