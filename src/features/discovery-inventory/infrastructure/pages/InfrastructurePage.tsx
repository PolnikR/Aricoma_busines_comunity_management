import { useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router'
import { extractBackendErrorDetail, resolveUserFacingErrorMessage } from '@/shared/api/apiErrorMessage'
import { Button } from '@/shared/components/button/Button'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { useProviders } from '@/features/providers-connectors/providers/hooks/useProviders'
import type { FlashSystemVolumeTreeView } from '../model/flashSystemVolumeTreeTypes'
import { resolveInfrastructureTopology } from '../helpers/resolveInfrastructureTopology'
import { useInfrastructureInventory } from '../hooks/useInfrastructureInventory'
import { useFlashSystemVolumeTree } from '../hooks/useFlashSystemVolumeTree'
import {
  getInfrastructureProviders,
  parseInfrastructurePlatform,
  resolveInfrastructureProvider,
} from '../model/infrastructureSourceSelection'
import type { InfrastructureTopologyPlatform } from '../model/topologyTypes'
import { InfrastructureSourceSelector } from '../components/InfrastructureSourceSelector'
import { InfrastructureTopologySkeleton } from '../components/InfrastructureTopologySkeleton'
import { InfrastructureTopologyWorkspace } from '../components/InfrastructureTopologyWorkspace'

function parseFlashSystemView(value: string | null): FlashSystemVolumeTreeView {
  return value === 'snapshot' || value === 'consistency_group' ? value : 'flat'
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
  const flashSystemView = parseFlashSystemView(searchParams.get('view'))
  const inventoryQuery = useInfrastructureInventory(
    platform === 'flashsystem' ? null : selectedProvider,
  )
  const flashSystemTreeQuery = useFlashSystemVolumeTree(
    platform === 'flashsystem' ? selectedProvider?.id : undefined,
    platform === 'flashsystem' ? flashSystemView : undefined,
  )
  const topology = useMemo(() => {
    if (!selectedProvider) return null

    return resolveInfrastructureTopology(
      platform,
      inventoryQuery.data,
      flashSystemTreeQuery.data,
      selectedProvider.type,
    )
  }, [flashSystemTreeQuery.data, inventoryQuery.data, platform, selectedProvider])
  const activeQuery = platform === 'flashsystem' ? flashSystemTreeQuery : inventoryQuery

  const handleFlashSystemViewChange = (nextView: FlashSystemVolumeTreeView) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.set('view', nextView)
    setSearchParams(nextParams)
  }

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
  const handleInventoryRefetch = () => { void activeQuery.refetch() }
  const handleProvidersRefetch = () => { void providersQuery.refetch() }
  const isLoading = providersQuery.isLoading
    || Boolean(selectedProvider && activeQuery.isLoading)
  const providersErrorDetail = extractBackendErrorDetail(providersQuery.error)
  const activeErrorDetail = extractBackendErrorDetail(activeQuery.error)

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
            disabled={activeQuery.isFetching}
            onClick={handleInventoryRefetch}
          >
            {activeQuery.isFetching ? t('buttons.refreshing') : t('buttons.refreshInventory')}
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

      {!isLoading && providersQuery.error && !providersQuery.data ? (
        <FetchErrorAlert
          title={t('pages.infrastructure.providersError.title')}
          description={resolveUserFacingErrorMessage(providersQuery.error, t('messages.unknownError'))}
          retryLabel={t('pages.infrastructure.error.retryButton')}
          variant="full"
          isRetrying={providersQuery.isFetching}
          onRetry={handleProvidersRefetch}
        />
      ) : null}

      {!isLoading && providersQuery.error && providersQuery.data ? (
        <FetchErrorAlert
          className="mb-4"
          title={t('pages.infrastructure.providersError.title')}
          description={providersErrorDetail
            ? `${t('pages.infrastructure.providersError.showingPrevious')} ${providersErrorDetail}`
            : t('pages.infrastructure.providersError.showingPrevious')}
          isRetrying={providersQuery.isFetching}
          onRetry={handleProvidersRefetch}
        />
      ) : null}

      {!isLoading && providersQuery.data && !selectedProvider ? (
        <EmptyState
          title={t('pages.infrastructure.noProviders.title')}
          description={t('pages.infrastructure.noProviders.description')}
        />
      ) : null}

      {!isLoading && selectedProvider && !topology ? (
        <FetchErrorAlert
          title={t('pages.infrastructure.error.title')}
          description={resolveUserFacingErrorMessage(activeQuery.error, t('messages.unknownError'))}
          retryLabel={t('pages.infrastructure.error.retryButton')}
          variant="full"
          isRetrying={activeQuery.isFetching}
          onRetry={handleInventoryRefetch}
        />
      ) : null}

      {!isLoading && topology ? (
        <>
          {activeQuery.error ? (
            <FetchErrorAlert
              className="mb-4"
              title={t('pages.infrastructure.latestRequestFailed')}
              description={activeErrorDetail
                ? `${t('pages.infrastructure.showingPrevious')} ${activeErrorDetail}`
                : t('pages.infrastructure.showingPrevious')}
              isRetrying={activeQuery.isFetching}
              onRetry={handleInventoryRefetch}
            />
          ) : null}

          {topology.nodes.length > 0 ? (
            <InfrastructureTopologyWorkspace
              key={`${platform}:${selectedProvider?.id ?? ''}`}
              platform={platform}
              positionScope={`${platform}:${selectedProvider?.id ?? ''}`}
              topology={topology}
              flashSystemView={platform === 'flashsystem' ? flashSystemView : undefined}
              onFlashSystemViewChange={handleFlashSystemViewChange}
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
