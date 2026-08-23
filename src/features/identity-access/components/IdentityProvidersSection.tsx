import { Button } from '@/shared/components/button/Button'
import { Card, CardDescription, CardTitle } from '@/shared/components/card/Card'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import { IdentityResourceDetailPage, IdentityResourceHeader } from './IdentityResourceLayout'

const PROVIDER_TABS = [
  { value: 'settings', label: 'Settings' },
  { value: 'mappers', label: 'Mappers' },
] as const

type ProviderTabId = (typeof PROVIDER_TABS)[number]['value']

interface IdentityProvidersSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isProviderTab(tabId: IdentityAccessTabId | null): tabId is ProviderTabId {
  return PROVIDER_TABS.some(tab => tab.value === tabId)
}

function ProviderTypeCard({ title, description }: { title: string; description: string }) {
  return (
    <Card className="rounded-xl shadow-none">
      <CardTitle className="text-sm">{title}</CardTitle>
      <CardDescription className="text-xs">{description}</CardDescription>
      <Button className="mt-4" size="sm" variant="outline" disabled title="Requires Keycloak identity-provider integration">Add</Button>
    </Card>
  )
}

export function IdentityProvidersSection({ entityId, tabId, onEntityChange, onTabChange }: IdentityProvidersSectionProps) {
  if (entityId) {
    const activeTab: ProviderTabId = isProviderTab(tabId) ? tabId : 'settings'
    return (
      <IdentityResourceDetailPage
        eyebrow="Configure"
        title={entityId}
        description="Keycloak identity provider"
        backLabel="Identity providers"
        onBack={() => { onEntityChange(null) }}
        tabs={PROVIDER_TABS}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel="Identity provider sections"
      >
        <div className="p-4">
          <EmptyState title={PROVIDER_TABS.find(tab => tab.value === activeTab)?.label ?? activeTab} description="Configured identity-provider data is not connected yet." />
        </div>
      </IdentityResourceDetailPage>
    )
  }

  return (
    <div className="flex min-w-0 flex-col">
      <IdentityResourceHeader eyebrow="Configure" title="Identity providers" description="Broker authentication to external protocol-based and social identity providers." />
      <div className="space-y-6 p-4">
        <section>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">User-defined and protocol providers</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <ProviderTypeCard title="Keycloak OpenID Connect" description="Connect another Keycloak realm through OpenID Connect." />
            <ProviderTypeCard title="OpenID Connect v1.0" description="Connect an external OpenID Connect provider." />
            <ProviderTypeCard title="SAML v2.0" description="Connect an external SAML identity provider." />
          </div>
        </section>
        <section>
          <h3 className="mb-3 text-sm font-semibold text-text-primary">Social providers</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {['Google', 'GitHub', 'Microsoft', 'GitLab'].map(provider => <ProviderTypeCard key={provider} title={provider} description={`Connect ${provider} as a social identity provider.`} />)}
          </div>
        </section>
        <EmptyState title="No configured identity providers" description="Configured Keycloak identity providers are not available from the current frontend contract." />
      </div>
    </div>
  )
}
