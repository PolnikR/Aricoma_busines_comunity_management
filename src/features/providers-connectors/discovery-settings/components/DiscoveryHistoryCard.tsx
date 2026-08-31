import { resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Button } from '@/shared/components/button/Button'
import { DataTable, DataTableRequestState } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { Field, Select } from '@/shared/components/form/FormControls'
import { SettingsSectionCard } from '@/shared/components/settings/SettingsSectionCard'
import { LayersIcon, RefreshIcon } from '@/shared/icons/Icons'
import { useTranslation } from '@/hooks/useTranslation'
import { providerTypeLabel } from '../../providers/helpers/providerTypeLabel'
import { useProviders } from '../../providers/hooks/useProviders'
import { getDiscoveryCacheHistoryColumns } from '../config/discoveryCacheHistoryColumns'
import { useDiscoveryCacheHistory } from '../hooks/useDiscoveryCacheHistory'
import { DISCOVERY_SETTINGS_HISTORY_LIMITS } from '../hooks/useDiscoverySettingsSearchParams'
import type { DiscoverySettingsHistoryLimit } from '../hooks/useDiscoverySettingsSearchParams'

interface DiscoveryHistoryCardProps {
  providerId: string | undefined
  limit: DiscoverySettingsHistoryLimit
  onProviderIdChange: (providerId: string) => void
  onLimitChange: (limit: DiscoverySettingsHistoryLimit) => void
}

export function DiscoveryHistoryCard({
  providerId,
  limit,
  onProviderIdChange,
  onLimitChange,
}: DiscoveryHistoryCardProps) {
  const { t } = useTranslation()
  const providersQuery = useProviders('all')
  const historyQuery = useDiscoveryCacheHistory({
    ...(providerId ? { providerId } : {}),
    limit,
  })
  const providers = providersQuery.data ?? []
  const rows = historyQuery.data?.runs ?? []
  const hasUnknownSelectedProvider = Boolean(providerId)
    && !providers.some(provider => provider.id === providerId)
  const columns = getDiscoveryCacheHistoryColumns(t)

  return (
    <SettingsSectionCard
      icon={<LayersIcon className="size-5" />}
      title={t('pages.discoverySettings.history.title')}
      description={t('pages.discoverySettings.history.description')}
    >
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field
            label={t('pages.discoverySettings.history.filters.provider')}
            htmlFor="discovery-history-provider"
            className="min-w-0 flex-1"
          >
            <Select
              id="discovery-history-provider"
              value={providerId ?? ''}
              disabled={providersQuery.isLoading}
              onChange={event => { onProviderIdChange(event.target.value) }}
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

          <Field
            label={t('pages.discoverySettings.history.filters.limit')}
            htmlFor="discovery-history-limit"
            className="w-full sm:w-36"
          >
            <Select
              id="discovery-history-limit"
              value={String(limit)}
              onChange={event => {
                onLimitChange(Number(event.target.value) as DiscoverySettingsHistoryLimit)
              }}
            >
              {DISCOVERY_SETTINGS_HISTORY_LIMITS.map(choice => (
                <option key={choice} value={choice}>{choice}</option>
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
        ) : null}

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
            rows={rows}
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
    </SettingsSectionCard>
  )
}
