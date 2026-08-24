import { DataTable } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { IdentityContentPanel } from './IdentityResourceLayout'

interface ClientSessionSummary {
  clientId: string
  activeSessions: number
  offlineSessions: number
}

const columns: ColumnDef<ClientSessionSummary>[] = [
  { id: 'client', header: 'Client', cell: row => <span className="font-semibold text-text-primary">{row.clientId}</span> },
  { id: 'active', header: 'Active sessions', align: 'right', cell: row => String(row.activeSessions) },
  { id: 'offline', header: 'Offline sessions', align: 'right', cell: row => String(row.offlineSessions) },
]

export function SessionsSection() {
  const clientSessions: ClientSessionSummary[] = []

  return (
    <IdentityContentPanel>
      <DataTable
        layout="fit"
        columns={columns}
        rows={clientSessions}
        rowKey={row => row.clientId}
        ariaLabel="Realm client sessions"
        emptyContent={
          <EmptyState
            title="Client session overview not connected"
            description="The current frontend Session model contains individual user sessions but no Keycloak client-session aggregation, so realm client counts are intentionally not fabricated."
          />
        }
      />
    </IdentityContentPanel>
  )
}
