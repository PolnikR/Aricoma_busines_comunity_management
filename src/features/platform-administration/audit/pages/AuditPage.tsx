import { useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import type { TableDensity } from '@/shared/components/data-table'
import { AccessLogsQueryToolbar } from '../components/AccessLogsQueryToolbar'
import { AccessLogsTable } from '../components/AccessLogsTable'
import { useAccessLogs } from '../hooks/useAccessLogs'
import { useAuditSearchParams } from '../hooks/useAuditSearchParams'

export function AuditPage() {
  const { t } = useTranslation()
  const { filters, setFilters } = useAuditSearchParams()
  const { isFetching, refetch } = useAccessLogs(filters)
  const [density, setDensity] = useState<TableDensity>('comfortable')
  const [tableResetKey, setTableResetKey] = useState(0)

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
      <TableToolbar
        eyebrow={t('audit.accessLogs.page.eyebrow')}
        title={t('audit.accessLogs.page.title')}
        description={t('audit.accessLogs.page.description')}
        isFetching={isFetching}
        onRefresh={() => { void refetch() }}
        refreshLabel={t('common.refresh')}
        updatingLabel={t('status.updating')}
      />
      <InventoryShell>
        <AccessLogsQueryToolbar
          filters={filters}
          onFiltersChange={setFilters}
          density={density}
          onDensityChange={setDensity}
          onFiltersClear={() => { setTableResetKey((current) => current + 1) }}
        />
        <AccessLogsTable key={tableResetKey} filters={filters} density={density} />
      </InventoryShell>
    </div>
  )
}
