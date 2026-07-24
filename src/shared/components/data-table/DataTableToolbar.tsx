import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/shared/components/button/Button'
import { Input } from '@/shared/components/form/FormControls'
import { FilterIcon, SearchIcon } from '@/shared/icons/Icons'
import { RowDensityToggle } from '../table/RowDensityToggle'
import type { TableDensity } from './DataTable'

export interface Segment {
  label: string
  value: string
}

interface DataTableToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  searchLabel?: string
  segments?: Segment[]
  segmentValue?: string
  onSegmentChange?: (value: string) => void
  filterPanel?: ReactNode
  filterTitle?: string
  activeFilterCount?: number
  onApplyFilters?: () => void
  onClearFilters?: () => void
  density?: TableDensity
  onDensityChange?: (density: TableDensity) => void
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search',
  searchLabel = 'Search',
  segments,
  segmentValue = '',
  onSegmentChange,
  filterPanel,
  filterTitle = 'Filters',
  activeFilterCount = 0,
  onApplyFilters,
  onClearFilters,
  density,
  onDensityChange,
}: DataTableToolbarProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const applyFilters = () => {
    onApplyFilters?.()
    setIsModalOpen(false)
  }

  return (
    <div className="shrink-0 border-b border-[#e3edf6]">
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <Input
          aria-label={searchLabel}
          className="lg:w-72"
          value={searchValue}
          onChange={(event) => { onSearchChange(event.target.value) }}
          type="search"
          placeholder={searchPlaceholder}
          leadingIcon={<SearchIcon className="size-4" />}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {segments && onSegmentChange ? (
            <div className="flex h-10 overflow-x-auto rounded-xl bg-[#eef4f9] p-0.5" aria-label="Quick filter">
              {segments.map((segment) => (
                <button
                  key={segment.value || 'all'}
                  type="button"
                  className={`shrink-0 rounded-[10px] px-3 text-xs font-medium transition sm:text-sm ${segmentValue === segment.value ? 'bg-white text-[#087fca] shadow-sm' : 'text-[#71819a] hover:text-[#33425d]'}`}
                  aria-pressed={segmentValue === segment.value}
                  onClick={() => { onSegmentChange(segment.value) }}
                >
                  {segment.label}
                </button>
              ))}
            </div>
          ) : null}

          {density && onDensityChange ? (
            <RowDensityToggle density={density} onDensityChange={onDensityChange} />
          ) : null}

          {filterPanel ? (
            <Button size="sm" variant="outline" startIcon={<FilterIcon className="size-4" />} onClick={() => { setIsModalOpen(true) }} aria-expanded={isModalOpen}>
              Filters {activeFilterCount > 0 && <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#0d91d7] text-xs font-semibold text-white">{activeFilterCount}</span>}
            </Button>
          ) : null}
        </div>
      </div>

      {isModalOpen && filterPanel ? (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => { setIsModalOpen(false) }} />
          <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-lg" onClick={(event) => { event.stopPropagation() }}>
            <div className="border-b border-[#e3edf6] px-6 py-4">
              <h2 className="text-base font-semibold text-[#17233d]">{filterTitle}</h2>
            </div>
            <div className="space-y-4 px-6 py-4">{filterPanel}</div>
            <div className="flex gap-3 border-t border-[#e3edf6] px-6 py-4">
              <Button size="sm" variant="ghost" onClick={() => { setIsModalOpen(false) }} className="flex-1">Cancel</Button>
              <Button size="sm" variant="ghost" onClick={() => { onClearFilters?.() }} className="flex-1">Clear all</Button>
              <Button size="sm" onClick={applyFilters} className="flex-1 bg-[#0d91d7] text-white">Apply</Button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
