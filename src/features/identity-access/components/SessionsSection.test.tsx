import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SessionsSection } from './SessionsSection'
import { useSessions } from '../hooks/useSessions'
import { useUsers } from '../hooks/useUsers'
import { useOrganizations } from '../hooks/useOrganizations'
import type { Session } from '../models/identityTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useSessions', () => ({ useSessions: vi.fn() }))
vi.mock('../hooks/useUsers', () => ({ useUsers: vi.fn() }))
vi.mock('../hooks/useOrganizations', () => ({ useOrganizations: vi.fn() }))

function session(overrides: Partial<Session> = {}): Session {
  return {
    id: 'session-1',
    userId: 'user-1',
    organizationId: 'org-1',
    ipAddress: '192.168.1.100',
    userAgent: 'Test Browser',
    loginTime: new Date(Date.now() - 60 * 60 * 1000),
    lastActivityTime: new Date(Date.now() - 5 * 60 * 1000),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    status: 'active',
    ...overrides,
  }
}

function mockLoadedSessions(sessions: Session[] = [session()]) {
  vi.mocked(useSessions).mockReturnValue({ data: sessions, isLoading: false, error: null, refetch: vi.fn() })
  vi.mocked(useUsers).mockReturnValue({
    data: [{ id: 'user-1', email: 'alice@example.com', name: 'Alice Smith', organizationId: 'org-1', roleIds: [], status: 'active', createdAt: new Date(), updatedAt: new Date() }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
  vi.mocked(useOrganizations).mockReturnValue({
    data: [{ id: 'org-1', name: 'Engineering', description: '', status: 'active', createdAt: new Date(), updatedAt: new Date() }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
}

describe('SessionsSection', () => {
  it('preserves the all/24h/7d session filtering semantics', async () => {
    mockLoadedSessions([
      session(),
      session({ id: 'session-old', ipAddress: '10.0.0.9', loginTime: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), status: 'expired' }),
    ])
    render(<SessionsSection />)

    expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
    expect(screen.getByText('10.0.0.9')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Last 24 hours' }))

    expect(screen.getByText('192.168.1.100')).toBeInTheDocument()
    expect(screen.queryByText('10.0.0.9')).not.toBeInTheDocument()
  })

  it('uses shared status presentation and detail drawer', async () => {
    mockLoadedSessions()
    render(<SessionsSection />)

    expect(screen.getByText('active')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('row', { name: 'Show session details for Alice Smith' }))

    const drawer = screen.getByRole('dialog', { name: 'Session detail' })
    expect(drawer).toHaveTextContent('Alice Smith')
    expect(drawer).toHaveTextContent('Engineering')
    expect(drawer).toHaveTextContent('192.168.1.100')
    expect(drawer).toHaveTextContent('Test Browser')
  })

  it('shows shared empty and retryable error states', async () => {
    mockLoadedSessions([])
    const { rerender } = render(<SessionsSection />)
    expect(screen.getByText('No sessions found')).toBeInTheDocument()

    const refetch = vi.fn()
    vi.mocked(useSessions).mockReturnValue({ data: undefined, isLoading: false, error: new Error('sessions unavailable'), refetch })
    rerender(<SessionsSection />)

    expect(screen.getByRole('alert')).toHaveTextContent('sessions unavailable')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
