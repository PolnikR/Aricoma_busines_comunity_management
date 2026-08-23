import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useTableState } from '@/shared/components/data-table'
import { useOrchestratedEntities } from '../hooks/useOrchestratedEntities'
import { useOrchestratedEntityRuns } from '../hooks/useOrchestratedEntityRuns'
import { useRecoveryRunsTabSearchParam } from '../hooks/useRecoveryRunsTabSearchParam'
import type { RecoveryRunTab } from '../hooks/useRecoveryRunsTabSearchParam'
import { RecoveryRunsTable } from '../components/RecoveryRunsTable'
import { RecoveryRunHistoryDrawer } from '../components/RecoveryRunHistoryDrawer'
import type { RecoveryRunRow } from '../components/RecoveryRunsTable'
import type { OrchestratedEntity } from '../model/recoveryRunTypes'

export function RecoveryRunsPage() {
  const { t } = useTranslation()
  const { tab, entityType, entityId, setTab, setEntity } = useRecoveryRunsTabSearchParam()
  const { entities, isLoading, isFetching, error, refetch } = useOrchestratedEntities()

  const tabFilteredEntities = useMemo(() => {
    if (tab === 'applications') return entities.filter(entity => entity.entityType === 'application')
    if (tab === 'groups') return entities.filter(entity => entity.entityType === 'group')
    return entities
  }, [entities, tab])

  const visibleEntities = useMemo(() => (
    entityId && entityType
      ? tabFilteredEntities.filter(entity => entity.id === entityId && entity.entityType === entityType)
      : tabFilteredEntities
  ), [tabFilteredEntities, entityId, entityType])

  const table = useTableState(visibleEntities, { searchFields: ['name', 'id'] })

  const {
    rows: latestRunRows,
    isFetching: latestRunsFetching,
    refetch: refetchLatestRuns,
  } = useOrchestratedEntityRuns(table.pageItems)

  const rows = useMemo<RecoveryRunRow[]>(
    () => latestRunRows.map(({ entity, latestRunState }) => ({
      id: entity.id,
      name: entity.name,
      entityType: entity.entityType,
      dagId: entity.dagId,
      latestRunState,
    })),
    [latestRunRows],
  )

  const selectedEntity: OrchestratedEntity | null = entities.find(
    entity => entity.id === entityId && entity.entityType === entityType,
  ) ?? null
  const selectedEntityKey = entityId && entityType ? `${entityType}:${entityId}` : null

  const tabItems = [
    { value: 'all' as const, label: t('recoveryRuns.tabs.all') },
    { value: 'applications' as const, label: t('recoveryRuns.tabs.applications') },
    { value: 'groups' as const, label: t('recoveryRuns.tabs.groups') },
  ]

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('nav.recovery')}
        title={t('pages.recoveryRuns.title')}
        description={t('pages.recoveryRuns.description')}
        isFetching={isFetching || latestRunsFetching}
        onRefresh={() => {
          refetch()
          void refetchLatestRuns()
        }}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden p-3">
        {!isLoading ? (
          <p className="px-1 text-xs text-text-muted">
            {t('recoveryRuns.scopeNote').replace('{count}', String(visibleEntities.length))}
          </p>
        ) : null}

        <InventoryShell
          inventoryTitle={t('recoveryRuns.tableLabel')}
          inventoryDescription={t('pages.recoveryRuns.description')}
          tabs={(
            <Tabs<RecoveryRunTab>
              items={tabItems}
              value={tab}
              onChange={setTab}
              ariaLabel={t('recoveryRuns.tabs.ariaLabel')}
            />
          )}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <RecoveryRunsTable
              rows={rows}
              search={table.search}
              onSearchChange={table.setSearch}
              page={table.page}
              pageSize={table.pageSize}
              total={table.total}
              onPageChange={table.setPage}
              onPageSizeChange={table.setPageSize}
              showEntityType={tab === 'all'}
              isLoading={isLoading}
              error={error}
              isRetrying={isFetching}
              onRetry={refetch}
              onSelectEntity={(nextEntityType, nextEntityId) => { setEntity(nextEntityType, nextEntityId) }}
              selectedEntityKey={selectedEntityKey}
            />
          </div>
        </InventoryShell>
      </div>

      <RecoveryRunHistoryDrawer
        entity={selectedEntity}
        onClose={() => { setEntity(null) }}
      />
    </div>
  )
}
