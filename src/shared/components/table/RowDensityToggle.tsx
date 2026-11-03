import { DensityComfortableIcon, DensityCompactIcon } from '@/shared/icons/Icons'

export type TableDensity = 'comfortable' | 'compact'

interface RowDensityToggleProps {
  density: TableDensity
  onDensityChange: (density: TableDensity) => void
  isFetching?: boolean
  ariaLabel?: string
  comfortableLabel?: string
  compactLabel?: string
}

const densityIcons = { comfortable: DensityComfortableIcon, compact: DensityCompactIcon }

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
      <div className="inline-flex h-10 rounded-xl bg-surface-muted p-0.5" role="group" aria-label={ariaLabel}>
        {(['comfortable', 'compact'] as const).map((mode) => {
          const Icon = densityIcons[mode]
          const label = labels[mode]
          return (
            // Icon only; the label stays the accessible name and shows as a tooltip.
            <button
              key={mode}
              type="button"
              onClick={() => {
                onDensityChange(mode)
              }}
              aria-pressed={density === mode}
              aria-label={label}
              title={label.charAt(0).toUpperCase() + label.slice(1)}
              className={`flex w-9 shrink-0 items-center justify-center rounded-[10px] transition ${density === mode ? 'bg-surface text-accent shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
            >
              <Icon className="size-4" />
            </button>
          )
        })}
      </div>
    </div>
  )
}
