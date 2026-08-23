import { useMemo } from 'react'
import { Button } from '@/shared/components/button/Button'
import { DataTable, DataTableToolbar, useTableState } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import { IdentityResourceDetailPage } from './IdentityResourceLayout'

const AUTH_TABS = [
  { value: 'flows', label: 'Flows' },
  { value: 'required-actions', label: 'Required actions' },
  { value: 'policies', label: 'Policies' },
] as const

type AuthenticationTabId = (typeof AUTH_TABS)[number]['value']

interface AuthenticationFlowSummary {
  id: string
  name: string
  description: string
}

interface AuthenticationSectionProps {
  tabId: IdentityAccessTabId | null
  onTabChange: (tabId: IdentityAccessTabId) => void
}

function isAuthenticationTab(tabId: IdentityAccessTabId | null): tabId is AuthenticationTabId {
  return AUTH_TABS.some(tab => tab.value === tabId)
}

export function AuthenticationSection({ tabId, onTabChange }: AuthenticationSectionProps) {
  const activeTab: AuthenticationTabId = isAuthenticationTab(tabId) ? tabId : 'flows'
  const flows: AuthenticationFlowSummary[] = []
  const table = useTableState(flows, { searchFields: ['name', 'description'] })
  const flowColumns = useMemo<ColumnDef<AuthenticationFlowSummary>[]>(() => [
    { id: 'name', header: 'Flow name', cell: flow => <span className="font-semibold text-text-primary">{flow.name}</span> },
    { id: 'description', header: 'Description', cell: flow => flow.description || '—' },
  ], [])

  let content
  if (activeTab === 'flows') {
    content = (
      <>
        <DataTableToolbar searchValue={table.search} onSearchChange={table.setSearch} searchPlaceholder="Search flows" searchLabel="Search authentication flows" density={table.density} onDensityChange={table.setDensity} />
        <DataTable
          columns={flowColumns}
          rows={table.pageItems}
          rowKey={flow => flow.id}
          density={table.density}
          ariaLabel="Authentication flows"
          emptyContent={<EmptyState title="No authentication flows connected" description="Keycloak authentication-flow data is not available from the current frontend contract." />}
        />
      </>
    )
  } else {
    const label = AUTH_TABS.find(tab => tab.value === activeTab)?.label ?? activeTab
    content = <div className="p-4"><EmptyState title={label} description={`Keycloak ${label.toLowerCase()} configuration is not connected yet.`} /></div>
  }

  return (
    <IdentityResourceDetailPage
      eyebrow="Configure"
      title="Authentication"
      description="Configure Keycloak authentication flows, required actions, and authentication policies."
      tabs={AUTH_TABS}
      tabId={activeTab}
      onTabChange={nextTab => { onTabChange(nextTab) }}
      tabAriaLabel="Authentication sections"
      actions={activeTab === 'flows' ? <Button size="sm" disabled title="Requires Keycloak authentication integration">Create flow</Button> : undefined}
    >
      {content}
    </IdentityResourceDetailPage>
  )
}
