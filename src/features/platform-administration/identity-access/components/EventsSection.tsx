import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { DataTable, DataTableToolbar, useTableState } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { Tabs } from '@/shared/components/tabs/Tabs'
import type { IdentityAccessTabId } from '../models/identityAccessSections'
import { IdentityContentPanel } from './IdentityResourceLayout'

const EVENT_TABS = ['user-events', 'admin-events'] as const

type EventTabId = (typeof EVENT_TABS)[number]

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
  return EVENT_TABS.some(tab => tab === tabId)
}

export function EventsSection({ tabId, onTabChange }: EventsSectionProps) {
  const { t } = useTranslation()
  const activeTab: EventTabId = isEventTab(tabId) ? tabId : 'user-events'
  const events: EventAuditRow[] = []
  const table = useTableState(events, { searchFields: ['type', 'actor', 'target', 'source'] })
  const columns = useMemo<ColumnDef<EventAuditRow>[]>(() => activeTab === 'user-events'
    ? [
        { id: 'time', header: t('identity.events.columns.time'), cell: event => event.time },
        { id: 'type', header: t('identity.events.columns.eventType'), cell: event => event.type },
        { id: 'actor', header: t('identity.events.columns.user'), cell: event => event.actor || '—' },
        { id: 'target', header: t('identity.events.columns.client'), cell: event => event.target || '—' },
        { id: 'source', header: t('identity.events.columns.ipAddress'), cell: event => event.source || '—' },
      ]
    : [
        { id: 'time', header: t('identity.events.columns.time'), cell: event => event.time },
        { id: 'type', header: t('identity.events.columns.operation'), cell: event => event.type },
        { id: 'actor', header: t('identity.events.columns.administrator'), cell: event => event.actor || '—' },
        { id: 'target', header: t('identity.events.columns.resource'), cell: event => event.target || '—' },
      ], [activeTab, t])
  const tabs = EVENT_TABS.map(value => ({ value, label: t(`identity.events.tabs.${value}`) }))

  return (
    <IdentityContentPanel>
      <Tabs
        items={tabs}
        value={activeTab}
        onChange={onTabChange}
        ariaLabel={t('identity.events.tabs.ariaLabel')}
        indicator="inset"
        scrollControls={{ previousLabel: t('identity.events.tabs.scrollPrevious'), nextLabel: t('identity.events.tabs.scrollNext') }}
      />
      <div className="min-w-0">
        <DataTableToolbar
          searchValue={table.search}
          onSearchChange={table.setSearch}
          searchPlaceholder={activeTab === 'user-events' ? t('identity.events.search.user') : t('identity.events.search.admin')}
          searchLabel={activeTab === 'user-events' ? t('identity.events.search.user') : t('identity.events.search.admin')}
          density={table.density}
          onDensityChange={table.setDensity}
        />
        <DataTable
          layout="fit"
          columns={columns}
          rows={table.pageItems}
          rowKey={event => event.id}
          density={table.density}
          ariaLabel={activeTab === 'user-events' ? t('identity.events.tabs.user-events') : t('identity.events.tabs.admin-events')}
          emptyContent={<EmptyState title={activeTab === 'user-events' ? t('identity.events.empty.user') : t('identity.events.empty.admin')} description={t('identity.events.empty.description')} />}
        />
      </div>
    </IdentityContentPanel>
  )
}
