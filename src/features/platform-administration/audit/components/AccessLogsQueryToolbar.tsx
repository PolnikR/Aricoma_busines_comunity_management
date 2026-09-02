import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { DataTableToolbar } from '@/shared/components/data-table'
import type { TableDensity } from '@/shared/components/data-table'
import { Field, Input } from '@/shared/components/form/FormControls'
import {
  DEFAULT_ACCESS_LOG_LINES,
  MAX_ACCESS_LOG_LINES,
  MIN_ACCESS_LOG_LINES,
  normalizeAccessLogFilters,
} from '../api/accessLogQueryKeys'
import type { AccessLogFilters } from '../model/accessLogTypes'

interface AccessLogsQueryToolbarProps {
  filters: AccessLogFilters
  onFiltersChange: (filters: AccessLogFilters) => void
  density: TableDensity
  onDensityChange: (density: TableDensity) => void
  onFiltersClear?: () => void
}

interface AccessLogFilterDraft {
  lines: string
  status: string
  method: string
}

function createDraft(filters: AccessLogFilters): AccessLogFilterDraft {
  const normalized = normalizeAccessLogFilters(filters)
  return {
    lines: String(normalized.lines),
    status: normalized.status === undefined ? '' : String(normalized.status),
    method: normalized.method ?? '',
  }
}

function isInteger(value: string) {
  return Number.isInteger(Number(value))
}

export function AccessLogsQueryToolbar({
  filters,
  onFiltersChange,
  density,
  onDensityChange,
  onFiltersClear,
}: AccessLogsQueryToolbarProps) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(() => createDraft(filters))
  const lines = Number(draft.lines)
  const hasValidLines = isInteger(draft.lines) && lines >= MIN_ACCESS_LOG_LINES && lines <= MAX_ACCESS_LOG_LINES
  const hasValidStatus = !draft.status.trim() || isInteger(draft.status)
  const isValid = hasValidLines && hasValidStatus
  const normalizedFilters = normalizeAccessLogFilters(filters)
  const activeFilterCount = [
    normalizedFilters.status,
    normalizedFilters.method,
    normalizedFilters.pathContains,
  ].filter((value) => value !== undefined).length

  const apply = () => {
    const nextFilters = normalizeAccessLogFilters({
      lines,
      ...(draft.status.trim() ? { status: Number(draft.status) } : {}),
      method: draft.method,
      ...(normalizedFilters.pathContains !== undefined ? { pathContains: normalizedFilters.pathContains } : {}),
    })
    onFiltersChange(nextFilters)
    setDraft(createDraft(nextFilters))
  }

  const clearAll = () => {
    const defaults = { lines: DEFAULT_ACCESS_LOG_LINES }
    onFiltersChange(defaults)
    onFiltersClear?.()
    setDraft(createDraft(defaults))
  }

  return (
    <DataTableToolbar
      searchValue={normalizedFilters.pathContains ?? ''}
      onSearchChange={(pathContains) => { onFiltersChange({ ...normalizedFilters, pathContains }) }}
      searchPlaceholder={t('audit.accessLogs.query.pathContains')}
      searchLabel={t('audit.accessLogs.toolbar.searchLabel')}
      filterTitle={t('audit.accessLogs.toolbar.filterTitle')}
      filterButtonLabel={t('audit.accessLogs.toolbar.filters')}
      cancelLabel={t('buttons.cancel')}
      clearLabel={t('buttons.clearAll')}
      applyLabel={t('buttons.apply')}
      activeFilterCount={activeFilterCount}
      applyDisabled={!isValid}
      density={density}
      onDensityChange={onDensityChange}
      densityAriaLabel={t('density.rowDensity')}
      comfortableLabel={t('density.comfortable')}
      compactLabel={t('density.compact')}
      onFilterOpen={() => { setDraft(createDraft(filters)) }}
      onApplyFilters={apply}
      onClearFilters={clearAll}
      filterPanel={(
        <>
          <Field label={t('audit.accessLogs.query.lines')} htmlFor="access-log-lines">
            <Input
              id="access-log-lines"
              type="number"
              min={MIN_ACCESS_LOG_LINES}
              max={MAX_ACCESS_LOG_LINES}
              step="1"
              value={draft.lines}
              invalid={!hasValidLines}
              onChange={(event) => { setDraft((current) => ({ ...current, lines: event.target.value })) }}
            />
            {!hasValidLines ? <span className="mt-1 block text-xs text-error-600">{t('audit.accessLogs.query.validation.lines')}</span> : null}
          </Field>
          <Field label={t('audit.accessLogs.query.status')} htmlFor="access-log-status">
            <Input
              id="access-log-status"
              type="number"
              step="1"
              value={draft.status}
              invalid={!hasValidStatus}
              onChange={(event) => { setDraft((current) => ({ ...current, status: event.target.value })) }}
            />
            {!hasValidStatus ? <span className="mt-1 block text-xs text-error-600">{t('audit.accessLogs.query.validation.status')}</span> : null}
          </Field>
          <Field label={t('audit.accessLogs.query.method')} htmlFor="access-log-method">
            <Input
              id="access-log-method"
              value={draft.method}
              onChange={(event) => { setDraft((current) => ({ ...current, method: event.target.value })) }}
            />
          </Field>
        </>
      )}
    />
  )
}
