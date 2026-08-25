import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/shared/components/button/Button'
import { Card, CardDescription, CardTitle } from '@/shared/components/card/Card'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import { IdentityContentPanel, IdentityResourceDetailPage } from './IdentityResourceLayout'

const PROVIDER_TABS = ['settings', 'mappers'] as const

type ProviderTabId = (typeof PROVIDER_TABS)[number]

interface IdentityProvidersSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isProviderTab(tabId: IdentityAccessTabId | null): tabId is ProviderTabId {
  return PROVIDER_TABS.some(tab => tab === tabId)
}

function ProviderTypeCard({ title, description }: { title: string; description: string }) {
  const { t } = useTranslation()
  return (
    <Card className="rounded-xl shadow-none">
      <CardTitle className="text-sm">{title}</CardTitle>
      <CardDescription className="text-xs">{description}</CardDescription>
      <Button className="mt-4" size="sm" variant="outline" disabled title={t('identity.providers.requiresIntegration')}>{t('identity.providers.add')}</Button>
    </Card>
  )
}

export function IdentityProvidersSection({ entityId, tabId, onEntityChange, onTabChange }: IdentityProvidersSectionProps) {
  const { t } = useTranslation()
  const tabs = PROVIDER_TABS.map(value => ({ value, label: t(`identity.providers.tabs.${value}`) }))
  if (entityId) {
    const activeTab: ProviderTabId = isProviderTab(tabId) ? tabId : 'settings'
    return (
      <IdentityResourceDetailPage
        eyebrow={t('identity.navigation.groups.configure')}
        title={entityId}
        description={t('identity.providers.detail.description')}
        backLabel={t('identity.navigation.sections.identity-providers')}
        onBack={() => { onEntityChange(null) }}
        tabs={tabs}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel={t('identity.providers.tabs.ariaLabel')}
      >
        <div className="p-4">
          <EmptyState title={t(`identity.providers.tabs.${activeTab}`)} description={t('identity.providers.detail.notConnected')} />
        </div>
      </IdentityResourceDetailPage>
    )
  }

  return (
    <IdentityContentPanel>
      <div className="space-y-6 p-4">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">{t('identity.providers.protocol.title')}</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <ProviderTypeCard title="Keycloak OpenID Connect" description={t('identity.providers.protocol.keycloakOidc')} />
            <ProviderTypeCard title="OpenID Connect v1.0" description={t('identity.providers.protocol.oidc')} />
            <ProviderTypeCard title="SAML v2.0" description={t('identity.providers.protocol.saml')} />
          </div>
        </section>
        <section>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">{t('identity.providers.social.title')}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['Google', 'GitHub', 'Microsoft', 'GitLab'].map(provider => <ProviderTypeCard key={provider} title={provider} description={t('identity.providers.social.description', { provider })} />)}
          </div>
        </section>
        <EmptyState title={t('identity.providers.empty.title')} description={t('identity.providers.empty.description')} />
      </div>
    </IdentityContentPanel>
  )
}
