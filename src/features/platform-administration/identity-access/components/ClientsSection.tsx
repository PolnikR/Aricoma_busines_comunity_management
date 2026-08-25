import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { Badge } from '@/shared/components/badge/Badge'
import { DataTable, DataTableToolbar, useTableState } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { Field, Input } from '@/shared/components/form/FormControls'
import { useIdentityAdminPreview } from '../hooks/useIdentityAdminPreview'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import type { IdentityClientView, IdentityRoleView } from '../services/identityAdminGateway'
import { IdentityContentPanel, IdentityResourceDetailPage, IdentitySettingsSection } from './IdentityResourceLayout'

const CANONICAL_CLIENT_TABS = ['settings', 'keys', 'credentials', 'roles', 'client-scopes', 'authorization', 'service-accounts-roles', 'sessions', 'permissions'] as const
const VISIBLE_CLIENT_TABS = ['settings', 'roles'] as const
type ClientTabId = (typeof CANONICAL_CLIENT_TABS)[number]

interface ClientsSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isClientTab(tabId: IdentityAccessTabId | null): tabId is ClientTabId {
  return CANONICAL_CLIENT_TABS.some(tab => tab === tabId)
}

export function ClientsSection({ entityId, tabId, onEntityChange, onTabChange }: ClientsSectionProps) {
  const { t } = useTranslation()
  const { data, isLoading, error } = useIdentityAdminPreview()
  const clients = data?.clients ?? []
  const table = useTableState(clients, { searchFields: ['clientId', 'displayName', 'protocol'] })
  const columns = useMemo<ColumnDef<IdentityClientView>[]>(() => [
    { id: 'id', header: t('identity.clients.columns.clientId'), cell: client => <span className="font-semibold text-text-primary">{client.clientId}</span> },
    { id: 'name', header: t('identity.clients.columns.displayName'), cell: client => client.displayName },
    { id: 'protocol', header: t('identity.clients.columns.protocol'), cell: client => client.protocol },
    {
      id: 'status',
      header: t('identity.clients.columns.status'),
      cell: client => (
        <div className="flex flex-wrap gap-2">
          <Badge color={client.enabled ? 'success' : 'light'} size="sm">
            {client.enabled ? t('identity.common.status.enabled') : t('identity.common.status.disabled')}
          </Badge>
          {client.isPreview ? <Badge color="warning" size="sm">{t('identity.clients.status.previewOnly')}</Badge> : null}
        </div>
      ),
    },
  ], [t])
  const tabs = VISIBLE_CLIENT_TABS.map(value => ({ value, label: t(`identity.clients.tabs.${value}`) }))

  const selectedClient = clients.find(client => client.id === entityId) ?? null
  if (entityId && selectedClient) {
    const activeTab: ClientTabId = isClientTab(tabId) ? tabId : 'settings'
    return (
      <IdentityResourceDetailPage
        eyebrow={t('identity.navigation.groups.manage')}
        title={selectedClient.displayName}
        description={t('identity.clients.detail.description', { clientId: selectedClient.clientId })}
        backLabel={t('identity.navigation.sections.clients')}
        onBack={() => { onEntityChange(null) }}
        tabs={tabs}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel={t('identity.clients.tabs.ariaLabel')}
      >
        {activeTab === 'settings'
          ? <ClientSettings client={selectedClient} />
          : activeTab === 'roles'
            ? <ClientRoles roles={selectedClient.roles} capabilities={data?.capabilities ?? []} />
            : <div className="p-4"><EmptyState title={t('identity.common.integration.title')} description={t('identity.common.integration.description', { tab: activeTab })} /></div>}
      </IdentityResourceDetailPage>
    )
  }

  return (
    <IdentityContentPanel>
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('identity.clients.search')}
        searchLabel={t('identity.clients.search')}
        density={table.density}
        onDensityChange={table.setDensity}
      />
      {error
        ? <div className="p-4"><EmptyState title={t('identity.clients.loadFailed')} description={error.message} /></div>
        : <DataTable
            layout="fit"
            columns={columns}
            rows={table.pageItems}
            rowKey={client => client.id}
            density={table.density}
            ariaLabel={t('identity.navigation.sections.clients')}
            onRowClick={client => { onEntityChange(client.id) }}
            rowAriaLabel={client => t('identity.clients.rowAriaLabel', { clientId: client.clientId })}
            emptyContent={<EmptyState title={isLoading ? t('identity.clients.loading') : t('identity.clients.empty.title')} description={t('identity.clients.empty.description')} />}
          />}
    </IdentityContentPanel>
  )
}

function ClientSettings({ client }: { client: IdentityClientView }) {
  const { t } = useTranslation()
  return (
    <IdentitySettingsSection title={t('identity.clients.settings.title')} description={t('identity.clients.settings.description')}>
      <div className="grid min-w-0 gap-4 md:grid-cols-2">
        <Field label={t('identity.clients.fields.clientId')} htmlFor="client-id">
          <Input id="client-id" value={client.clientId} readOnly />
        </Field>
        <Field label={t('identity.clients.fields.displayName')} htmlFor="client-display-name">
          <Input id="client-display-name" value={client.displayName} readOnly />
        </Field>
        <Field label={t('identity.clients.fields.protocol')} htmlFor="client-protocol">
          <Input id="client-protocol" value={client.protocol} readOnly />
        </Field>
        <Field label={t('identity.clients.fields.rootUrl')} htmlFor="client-root-url">
          <Input id="client-root-url" value={client.rootUrl} readOnly />
        </Field>
        <Field label={t('identity.clients.fields.homeUrl')} htmlFor="client-home-url">
          <Input id="client-home-url" value={client.homeUrl} readOnly />
        </Field>
        <div className="flex min-w-0 flex-wrap items-end gap-2">
          <Badge color={client.enabled ? 'success' : 'light'}>
            {client.enabled ? t('identity.common.status.enabled') : t('identity.common.status.disabled')}
          </Badge>
          <Badge color="info">
            {client.isPublicClient ? t('identity.clients.status.publicClient') : t('identity.clients.status.confidentialClient')}
          </Badge>
          <Badge color="warning">{t('identity.clients.status.previewOnly')}</Badge>
        </div>
      </div>
    </IdentitySettingsSection>
  )
}

function ClientRoles({ roles, capabilities }: { roles: IdentityRoleView[]; capabilities: { id: string; description: string }[] }) {
  const { t } = useTranslation()
  const columns = useMemo<ColumnDef<IdentityRoleView>[]>(() => [
    { id: 'name', header: t('identity.clients.roles.columns.role'), cell: role => <span className="font-semibold text-text-primary">{role.name}</span> },
    { id: 'description', header: t('identity.clients.roles.columns.purpose'), cell: role => role.description },
    {
      id: 'capabilities',
      header: t('identity.clients.roles.columns.capabilities'),
      cell: role => role.capabilityIds
        .map(id => capabilities.find(capability => capability.id === id)?.description)
        .filter(Boolean)
        .join(' '),
    },
  ], [capabilities, t])
  return <DataTable layout="fit" columns={columns} rows={roles} rowKey={role => role.id} ariaLabel={t('identity.clients.roles.ariaLabel')} />
}
