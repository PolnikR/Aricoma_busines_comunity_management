import { useMemo, useState } from 'react'
import { Badge } from '@/shared/components/badge/Badge'
import {
  DataTable,
  DataTablePagination,
  DataTableRequestState,
  DataTableSkeleton,
  DataTableToolbar,
  DetailDrawer,
  DetailRow,
  useTableState,
} from '@/shared/components/data-table'
import type { ColumnDef, Segment } from '@/shared/components/data-table'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'
import { useOrganizations } from '../hooks/useOrganizations'
import { useSessions } from '../hooks/useSessions'
import { useUsers } from '../hooks/useUsers'
import type { Session } from '../models/identityTypes'

const SESSION_SEARCH_FIELDS: (keyof Session)[] = ['ipAddress', 'userAgent']
const SESSION_SEGMENTS: Segment[] = [
  { value: 'all', label: 'All sessions' },
  { value: '24h', label: 'Last 24 hours' },
  { value: '7d', label: 'Last 7 days' },
]
type SessionRange = 'all' | '24h' | '7d'

const statusColor: Record<Session['status'], 'success' | 'light' | 'error'> = {
  active: 'success',
  expired: 'light',
  terminated: 'error',
}

export function SessionsSection() {
  const { data: sessions = [], isLoading, error, refetch } = useSessions()
  const { data: users = [] } = useUsers()
  const { data: organizations = [] } = useOrganizations()
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [range, setRange] = useState<SessionRange>('all')

  const rangePredicate = useMemo(() => (session: Session) => {
    if (range === 'all') return true
    const milliseconds = range === '24h' ? 24 * 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000
    return new Date(session.loginTime).getTime() > Date.now() - milliseconds
  }, [range])

  const table = useTableState(sessions, { searchFields: SESSION_SEARCH_FIELDS, predicate: rangePredicate })
  const selectedSession = sessions.find(session => session.id === selectedSessionId) ?? null
  const getUserName = (userId: string) => users.find(user => user.id === userId)?.name ?? userId
  const getOrganizationName = (organizationId: string) => organizations.find(org => org.id === organizationId)?.name ?? organizationId

  const columns = useMemo<ColumnDef<Session>[]>(() => [
    { id: 'user', header: 'User', cell: session => <span className="font-semibold text-text-primary">{getUserName(session.userId)}</span> },
    { id: 'organization', header: 'Organization', cell: session => getOrganizationName(session.organizationId) },
    { id: 'login', header: 'Login time', cell: session => new Date(session.loginTime).toLocaleString() },
    { id: 'activity', header: 'Last activity', cell: session => new Date(session.lastActivityTime).toLocaleString() },
    { id: 'ip', header: 'IP address', cell: session => <span className="font-mono text-xs">{session.ipAddress}</span> },
    { id: 'status', header: 'Status', cell: session => <Badge color={statusColor[session.status]} size="sm">{session.status}</Badge> },
  ], [organizations, users])

  const changeRange = (value: string) => {
    setRange(value as SessionRange)
    table.setPage(1)
  }

  return (
    <div className="flex min-w-0 flex-col">
      <div className="border-b border-border px-4 pb-3 pt-1">
        <h2 className="text-base font-semibold text-text-primary">Sessions</h2>
        <p className="mt-1 text-xs text-text-muted">Review user sessions currently represented by the Identity & Access mock data.</p>
      </div>

      {isLoading ? (
        <DataTableSkeleton columnCount={6} rowCount={5} className="rounded-none border-0 shadow-none" />
      ) : (
        <>
          <DataTableToolbar
            searchValue={table.search}
            onSearchChange={table.setSearch}
            searchPlaceholder="Search IP or user agent"
            searchLabel="Search sessions"
            segments={SESSION_SEGMENTS}
            segmentValue={range}
            onSegmentChange={changeRange}
            density={table.density}
            onDensityChange={table.setDensity}
          />

          <DataTableRequestState
            hasData={sessions.length > 0}
            error={error ? {
              title: 'Sessions could not be loaded',
              description: error.message,
              retryLabel: 'Retry',
              isRetrying: false,
              onRetry: refetch,
            } : null}
          >
            <DataTable
              columns={columns}
              rows={table.pageItems}
              rowKey={session => session.id}
              density={table.density}
              minWidthClassName="min-w-260"
              ariaLabel="User sessions"
              rowAriaLabel={session => `Show session details for ${getUserName(session.userId)}`}
              onRowClick={session => { setSelectedSessionId(session.id) }}
              selectedRowKey={selectedSessionId}
              emptyContent={sessions.length > 0
                ? 'No sessions match the current search and time range.'
                : <EmptyState title="No sessions found" description="No user sessions are available in the current Identity & Access data." />}
            />
          </DataTableRequestState>

          {!error ? (
            <DataTablePagination
              page={table.page}
              pageSize={table.pageSize}
              total={table.total}
              onPageChange={table.setPage}
              onPageSizeChange={table.setPageSize}
            />
          ) : null}
        </>
      )}

      <DetailDrawer
        open={selectedSession !== null}
        onClose={() => { setSelectedSessionId(null) }}
        eyebrow="User session"
        title={selectedSession ? getUserName(selectedSession.userId) : ''}
        subtitle={selectedSession?.ipAddress}
        ariaLabel="Session detail"
        closeLabel="Close session detail"
      >
        {selectedSession ? (
          <dl className="px-5 py-3">
            <DetailRow label="Organization" value={getOrganizationName(selectedSession.organizationId)} />
            <DetailRow label="Login time" value={new Date(selectedSession.loginTime).toLocaleString()} />
            <DetailRow label="Last activity" value={new Date(selectedSession.lastActivityTime).toLocaleString()} />
            <DetailRow label="Expires" value={new Date(selectedSession.expiresAt).toLocaleString()} />
            <DetailRow label="IP address" value={<span className="font-mono">{selectedSession.ipAddress}</span>} />
            <DetailRow label="Status" value={<Badge color={statusColor[selectedSession.status]} size="sm">{selectedSession.status}</Badge>} />
            <DetailRow label="User agent" value={selectedSession.userAgent} />
          </dl>
        ) : null}
      </DetailDrawer>
    </div>
  )
}
