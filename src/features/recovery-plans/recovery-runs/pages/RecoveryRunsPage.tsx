import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { Tabs } from '@/shared/components/tabs/Tabs'
import { useTableState } from '@/shared/components/data-table'
import { useOrchestratedEntities } from '../hooks/useOrchestratedEntities'
import { useOrchestratedEntityRuns } from '../hooks/useOrchestratedEntityRuns'
import { useRecoveryRunsTabSearchParam } from '../hooks/useRecoveryRunsTabSearchParam'
import type { RecoveryRunTab } from '../hooks/useRecoveryRunsTabSearchParam'
import { RecoveryRunsTable } from '../components/RecoveryRunsTable'
import { RecoveryRunHistoryDetailView } from '../components/RecoveryRunHistoryDetailView'
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
      providerId: entity.providerId,
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
    <div className="flex min-h-full min-w-0 flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        title={t('pages.recoveryRuns.title')}
        description={t('pages.recoveryRuns.description')}
        isFetching={isFetching || latestRunsFetching}
        onRefresh={() => {
          refetch()
          void refetchLatestRuns()
        }}
      />

      <section className="flex min-w-0 flex-1 flex-col lg:min-h-0" aria-label={t('recoveryRuns.inventoryTitle')}>
        <div className="shrink-0 border-b border-border">
          <Tabs<RecoveryRunTab>
            items={tabItems}
            value={tab}
            onChange={setTab}
            ariaLabel={t('recoveryRuns.tabs.ariaLabel')}
            indicator="inset"
            compact
            className="w-full shrink-0 border-b-0 bg-surface px-0"
          />
        </div>
        <p className="shrink-0 py-2 text-xs text-text-muted">{t('recoveryRuns.inventoryDescription')}</p>
        <RecoveryRunsTable
          rows={rows}
          hasCachedData={entities.length > 0}
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
          onRetry={row => { if (row) void refetchLatestRuns(row); else refetch() }}
          onSelectEntity={(nextEntityType, nextEntityId) => { setEntity(nextEntityType, nextEntityId) }}
          selectedEntityKey={selectedEntityKey}
        />
      </section>

      <RecoveryRunHistoryDetailView
        key={selectedEntity ? JSON.stringify([selectedEntity.entityType, selectedEntity.id, selectedEntity.providerId, selectedEntity.dagId]) : 'no-entity'}
        entity={selectedEntity}
        onClose={() => { setEntity(null) }}
      />
    </div>
  )
}
