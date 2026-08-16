import { useState } from 'react'
import { useSessions } from '../hooks/useSessions'
import { useUsers } from '../hooks/useUsers'
import { useOrganizations } from '../hooks/useOrganizations'
import type { Session } from '../models/identityTypes'
import { ListSkeleton } from '@/shared/components/list-skeleton/ListSkeleton'
import { EmptyState } from '@/shared/components/empty-state/EmptyState'

export function SessionsTab() {
  const { data: sessions, isLoading, error } = useSessions()
  const { data: users } = useUsers()
  const { data: organizations } = useOrganizations()
  const [selectedSession, setSelectedSession] = useState<Session | null>(null)
  const [dateFilter, setDateFilter] = useState<'24h' | '7d' | 'all'>('all')

  const getUserName = (userId: string) => users?.find(u => u.id === userId)?.name || userId
  const getOrgName = (orgId: string) => organizations?.find(o => o.id === orgId)?.name || orgId

  const filteredSessions = sessions?.filter((session) => {
    if (dateFilter === '24h') {
      const now = new Date()
      const dayAgo = new Date(now.getTime() - 86400000)
      return new Date(session.loginTime) > dayAgo
    }
    if (dateFilter === '7d') {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 604800000)
      return new Date(session.loginTime) > weekAgo
    }
    return true
  }) || []

  if (isLoading) return <ListSkeleton rowCount={5} />
  if (error) return <div className="text-red-600 text-sm">Error loading sessions: {error.message}</div>
  if (!sessions || sessions.length === 0) return <EmptyState title="No sessions found" description="No user sessions in the system." />

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-semibold text-text-primary">User Sessions</h3>
        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value as '24h' | '7d' | 'all')}
          className="px-3 py-1.5 text-xs font-medium border border-border rounded bg-surface text-text-primary"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="all">All Sessions</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left px-3 py-2 font-semibold text-text-primary">User</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Organization</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Login Time</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Last Activity</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">IP Address</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Status</th>
              <th className="text-left px-3 py-2 font-semibold text-text-primary">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSessions.map((session) => (
              <tr key={session.id} className="border-b border-border hover:bg-surface-muted">
                <td className="px-3 py-2 text-text-primary cursor-pointer" onClick={() => setSelectedSession(session)}>
                  {getUserName(session.userId)}
                </td>
                <td className="px-3 py-2 text-text-secondary">{getOrgName(session.organizationId)}</td>
                <td className="px-3 py-2 text-text-secondary">{new Date(session.loginTime).toLocaleString()}</td>
                <td className="px-3 py-2 text-text-secondary">{new Date(session.lastActivityTime).toLocaleString()}</td>
                <td className="px-3 py-2 text-text-secondary text-xs font-mono">{session.ipAddress}</td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-2 py-1 rounded font-medium ${
                    session.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    session.status === 'expired' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200' :
                    'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {session.status}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {session.status === 'active' && (
                    <button className="text-xs text-red-600 hover:underline">Logout</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSession && (
        <div className="mt-4 p-4 border border-border rounded-lg bg-surface-muted">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-semibold text-text-primary">{getUserName(selectedSession.userId)}</h4>
              <p className="text-sm text-text-secondary mt-1">Organization: {getOrgName(selectedSession.organizationId)}</p>
              <p className="text-sm text-text-secondary">Login Time: {new Date(selectedSession.loginTime).toLocaleString()}</p>
              <p className="text-sm text-text-secondary">Last Activity: {new Date(selectedSession.lastActivityTime).toLocaleString()}</p>
              <p className="text-sm text-text-secondary">IP Address: {selectedSession.ipAddress}</p>
              <p className="text-sm text-text-secondary">Status: {selectedSession.status}</p>
              <p className="text-sm text-text-secondary">User Agent: {selectedSession.userAgent}</p>
            </div>
            <button onClick={() => setSelectedSession(null)} className="text-text-muted hover:text-text-primary">✕</button>
          </div>
        </div>
      )}
    </div>
  )
}
