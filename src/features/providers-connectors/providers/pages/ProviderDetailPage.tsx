import { useNavigate, useParams } from 'react-router-dom'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Card } from '@/shared/components/card/Card'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { useProviders } from '../api/useProviders'
import { providerTypeLabel } from '../helpers/providerTypeLabel'

export function ProviderDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { providerId } = useParams<{ providerId: string }>()
  const { data: providers, isLoading, error, refetch } = useProviders()
  const provider = providers?.find((item) => item.id === providerId)

  const goBack = () => { void navigate('/providers-connectors/providers') }

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center text-sm text-[#71819a]" role="status">
        Loading provider
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-full flex-col">
        <PageHeader
          eyebrow={t('pages.providers.eyebrow')}
          title={t('pages.providers.title')}
          description={t('pages.providers.description')}
          actions={<Button size="sm" variant="outline" onClick={goBack}>{t('buttons.back')}</Button>}
        />
        <div className="p-6">
          <FetchErrorAlert
            title="Failed to load provider"
            description={error instanceof Error ? error.message : 'The provider request failed.'}
            retryLabel="Retry"
            variant="full"
            onRetry={() => { void refetch() }}
          />
        </div>
      </div>
    )
  }

  if (!provider) {
    return (
      <div className="flex min-h-full flex-col">
        <PageHeader
          eyebrow={t('pages.providers.eyebrow')}
          title={t('pages.providers.detail.notFound')}
          description={t('pages.providers.detail.notFoundDesc')}
          actions={<Button size="sm" variant="outline" onClick={goBack}>{t('buttons.back')}</Button>}
        />
        <div className="p-6">
          <div className="rounded-lg bg-red-50 p-4 text-red-700">{t('pages.providers.detail.unknown')}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col lg:h-full lg:min-h-0">
      <PageHeader
        eyebrow={t('pages.providers.eyebrow')}
        title={provider.name}
        description={provider.description || t('pages.providers.description')}
        actions={<Button size="sm" variant="outline" onClick={goBack}>{t('buttons.back')}</Button>}
      />

      <div className="flex-1 p-3 lg:min-h-0">
        <Card>
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-[#17233d]">Provider details</h2>
              <p className="mt-1 text-sm text-[#71819a]">Data returned by the provider API.</p>
            </div>
            <Badge color="info" size="sm">
              {provider.type ? providerTypeLabel(provider.type) : 'UNKNOWN'}
            </Badge>
          </div>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#8a98ad]">Provider ID</dt>
              <dd className="mt-1 font-mono text-sm text-[#17233d]">{provider.id}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#8a98ad]">Type</dt>
              <dd className="mt-1 text-sm text-[#17233d]">
                {provider.type ? providerTypeLabel(provider.type) : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#8a98ad]">IP address</dt>
              <dd className="mt-1 font-mono text-sm text-[#17233d]">{provider.ipAddress || '-'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-[#8a98ad]">Description</dt>
              <dd className="mt-1 text-sm text-[#17233d]">{provider.description || '-'}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  )
}
