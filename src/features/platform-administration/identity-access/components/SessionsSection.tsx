import { useMemo } from 'react'
import { useTranslation } from '@/hooks/useTranslation'
import { DataTable } from '@/shared/components/data-table'
import type { ColumnDef } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { IdentityContentPanel } from './IdentityResourceLayout'

interface ClientSessionSummary {
  clientId: string
  activeSessions: number
  offlineSessions: number
}

export function SessionsSection() {
  const { t } = useTranslation()
  const clientSessions: ClientSessionSummary[] = []
  const columns = useMemo<ColumnDef<ClientSessionSummary>[]>(() => [
    { id: 'client', header: t('identity.sessions.columns.client'), cell: row => <span className="font-semibold text-text-primary">{row.clientId}</span> },
    { id: 'active', header: t('identity.sessions.columns.active'), align: 'right', cell: row => String(row.activeSessions) },
    { id: 'offline', header: t('identity.sessions.columns.offline'), align: 'right', cell: row => String(row.offlineSessions) },
  ], [t])

  return (
    <IdentityContentPanel>
      <DataTable
        layout="fit"
        columns={columns}
        rows={clientSessions}
        rowKey={row => row.clientId}
        ariaLabel={t('identity.sessions.ariaLabel')}
        emptyContent={
          <EmptyState
            title={t('identity.sessions.empty.title')}
            description={t('identity.sessions.empty.description')}
          />
        }
      />
    </IdentityContentPanel>
  )
}
