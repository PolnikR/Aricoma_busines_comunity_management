import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/shared/components/button/Button'
import type { TableDensity } from '@/shared/components/data-table'
import { Field, Input } from '@/shared/components/form/FormControls'
import { RowDensityToggle } from '@/shared/components/table/RowDensityToggle'
import { FilterIcon } from '@/shared/icons/Icons'
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
}

interface AccessLogFilterDraft {
  lines: string
  status: string
  method: string
  pathContains: string
}

function createDraft(filters: AccessLogFilters): AccessLogFilterDraft {
  const normalized = normalizeAccessLogFilters(filters)
  return {
    lines: String(normalized.lines),
    status: normalized.status === undefined ? '' : String(normalized.status),
    method: normalized.method ?? '',
    pathContains: normalized.pathContains ?? '',
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
}: AccessLogsQueryToolbarProps) {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)
  const [draft, setDraft] = useState(() => createDraft(filters))
  const lines = Number(draft.lines)
  const hasValidLines = isInteger(draft.lines) && lines >= MIN_ACCESS_LOG_LINES && lines <= MAX_ACCESS_LOG_LINES
  const hasValidStatus = !draft.status.trim() || isInteger(draft.status)
  const isValid = hasValidLines && hasValidStatus

  const cancel = () => {
    setDraft(createDraft(filters))
    setIsExpanded(false)
  }

  const toggleExpanded = () => {
    if (isExpanded) cancel()
    else {
      setDraft(createDraft(filters))
      setIsExpanded(true)
    }
  }

  const apply = () => {
    if (!isValid) return

    const nextFilters = normalizeAccessLogFilters({
      lines,
      ...(draft.status.trim() ? { status: Number(draft.status) } : {}),
      method: draft.method,
      pathContains: draft.pathContains,
    })
    onFiltersChange(nextFilters)
    setDraft(createDraft(nextFilters))
    setIsExpanded(false)
  }

  const clearAll = () => {
    const defaults = { lines: DEFAULT_ACCESS_LOG_LINES }
    onFiltersChange(defaults)
    setDraft(createDraft(defaults))
  }

  return (
    <div className="shrink-0 border-b border-border bg-surface">
      <div className="flex items-center justify-between gap-3 p-4">
        <Button
          size="sm"
          variant="outline"
          startIcon={<FilterIcon className="size-4" />}
          aria-label={t('audit.accessLogs.query.configure')}
          aria-controls="access-log-query-controls"
          aria-expanded={isExpanded}
          onClick={toggleExpanded}
        >
          {t('audit.accessLogs.query.configure')}
        </Button>
        <RowDensityToggle density={density} onDensityChange={onDensityChange} />
      </div>

      {isExpanded ? (
        <div id="access-log-query-controls" aria-label={t('audit.accessLogs.query.controls')} className="grid gap-3 border-t border-border bg-surface-subtle p-4 md:grid-cols-2 xl:grid-cols-[140px_140px_160px_minmax(240px,1fr)_auto] xl:items-end">
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
          <Field label={t('audit.accessLogs.query.pathContains')} htmlFor="access-log-path-contains">
            <Input
              id="access-log-path-contains"
              value={draft.pathContains}
              onChange={(event) => { setDraft((current) => ({ ...current, pathContains: event.target.value })) }}
            />
          </Field>
          <div className="flex gap-2 xl:justify-end">
            <Button size="sm" variant="ghost" onClick={clearAll}>{t('audit.accessLogs.query.clearAll')}</Button>
            <Button size="sm" onClick={apply} disabled={!isValid}>{t('audit.accessLogs.query.apply')}</Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
