import { useState } from 'react'
import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Button } from '@/shared/components/button/Button'
import { DataTable, DataTablePagination, DataTableRequestState } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { Field, Select } from '@/shared/components/form/FormControls'
import { RefreshIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { providerTypeLabel } from '../../providers/helpers/providerTypeLabel'
import { useProviders } from '../../providers/hooks/useProviders'
import { getDiscoveryCacheHistoryColumns } from '../config/discoveryCacheHistoryColumns'
import { useDiscoveryCacheHistory } from '../hooks/useDiscoveryCacheHistory'

const HISTORY_SERVER_LIMIT = 100
const HISTORY_PAGE_SIZE_OPTIONS = [10, 25, 50]

interface DiscoveryHistoryCardProps {
  providerId: string | undefined
  onProviderIdChange: (providerId: string) => void
}

export function DiscoveryHistoryCard({
  providerId,
  onProviderIdChange,
}: DiscoveryHistoryCardProps) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const providersQuery = useProviders('all')
  const historyQuery = useDiscoveryCacheHistory({
    ...(providerId ? { providerId } : {}),
    limit: HISTORY_SERVER_LIMIT,
  })
  const providers = providersQuery.data ?? []
  const rows = historyQuery.data?.runs ?? []
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageStart = (safePage - 1) * pageSize
  const visibleRows = rows.slice(pageStart, pageStart + pageSize)
  const hasUnknownSelectedProvider = Boolean(providerId)
    && !providers.some(provider => provider.id === providerId)
  const columns = getDiscoveryCacheHistoryColumns(t)
  const showPagination = historyQuery.data !== undefined || historyQuery.isLoading

  return (
    <section className="grid h-full min-w-0 min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <div className="shrink-0 border-b border-border">
        <div className="flex flex-col gap-3 p-4 lg:flex-row lg:items-end lg:justify-between">
          <Field
            label={t('pages.discoverySettings.history.filters.provider')}
            htmlFor="discovery-history-provider"
            className="min-w-0 flex-1 lg:max-w-2xl"
          >
            <Select
              id="discovery-history-provider"
              value={providerId ?? ''}
              disabled={providersQuery.isLoading}
              onChange={event => {
                setPage(1)
                onProviderIdChange(event.target.value)
              }}
            >
              <option value="">{t('pages.discoverySettings.history.filters.allProviders')}</option>
              {hasUnknownSelectedProvider ? <option value={providerId}>{providerId}</option> : null}
              {providers.map(provider => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} — {providerTypeLabel(provider.type)}
                </option>
              ))}
            </Select>
          </Field>

          <Button
            size="sm"
            variant="outline"
            startIcon={<RefreshIcon className={historyQuery.isFetching ? 'animate-spin' : undefined} />}
            disabled={historyQuery.isFetching}
            onClick={() => { void historyQuery.refetch() }}
          >
            {t(historyQuery.isFetching
              ? 'pages.discoverySettings.history.actions.refreshing'
              : 'pages.discoverySettings.history.actions.refresh')}
          </Button>
        </div>

        {providersQuery.error ? (
          <div className="px-4 pb-4">
            <FetchErrorAlert
              title={t('pages.discoverySettings.history.providers.loadFailed')}
              description={resolveUserFacingErrorMessage(
                providersQuery.error,
                t('pages.discoverySettings.history.providers.loadFailedDescription'),
              )}
              retryLabel={t('pages.discoverySettings.history.providers.retry')}
              isRetrying={providersQuery.isFetching}
              onRetry={() => { void providersQuery.refetch() }}
              variant="compact"
            />
          </div>
        ) : null}
      </div>

      <div className="custom-scrollbar min-h-0 overflow-y-auto">
        <DataTableRequestState
          hasCachedData={historyQuery.data !== undefined}
          error={historyQuery.error ? {
            title: t('pages.discoverySettings.history.loadFailed'),
            description: resolveUserFacingErrorMessage(
              historyQuery.error,
              t('pages.discoverySettings.history.loadFailedDescription'),
            ),
            retryLabel: t('pages.discoverySettings.history.actions.retry'),
            isRetrying: historyQuery.isFetching,
            onRetry: () => { void historyQuery.refetch() },
          } : null}
        >
          <DataTable
            columns={columns}
            rows={visibleRows}
            rowKey={(run, index) => `${run.providerId}-${run.startedAt}-${String(index)}`}
            isLoading={historyQuery.isLoading}
            loadingRowCount={5}
            minWidthClassName="min-w-220"
            ariaLabel={t(historyQuery.isLoading
              ? 'pages.discoverySettings.history.table.loading'
              : 'pages.discoverySettings.history.table.ariaLabel')}
            emptyContent={(
              <EmptyState
                title={t('pages.discoverySettings.history.table.empty.title')}
                description={t('pages.discoverySettings.history.table.empty.description')}
              />
            )}
          />
        </DataTableRequestState>
      </div>

      {showPagination ? (
        <DataTablePagination
          page={safePage}
          pageSize={pageSize}
          total={rows.length}
          pageSizeOptions={HISTORY_PAGE_SIZE_OPTIONS}
          isLoading={historyQuery.isLoading}
          paginationAriaLabel={t('pages.discoverySettings.history.pagination.ariaLabel')}
          onPageChange={setPage}
          onPageSizeChange={nextPageSize => {
            setPageSize(nextPageSize)
            setPage(1)
          }}
        />
      ) : null}
    </section>
  )
}
