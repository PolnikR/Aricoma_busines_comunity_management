import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { DataTable, DataTableToolbar, useTableState } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import { IdentityContentPanel, IdentityResourceDetailPage } from './IdentityResourceLayout'

interface KeycloakOrganizationListItem {
  id: string
  name: string
  domains: string[]
  memberCount: number
  enabled: boolean
}

const ORGANIZATION_TABS = ['details', 'domains', 'members', 'groups', 'identity-providers'] as const

type OrganizationTabId = (typeof ORGANIZATION_TABS)[number]

interface OrganizationsSectionProps {
  entityId: string | null
  tabId: IdentityAccessTabId | null
  onEntityChange: (entityId: string | null) => void
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isOrganizationTab(tabId: IdentityAccessTabId | null): tabId is OrganizationTabId {
  return ORGANIZATION_TABS.some(tab => tab === tabId)
}

export function OrganizationsSection({ entityId, tabId, onEntityChange, onTabChange }: OrganizationsSectionProps) {
  const { t } = useTranslation()
  const organizations: KeycloakOrganizationListItem[] = []
  const table = useTableState(organizations, { searchFields: ['name'] })
  const columns = useMemo<ColumnDef<KeycloakOrganizationListItem>[]>(() => [
    { id: 'name', header: t('identity.organizations.columns.organization'), cell: organization => <span className="font-semibold text-text-primary">{organization.name}</span> },
    { id: 'domains', header: t('identity.organizations.columns.domains'), cell: organization => organization.domains.length > 0 ? organization.domains.join(', ') : '—' },
    { id: 'members', header: t('identity.organizations.columns.members'), align: 'right', cell: organization => String(organization.memberCount) },
    { id: 'status', header: t('identity.organizations.columns.status'), cell: organization => organization.enabled ? t('identity.common.status.enabled') : t('identity.common.status.disabled') },
  ], [t])
  const tabs = ORGANIZATION_TABS.map(value => ({ value, label: t(`identity.organizations.tabs.${value}`) }))

  if (entityId) {
    const activeTab: OrganizationTabId = isOrganizationTab(tabId) ? tabId : 'details'
    return (
      <IdentityResourceDetailPage
        eyebrow={t('identity.navigation.groups.manage')}
        title={entityId}
        description={t('identity.organizations.detail.description')}
        backLabel={t('identity.navigation.sections.organizations')}
        onBack={() => { onEntityChange(null) }}
        tabs={tabs}
        tabId={activeTab}
        onTabChange={nextTab => { onTabChange(nextTab) }}
        tabAriaLabel={t('identity.organizations.tabs.ariaLabel')}
      >
        <div className="p-4">
          <EmptyState
            title={t(`identity.organizations.tabs.${activeTab}`)}
            description={t('identity.organizations.detail.notConnected')}
          />
        </div>
      </IdentityResourceDetailPage>
    )
  }

  return (
    <IdentityContentPanel>
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={t('identity.organizations.search')}
        searchLabel={t('identity.organizations.search')}
        density={table.density}
        onDensityChange={table.setDensity}
      />
      <DataTable
        layout="fit"
        columns={columns}
        rows={table.pageItems}
        rowKey={organization => organization.id}
        density={table.density}
        ariaLabel={t('identity.organizations.ariaLabel')}
        onRowClick={organization => { onEntityChange(organization.id) }}
        rowAriaLabel={organization => t('identity.organizations.rowAriaLabel', { name: organization.name })}
        emptyContent={<EmptyState title={t('identity.organizations.empty.title')} description={t('identity.organizations.empty.description')} />}
      />
    </IdentityContentPanel>
  )
}
