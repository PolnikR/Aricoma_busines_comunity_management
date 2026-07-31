import { useState } from 'react'
import type { ChangeEvent, ReactNode } from 'react'
import { DataTableToolbar } from '@/shared/components/data-table'
import type { TableDensity } from '@/shared/components/data-table'

export interface SourceFilterControl {
  id: string
  label: string
  value: string
  allLabel: string
  options: { value: string; label: string }[]
}

interface SourceInventoryToolbarProps {
  search: string
  searchPlaceholder: string
  searchLabel: string
  controls: SourceFilterControl[]
  onSearchChange: (value: string) => void
  onFiltersChange: (filters: Record<string, string>) => void
  onReset: () => void
  filterTitle: string
  filterLabel: string
  density: TableDensity
  onDensityChange: (density: TableDensity) => void
  labels: { cancel: string; clear: string; apply: string }
}

export function SourceInventoryToolbar(props: SourceInventoryToolbarProps) {
  const [draft, setDraft] = useState<Record<string, string>>({})
  const current = Object.fromEntries(props.controls.map((control) => [control.id, control.value]))
  const activeCount = Object.values(current).filter(Boolean).length
  const update = (id: string) => (event: ChangeEvent<HTMLSelectElement>) => {
    setDraft((previous) => ({ ...previous, [id]: event.target.value }))
  }
  const panel: ReactNode = props.controls.map((control) => (
    <label key={control.id} className="block" htmlFor={`resource-filter-${control.id}`}>
      <span className="mb-1.5 block text-xs font-medium text-[#50617a]">{control.label}</span>
      <span className="relative block">
        <select
          id={`resource-filter-${control.id}`}
          value={draft[control.id] ?? control.value}
          onChange={update(control.id)}
          className="h-10 w-full rounded-xl border border-[#cfdaea] bg-[#fcfdff] px-3 text-sm text-[#273750] shadow-sm outline-none focus:border-[#63bdf2] focus:ring-4 focus:ring-[#1596dd]/10"
        >
          <option value="">{control.allLabel}</option>
          {control.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </span>
    </label>
  ))

  return (
    <DataTableToolbar
      searchValue={props.search}
      onSearchChange={props.onSearchChange}
      searchPlaceholder={props.searchPlaceholder}
      searchLabel={props.searchLabel}
      filterPanel={panel}
      filterTitle={props.filterTitle}
      filterButtonLabel={props.filterLabel}
      activeFilterCount={activeCount}
      onFilterOpen={() => { setDraft(current) }}
      onApplyFilters={() => { props.onFiltersChange({ ...current, ...draft }) }}
      onClearFilters={() => { setDraft({}); props.onReset() }}
      cancelLabel={props.labels.cancel}
      clearLabel={props.labels.clear}
      applyLabel={props.labels.apply}
      density={props.density}
      onDensityChange={props.onDensityChange}
    />
  )
}
