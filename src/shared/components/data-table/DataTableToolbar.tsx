import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/shared/components/button/Button'
import { Input } from '@/shared/components/form/FormControls'
import { Modal } from '@/shared/components/modal/Modal'
import { CloseIcon, FilterIcon, SearchIcon } from '@/shared/icons/Icons'
import { RowDensityToggle } from '../table/RowDensityToggle'
import type { TableDensity } from './DataTable'

export interface Segment {
  label: string
  value: string
  count?: number
}

interface DataTableToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  searchLabel?: string
  searchDisabled?: boolean
  segments?: Segment[]
  segmentValue?: string
  onSegmentChange?: (value: string) => void
  filterPanel?: ReactNode
  filterTitle?: string
  activeFilterCount?: number
  onApplyFilters?: () => void
  onClearFilters?: () => void
  filterControlsDisabled?: boolean
  applyDisabled?: boolean
  onFilterOpen?: () => void
  filterButtonLabel?: string
  cancelLabel?: string
  clearLabel?: string
  applyLabel?: string
  density?: TableDensity
  onDensityChange?: (density: TableDensity) => void
  densityAriaLabel?: string
  comfortableLabel?: string
  compactLabel?: string
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = 'Search',
  searchLabel = 'Search',
  searchDisabled = false,
  segments,
  segmentValue = '',
  onSegmentChange,
  filterPanel,
  filterTitle = 'Filters',
  activeFilterCount = 0,
  onApplyFilters,
  onClearFilters,
  filterControlsDisabled = false,
  applyDisabled = false,
  onFilterOpen,
  filterButtonLabel = 'Filters',
  cancelLabel = 'Cancel',
  clearLabel = 'Clear all',
  applyLabel = 'Apply',
  density,
  onDensityChange,
  densityAriaLabel,
  comfortableLabel,
  compactLabel,
}: DataTableToolbarProps) {
  const { t } = useTranslation()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const searchFieldRef = useRef<HTMLDivElement>(null)
  const canClearSearch = searchValue !== '' && !searchDisabled

  const clearSearch = () => {
    onSearchChange('')
    searchFieldRef.current?.querySelector('input')?.focus()
  }

  const applyFilters = () => {
    onApplyFilters?.()
    setIsModalOpen(false)
  }

  const openFilters = () => {
    onFilterOpen?.()
    setIsModalOpen(true)
  }

  return (
    <div className="shrink-0 border-b border-border">
      <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div ref={searchFieldRef} className="relative lg:w-72">
          <Input
            aria-label={searchLabel}
            // The custom clear button replaces the browser's own, which only some browsers draw.
            className={`[&::-webkit-search-cancel-button]:appearance-none ${canClearSearch ? 'pr-9' : ''}`}
            value={searchValue}
            onChange={(event) => { onSearchChange(event.target.value) }}
            type="search"
            disabled={searchDisabled}
            placeholder={searchPlaceholder}
            leadingIcon={<SearchIcon className="size-4" />}
          />
          {canClearSearch ? (
            <button
              type="button"
              aria-label={t('common.clearSearch')}
              title={t('common.clearSearch')}
              onClick={clearSearch}
              className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-text-subtle transition hover:bg-surface-muted hover:text-text-primary"
            >
              <CloseIcon className="size-4" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {segments && onSegmentChange ? (
            <div className="flex h-10 overflow-x-auto rounded-xl bg-surface-muted p-0.5" aria-label="Quick filter">
              {segments.map((segment) => (
                <button
                  key={segment.value || 'all'}
                  type="button"
                  className={`shrink-0 rounded-[10px] px-3 text-xs font-medium transition sm:text-sm ${segmentValue === segment.value ? 'bg-surface text-accent shadow-sm' : 'text-text-muted hover:text-text-secondary'}`}
                  aria-pressed={segmentValue === segment.value}
                  onClick={() => { onSegmentChange(segment.value) }}
                >
                  {segment.label}
                  {segment.count === undefined ? null : (
                    <>
                      {' '}
                      <span className="ml-0.5 rounded-full bg-surface px-1.5 text-[11px] font-semibold tabular-nums">{segment.count}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          ) : null}

          {density && onDensityChange ? (
            <RowDensityToggle
              density={density}
              onDensityChange={onDensityChange}
              {...(densityAriaLabel ? { ariaLabel: densityAriaLabel } : {})}
              {...(comfortableLabel ? { comfortableLabel } : {})}
              {...(compactLabel ? { compactLabel } : {})}
            />
          ) : null}

          {filterPanel ? (
            <Button size="sm" variant="outline" startIcon={<FilterIcon className="size-4" />} onClick={openFilters} aria-expanded={isModalOpen} aria-haspopup="dialog">
              {filterButtonLabel} {activeFilterCount > 0 && <span className="ml-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">{activeFilterCount}</span>}
            </Button>
          ) : null}
        </div>
      </div>

      <Modal
        open={isModalOpen && Boolean(filterPanel)}
        onClose={() => { setIsModalOpen(false) }}
        title={filterTitle}
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => { setIsModalOpen(false) }} className="flex-1">{cancelLabel}</Button>
            <Button size="sm" variant="ghost" onClick={() => { onClearFilters?.() }} disabled={filterControlsDisabled} className="flex-1">{clearLabel}</Button>
            <Button size="sm" onClick={applyFilters} disabled={filterControlsDisabled || applyDisabled} className="flex-1">{applyLabel}</Button>
          </>
        }
      >
        <div className="space-y-4 px-6 py-4">{filterPanel}</div>
      </Modal>
    </div>
  )
}
