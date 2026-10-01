import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { UsersSection } from './UsersSection'
import { useGetUsers } from '@/generated/query/identity-access/identity-access.gen'
import type { UserRecord } from '@/generated/query/zod'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/identity-access/identity-access.gen', () => ({ useGetUsers: vi.fn() }))

const SESSION_START = '2026-09-30T08:15:00Z'
const alice: UserRecord = {
  id: 'kc-alice',
  user: 'Alice Smith',
  username: 'alice',
  email: 'alice@example.com',
  emailVerified: true,
  createdAt: '2026-01-02T10:00:00Z',
  roles: ['platform-admin', 'recovery-operator'],
  status: 'Active',
  activeSessionStart: SESSION_START,
}
const bob: UserRecord = {
  id: 'kc-bob',
  user: 'Bob Jones',
  username: 'bob',
  email: null,
  roles: [],
  status: 'Disabled',
  activeSessionStart: null,
}

function expectedTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

function mockUsers(state: { users?: UserRecord[], isLoading?: boolean, isFetching?: boolean, error?: Error | null, refetch?: () => void }) {
  vi.mocked(useGetUsers).mockReturnValue({
    data: state.users ? { users: state.users } : undefined,
    isLoading: state.isLoading ?? false,
    isFetching: state.isFetching ?? false,
    error: state.error ?? null,
    refetch: state.refetch ?? vi.fn(),
  } as never)
}

function rowFor(name: string) {
  const row = screen.getByText(name).closest('tr')
  if (!row) throw new Error(`Expected a table row for ${name}`)
  return within(row)
}

describe('UsersSection', () => {
  beforeEach(() => { vi.mocked(useGetUsers).mockReset() })

  it('renders users returned by GET /get_users with the read-only columns', () => {
    mockUsers({ users: [alice, bob] })
    render(<UsersSection />)

    expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual(['User', 'Username', 'Roles', 'Status', 'Active session start'])
    expect(screen.queryByRole('columnheader', { name: 'Last login' })).not.toBeInTheDocument()
    const aliceRow = rowFor('Alice Smith')
    expect(aliceRow.getByText('alice@example.com')).toBeInTheDocument()
    expect(aliceRow.getByText('alice')).toBeInTheDocument()
    expect(aliceRow.getByText('Active')).toBeInTheDocument()
    expect(rowFor('Bob Jones').getByText('Disabled')).toBeInTheDocument()
  })

  it('renders roles as a list and an em dash when the user has none', () => {
    mockUsers({ users: [alice, bob] })
    render(<UsersSection />)

    expect(rowFor('Alice Smith').getByText('platform-admin, recovery-operator')).toBeInTheDocument()
    expect(rowFor('Bob Jones').getAllByText('—')).toHaveLength(2)
  })

  it('formats the active session start and shows an em dash when it is null', () => {
    mockUsers({ users: [alice, bob] })
    render(<UsersSection />)

    expect(rowFor('Alice Smith').getByText(expectedTimestamp(SESSION_START))).toBeInTheDocument()
    const bobCells = rowFor('Bob Jones').getAllByRole('cell')
    expect(bobCells.at(-1)).toHaveTextContent('—')
  })

  it('filters users with the shared table search', async () => {
    mockUsers({ users: [alice, bob] })
    render(<UsersSection />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search users' }), 'bob')
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()

    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search users' }))
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search users' }), 'recovery-operator')
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.queryByText('Bob Jones')).not.toBeInTheDocument()
  })

  it('keeps table chrome visible and skeletonizes rows while loading', () => {
    mockUsers({ isLoading: true, isFetching: true })
    const { container } = render(<UsersSection />)

    expect(screen.getByRole('searchbox', { name: 'Search users' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'User' })).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByText('No users found')).not.toBeInTheDocument()
  })

  it('shows a load error with a working retry', async () => {
    const refetch = vi.fn()
    mockUsers({ error: new Error('Keycloak unavailable'), refetch })
    render(<UsersSection />)

    expect(screen.getByText('Users could not be loaded')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state when the API returns no users', () => {
    mockUsers({ users: [] })
    render(<UsersSection />)

    expect(screen.getByText('No users found')).toBeInTheDocument()
  })

  it('exposes no user management actions', () => {
    mockUsers({ users: [alice, bob] })
    render(<UsersSection />)

    expect(screen.queryByRole('button', { name: /add user|edit|delete/i })).not.toBeInTheDocument()
  })
})
