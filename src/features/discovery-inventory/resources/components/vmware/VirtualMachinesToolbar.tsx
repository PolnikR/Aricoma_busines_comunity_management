import type { ChangeEvent } from 'react'
import { useState } from 'react'
import { CheckboxField, Field, Select } from '@/shared/components/form/FormControls'
import { DataTableToolbar } from '@/shared/components/data-table'
import type { TableDensity } from '@/shared/components/data-table'
import { useTranslation } from '@/hooks/useTranslation'
import type { VirtualMachineFilterOptions, VirtualMachineFilters } from '../../types/virtualMachineTypes'

interface VirtualMachinesToolbarProps {
  filters: VirtualMachineFilters
  options: VirtualMachineFilterOptions
  availableTags?: string[]
  onFiltersChange: (filters: VirtualMachineFilters) => void
  onReset: () => void
  isFilterFixed?: boolean
  density?: TableDensity
  onDensityChange?: (density: TableDensity) => void
}

export function VirtualMachinesToolbar({ filters, options, availableTags = [], onFiltersChange, onReset, isFilterFixed = false, density, onDensityChange }: VirtualMachinesToolbarProps) {
  const { t } = useTranslation()
  const [tempFilters, setTempFilters] = useState(filters)

  const prepareFilters = () => {
    setTempFilters(filters)
  }

  const updateTempFilter = (key: keyof VirtualMachineFilters) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTempFilters({ ...tempFilters, [key]: event.target.value })
  }

  const updateTempTag = (event: ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value
    setTempFilters({ ...tempFilters, tags: value ? [value] : [], untagged: false })
  }

  const toggleTempUntagged = () => {
    setTempFilters({ ...tempFilters, untagged: !tempFilters.untagged, tags: [] })
  }

  const handleApplyFilters = () => {
    onFiltersChange(tempFilters)
  }

  const handleResetFilters = () => {
    onReset()
    setTempFilters(filters)
  }

  const activeFilterCount = [
    filters.search,
    filters.powerState,
    filters.connectionState,
    filters.cluster,
    filters.tags.length > 0 ? 'tags' : '',
    filters.untagged ? 'untagged' : '',
  ].filter(Boolean).length

  return (
    <DataTableToolbar
      searchValue={filters.search}
      onSearchChange={(search) => { onFiltersChange({ ...filters, search }) }}
      searchPlaceholder={t('pages.virtualMachines.toolbar.search')}
      searchLabel={t('pages.virtualMachines.toolbar.searchLabel')}
      searchDisabled={isFilterFixed}
      filterTitle={t('pages.virtualMachines.toolbar.filterTitle')}
      filterButtonLabel={t('pages.virtualMachines.toolbar.filters')}
      cancelLabel={t('buttons.cancel')}
      clearLabel={t('buttons.clearAll')}
      applyLabel={t('buttons.apply')}
      activeFilterCount={activeFilterCount}
      onFilterOpen={prepareFilters}
      onApplyFilters={handleApplyFilters}
      onClearFilters={handleResetFilters}
      filterControlsDisabled={isFilterFixed}
      {...(density ? { density } : {})}
      {...(onDensityChange ? { onDensityChange } : {})}
      filterPanel={(
        <>
          <Field label={t('pages.virtualMachines.filters.connection')} htmlFor="modal-connection-filter">
            <Select id="modal-connection-filter" value={tempFilters.connectionState} onChange={updateTempFilter('connectionState')} disabled>
              <option value="">{t('pages.virtualMachines.filters.connectionAll')}</option>
              {options.connectionStates.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
          </Field>

          <Field label={t('pages.virtualMachines.filters.cluster')} htmlFor="modal-cluster-filter">
            <Select id="modal-cluster-filter" value={tempFilters.cluster} onChange={updateTempFilter('cluster')} disabled>
              <option value="">{t('pages.virtualMachines.filters.clusterAll')}</option>
              {options.clusters.map((value) => <option key={value} value={value}>{value}</option>)}
            </Select>
          </Field>

          <Field label={t('pages.virtualMachines.filters.tag')} htmlFor="modal-tag-filter">
            <Select id="modal-tag-filter" value={tempFilters.tags[0] ?? ''} onChange={updateTempTag} disabled={isFilterFixed}>
              <option value="">{t('pages.virtualMachines.filters.tagAll')}</option>
              {availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}
            </Select>
          </Field>

          <CheckboxField
            label={t('pages.virtualMachines.filters.untaggedVMs')}
            checked={tempFilters.untagged}
            onChange={toggleTempUntagged}
            disabled={isFilterFixed}
          />
        </>
      )}
    />
  )
}
