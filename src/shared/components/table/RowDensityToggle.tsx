export type TableDensity = 'comfortable' | 'compact'

interface RowDensityToggleProps {
  density: TableDensity
  onDensityChange: (density: TableDensity) => void
  isFetching?: boolean
}

export function RowDensityToggle({ density, onDensityChange, isFetching }: RowDensityToggleProps) {
  return (
    <div className="flex items-center gap-3">
      {isFetching ? (
        <span className="inline-flex items-center gap-2 text-xs text-[#71819a]">
          <span className="size-2 animate-pulse rounded-full bg-[#0d91d7]" />
          Updating
        </span>
      ) : null}
      <div className="inline-flex h-10 overflow-x-auto rounded-xl bg-[#eef4f9] p-0.5" role="group" aria-label="Row density">
        {(['comfortable', 'compact'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              onDensityChange(mode)
            }}
            aria-pressed={density === mode}
            className={`shrink-0 rounded-[10px] px-3 text-xs font-medium capitalize transition sm:text-sm ${density === mode ? 'bg-white text-[#087fca] shadow-sm' : 'text-[#71819a] hover:text-[#33425d]'}`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  )
}
