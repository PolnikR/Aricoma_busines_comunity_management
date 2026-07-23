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
      <div className="inline-flex rounded-lg border border-[#d7deea] bg-[#f1f5fa] p-0.5" role="group" aria-label="Row density">
        {(['comfortable', 'compact'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => {
              onDensityChange(mode)
            }}
            aria-pressed={density === mode}
            className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition ${density === mode ? 'bg-white text-[#118ccc] shadow-sm' : 'text-[#71819a] hover:text-[#17233d]'}`}
          >
            {mode}
          </button>
        ))}
      </div>
    </div>
  )
}
