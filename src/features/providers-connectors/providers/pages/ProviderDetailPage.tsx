import { useNavigate, useParams } from 'react-router'
import { Badge } from '@/shared/components/badge/Badge'
import { Button } from '@/shared/components/button/Button'
import { Card } from '@/shared/components/card/Card'
import { FetchErrorAlert } from '@/shared/components/fetch-error-alert/FetchErrorAlert'
import { PageHeader } from '@/shared/components/page/PageHeader'
import { useTranslation } from '@/hooks/useTranslation'
import { useProviders } from '../hooks/useProviders'
import { providerTypeLabel } from '../helpers/providerTypeLabel'
import type { ProviderCredentialStatus } from '../model/providerTypes'

function credentialStatusColor(status: ProviderCredentialStatus) {
  if (status === 'ok') return 'success' as const
  if (status === 'missing') return 'error' as const
  return 'light' as const
}

function roleColor(role: 'source' | 'target') {
  return role === 'source' ? 'success' as const : 'warning' as const
}

export function ProviderDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { providerId } = useParams<{ providerId: string }>()
  const { data: providers, isLoading, error, refetch } = useProviders()
  const provider = providers?.find((item) => item.id === providerId)

  const goBack = () => { void navigate('/providers-connectors/providers') }

  if (isLoading) {
    return (
      <div className="flex min-h-96 items-center justify-center text-sm text-text-muted" role="status">
        {t('pages.providers.detail.loading')}
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
            title={t('pages.providers.detail.loadError')}
            description={error instanceof Error ? error.message : t('pages.providers.detail.requestFailed')}
            retryLabel={t('pages.providers.detail.retry')}
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
              <h2 className="text-base font-semibold text-text-primary">{t('pages.providers.detail.title')}</h2>
              <p className="mt-1 text-sm text-text-muted">{t('pages.providers.detail.apiDescription')}</p>
            </div>
            <Badge color="info" size="sm">
              {providerTypeLabel(provider.type)}
            </Badge>
          </div>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{t('details.providerId')}</dt>
              <dd className="mt-1 font-mono text-sm text-text-primary">{provider.id}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{t('details.type')}</dt>
              <dd className="mt-1 text-sm text-text-primary">
                {providerTypeLabel(provider.type)}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{t('details.role')}</dt>
              <dd className="mt-1">
                <Badge color={roleColor(provider.role ?? 'source')} size="sm">{t(`forms.role.${provider.role ?? 'source'}`)}</Badge>
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{t('details.ipAddress')}</dt>
              <dd className="mt-1 font-mono text-sm text-text-primary">{provider.ipAddress || '-'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{t('details.url')}</dt>
              <dd className="mt-1 text-sm text-text-primary">
                {provider.url ? (
                  <a
                    href={provider.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="wrap-break-word text-accent underline hover:text-accent/80"
                  >
                    {provider.url}
                  </a>
                ) : '-'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{t('details.description')}</dt>
              <dd className="mt-1 text-sm text-text-primary">{provider.description || '-'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{t('details.defaultFlashcopyProviderId')}</dt>
              <dd className="mt-1 font-mono text-sm text-text-primary">{provider.defaultFlashcopyProviderId ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{t('details.orchestratorConnId')}</dt>
              <dd className="mt-1 font-mono text-sm text-text-primary">{provider.orchestratorConnId ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{t('details.credential')}</dt>
              <dd className="mt-1 font-mono text-sm text-text-primary">{provider.credentialId ?? '-'}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{t('details.credentialStatus')}</dt>
              <dd className="mt-1">
                <Badge color={credentialStatusColor(provider.credentialStatus)} size="sm">
                  {t(`providers.credentials.status.${provider.credentialStatus}`)}
                </Badge>
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  )
}
