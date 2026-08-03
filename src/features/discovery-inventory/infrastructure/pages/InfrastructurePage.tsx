import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import type { PowerInventory } from '../../model/discoveryTypes'
import { mapInventoryToTopology } from '../helpers/mapInventoryToTopology'
import { mapPowerInventoryToTopology } from '../helpers/mapPowerInventoryToTopology'
import { useInfrastructureInventory } from '../hooks/useInfrastructureInventory'
import {
  getInfrastructureProviders,
  parseInfrastructurePlatform,
  resolveInfrastructureProvider,
} from '../model/infrastructureSourceSelection'
import type { InfrastructureTopologyPlatform } from '../model/topologyTypes'
import { InfrastructureSourceSelector } from '../components/InfrastructureSourceSelector'
import { InfrastructureTopologySkeleton } from '../components/InfrastructureTopologySkeleton'
import { InfrastructureTopologyWorkspace } from '../components/InfrastructureTopologyWorkspace'

function isPowerInventory(inventory: unknown): inventory is PowerInventory {
  return Boolean(inventory && typeof inventory === 'object' && 'partitions' in inventory)
}

export function InfrastructurePage() {
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()
  const platform = parseInfrastructurePlatform(searchParams.get('platform'))
  const providersQuery = useProviders()
  const providers = useMemo(() => providersQuery.data ?? [], [providersQuery.data])
  const compatibleProviders = useMemo(
    () => getInfrastructureProviders(providers, platform),
    [platform, providers],
  )
  const selectedProvider = useMemo(
    () => resolveInfrastructureProvider(
      providers,
      platform,
      searchParams.get('providerId'),
    ),
    [platform, providers, searchParams],
  )
  const inventoryQuery = useInfrastructureInventory(selectedProvider)
  const topology = useMemo(() => {
    if (!inventoryQuery.data || !selectedProvider) return null

    if (selectedProvider.type === 'IBM_POWER') {
      return isPowerInventory(inventoryQuery.data)
        ? mapPowerInventoryToTopology(inventoryQuery.data)
        : null
    }

    return isPowerInventory(inventoryQuery.data)
      ? null
      : mapInventoryToTopology(inventoryQuery.data)
  }, [inventoryQuery.data, selectedProvider])

  useEffect(() => {
    if (!providersQuery.data) return

    const canonicalParams = new URLSearchParams(searchParams)
    canonicalParams.set('platform', platform)
    if (selectedProvider) canonicalParams.set('providerId', selectedProvider.id)
    else canonicalParams.delete('providerId')

    if (canonicalParams.toString() !== searchParams.toString()) {
      setSearchParams(canonicalParams, { replace: true })
    }
  }, [platform, providersQuery.data, searchParams, selectedProvider, setSearchParams])

  const handlePlatformChange = (nextPlatform: InfrastructureTopologyPlatform) => {
    const nextParams = new URLSearchParams(searchParams)
    const nextProvider = resolveInfrastructureProvider(providers, nextPlatform)
    nextParams.set('platform', nextPlatform)
    if (nextProvider) nextParams.set('providerId', nextProvider.id)
    else nextParams.delete('providerId')
    setSearchParams(nextParams)
  }
  const handleProviderChange = (providerId: string) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('providerId', providerId)
    setSearchParams(nextParams)
  }
  const handleInventoryRefetch = () => { void inventoryQuery.refetch() }
  const handleProvidersRefetch = () => { void providersQuery.refetch() }
  const isLoading = providersQuery.isLoading
    || Boolean(selectedProvider && inventoryQuery.isLoading)

  return (
    <div className="flex flex-1 min-h-full w-full min-w-0 max-w-full flex-col overflow-x-hidden lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow={t('pages.infrastructure.eyebrow')}
        title={t('pages.infrastructure.title')}
        description={t('pages.infrastructure.description')}
        actions={selectedProvider ? (
          <Button
            size="sm"
            variant="outline"
            disabled={inventoryQuery.isFetching}
            onClick={handleInventoryRefetch}
          >
            {inventoryQuery.isFetching ? t('buttons.refreshing') : t('buttons.refreshInventory')}
          </Button>
        ) : undefined}
      />

      <InfrastructureSourceSelector
        platform={platform}
        providers={compatibleProviders}
        providerId={selectedProvider?.id ?? ''}
        disabled={providersQuery.isLoading}
        onPlatformChange={handlePlatformChange}
        onProviderChange={handleProviderChange}
      />

      {isLoading ? <InfrastructureTopologySkeleton /> : null}

      {!isLoading && providersQuery.error ? (
        <FetchErrorAlert
          title={t('pages.infrastructure.providersError.title')}
          description={providersQuery.error instanceof Error
            ? providersQuery.error.message
            : t('messages.unknownError')}
          retryLabel={t('pages.infrastructure.error.retryButton')}
          variant="full"
          isRetrying={providersQuery.isFetching}
          onRetry={handleProvidersRefetch}
        />
      ) : null}

      {!isLoading && !providersQuery.error && !selectedProvider ? (
        <EmptyState
          title={t('pages.infrastructure.noProviders.title')}
          description={t('pages.infrastructure.noProviders.description')}
        />
      ) : null}

      {!isLoading && selectedProvider && !topology ? (
        <FetchErrorAlert
          title={t('pages.infrastructure.error.title')}
          description={inventoryQuery.error instanceof Error
            ? inventoryQuery.error.message
            : t('messages.unknownError')}
          retryLabel={t('pages.infrastructure.error.retryButton')}
          variant="full"
          isRetrying={inventoryQuery.isFetching}
          onRetry={handleInventoryRefetch}
        />
      ) : null}

      {!isLoading && topology ? (
        <>
          {inventoryQuery.error ? (
            <FetchErrorAlert
              className="mb-4"
              title={t('pages.infrastructure.latestRequestFailed')}
              description={t('pages.infrastructure.showingPrevious')}
              isRetrying={inventoryQuery.isFetching}
              onRetry={handleInventoryRefetch}
            />
          ) : null}

          {topology.nodes.length > 0 ? (
            <InfrastructureTopologyWorkspace
              key={`${platform}:${selectedProvider?.id ?? ''}`}
              platform={platform}
              positionScope={`${platform}:${selectedProvider?.id ?? ''}`}
              topology={topology}
            />
          ) : (
            <EmptyState
              title={t('pages.infrastructure.empty.title')}
              description={t('pages.infrastructure.empty.description')}
            />
          )}
        </>
      ) : null}
    </div>
  )
}
