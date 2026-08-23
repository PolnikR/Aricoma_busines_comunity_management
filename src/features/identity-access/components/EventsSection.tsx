import { useMemo } from 'react'
import { Button } from '@/shared/components/button/Button'
import { DataTable, DataTableToolbar, useTableState } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import { IdentityResourceDetailPage } from './IdentityResourceLayout'

const EVENT_TABS = [
  { value: 'user-events', label: 'User events' },
  { value: 'admin-events', label: 'Admin events' },
] as const

type EventTabId = (typeof EVENT_TABS)[number]['value']

interface EventAuditRow {
  id: string
  time: string
  type: string
  actor: string
  target: string
  source: string
}

interface EventsSectionProps {
  tabId: IdentityAccessTabId | null
  onTabChange: (tabId: IdentityAccessTabId) => void
  onOpenSettings: () => void
}

function isEventTab(tabId: IdentityAccessTabId | null): tabId is EventTabId {
  return EVENT_TABS.some(tab => tab.value === tabId)
}

export function EventsSection({ tabId, onTabChange, onOpenSettings }: EventsSectionProps) {
  const activeTab: EventTabId = isEventTab(tabId) ? tabId : 'user-events'
  const events: EventAuditRow[] = []
  const table = useTableState(events, { searchFields: ['type', 'actor', 'target', 'source'] })
  const columns = useMemo<ColumnDef<EventAuditRow>[]>(() => activeTab === 'user-events'
    ? [
        { id: 'time', header: 'Time', cell: event => event.time },
        { id: 'type', header: 'Event type', cell: event => event.type },
        { id: 'actor', header: 'User', cell: event => event.actor || '—' },
        { id: 'target', header: 'Client', cell: event => event.target || '—' },
        { id: 'source', header: 'IP address', cell: event => event.source || '—' },
      ]
    : [
        { id: 'time', header: 'Time', cell: event => event.time },
        { id: 'type', header: 'Operation', cell: event => event.type },
        { id: 'actor', header: 'Administrator', cell: event => event.actor || '—' },
        { id: 'target', header: 'Resource', cell: event => event.target || '—' },
      ], [activeTab])

  return (
    <IdentityResourceDetailPage
      eyebrow="Manage"
      title="Events"
      description="Review Keycloak user activity and administrator audit events. Persistence is configured separately under Realm settings."
      tabs={EVENT_TABS}
      tabId={activeTab}
      onTabChange={nextTab => { onTabChange(nextTab) }}
      tabAriaLabel="Event audit sections"
      actions={<Button size="sm" variant="outline" onClick={onOpenSettings}>Event settings</Button>}
    >
      <DataTableToolbar
        searchValue={table.search}
        onSearchChange={table.setSearch}
        searchPlaceholder={activeTab === 'user-events' ? 'Search user events' : 'Search admin events'}
        searchLabel={activeTab === 'user-events' ? 'Search user events' : 'Search admin events'}
        density={table.density}
        onDensityChange={table.setDensity}
      />
      <DataTable
        columns={columns}
        rows={table.pageItems}
        rowKey={event => event.id}
        density={table.density}
        ariaLabel={activeTab === 'user-events' ? 'User events' : 'Admin events'}
        emptyContent={<EmptyState title={activeTab === 'user-events' ? 'No user events connected' : 'No admin events connected'} description="Keycloak event audit data is not available from the current frontend contract." />}
      />
    </IdentityResourceDetailPage>
  )
}
