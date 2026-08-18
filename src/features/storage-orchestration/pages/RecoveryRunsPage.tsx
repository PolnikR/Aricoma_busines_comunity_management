import { useMemo, useState } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { InventoryShell } from '@/shared/components/inventory-shell/InventoryShell'
import { TableToolbar } from '@/shared/components/table/TableToolbar'
import { useOrchestratedApps } from '../hooks/useOrchestratedApps'
import { useOrchestratedAppRuns } from '../hooks/useOrchestratedAppRuns'
import { RecoveryRunsTable } from '../components/RecoveryRunsTable'
import { RecoveryRunHistoryDrawer } from '../components/RecoveryRunHistoryDrawer'
import type { RecoveryRunRow } from '../components/RecoveryRunsTable'

export function RecoveryRunsPage() {
  const { t } = useTranslation()
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const { apps, providerId, isLoading, isFetching, error, refetch } = useOrchestratedApps()
  const latestRuns = useOrchestratedAppRuns(apps, providerId)

  const rows = useMemo<RecoveryRunRow[]>(
    () => latestRuns.map(({ app, latestRun }) => ({ id: app.id, name: app.name, latestRun })),
    [latestRuns],
  )
  const selectedApp = apps.find(app => app.id === selectedAppId) ?? null

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <TableToolbar
        eyebrow={t('nav.storage')}
        title={t('pages.recoveryRuns.title')}
        description={t('pages.recoveryRuns.description')}
      />

      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden p-3">
        {!isLoading ? (
          <p className="px-1 text-xs text-text-muted">
            {t('recoveryRuns.scopeNote').replace('{count}', String(apps.length))}
          </p>
        ) : null}

        <InventoryShell
          inventoryTitle={t('recoveryRuns.tableLabel')}
          inventoryDescription={t('pages.recoveryRuns.description')}
          tabs={null}
        >
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
            <RecoveryRunsTable
              rows={rows}
              isLoading={isLoading}
              error={error}
              isRetrying={isFetching}
              onRetry={refetch}
              onSelectApp={setSelectedAppId}
              selectedAppId={selectedAppId}
            />
          </div>
        </InventoryShell>
      </div>

      <RecoveryRunHistoryDrawer
        app={selectedApp}
        providerId={providerId}
        onClose={() => { setSelectedAppId(null) }}
      />
    </div>
  )
}
