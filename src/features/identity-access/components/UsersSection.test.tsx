import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UsersSection } from './UsersSection'
import { useUsers } from '../hooks/useUsers'
import { useRoles } from '../hooks/useRoles'
import { useOrganizations } from '../hooks/useOrganizations'
import type { User } from '../models/identityTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useUsers', () => ({ useUsers: vi.fn() }))
vi.mock('../hooks/useRoles', () => ({ useRoles: vi.fn() }))
vi.mock('../hooks/useOrganizations', () => ({ useOrganizations: vi.fn() }))

const user: User = {
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice Smith',
  organizationId: 'org-1',
  roleIds: ['role-admin'],
  status: 'active',
  lastLogin: new Date('2026-08-23T08:00:00Z'),
  createdAt: new Date('2026-08-20T10:00:00Z'),
  updatedAt: new Date('2026-08-20T10:00:00Z'),
}

function mockLoadedUsers(users: User[] = [user]) {
  vi.mocked(useUsers).mockReturnValue({ data: users, isLoading: false, error: null, refetch: vi.fn() })
  vi.mocked(useRoles).mockReturnValue({
    data: [{
      id: 'role-admin', name: 'Administrator', description: 'Admin', permissionIds: [], organizationId: 'org-1',
      createdAt: new Date(), updatedAt: new Date(),
    }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
  vi.mocked(useOrganizations).mockReturnValue({
    data: [{ id: 'org-1', name: 'Engineering', description: 'Engineering', status: 'active', createdAt: new Date(), updatedAt: new Date() }],
    isLoading: false,
    error: null,
  })
}

describe('UsersSection', () => {
  it('renders shared table content and filters by name or email', async () => {
    mockLoadedUsers([
      user,
      { ...user, id: 'user-2', name: 'Bob Jones', email: 'bob@example.com', status: 'inactive', roleIds: [] },
    ])
    render(<UsersSection />)

    expect(screen.getByLabelText('Users')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add user' })).toBeDisabled()
    expect(screen.getByText('Alice Smith')).toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search users' }), 'bob@')

    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
    expect(screen.getByText('Bob Jones')).toBeInTheDocument()
  })

  it('uses shared status badges and opens the user detail drawer', async () => {
    mockLoadedUsers()
    render(<UsersSection />)

    expect(screen.getByText('active')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('row', { name: 'Show details for Alice Smith' }))

    const drawer = screen.getByRole('dialog', { name: 'User detail' })
    expect(drawer).toHaveTextContent('alice@example.com')
    expect(drawer).toHaveTextContent('Engineering')
    expect(drawer).toHaveTextContent('Administrator')
    expect(drawer).toHaveTextContent('active')
  })

  it('shows the shared empty state when no users exist', () => {
    mockLoadedUsers([])
    render(<UsersSection />)

    expect(screen.getByText('No users found')).toBeInTheDocument()
  })

  it('shows a retryable shared request error', async () => {
    const refetch = vi.fn()
    vi.mocked(useUsers).mockReturnValue({ data: undefined, isLoading: false, error: new Error('users unavailable'), refetch })
    vi.mocked(useRoles).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() })
    vi.mocked(useOrganizations).mockReturnValue({ data: [], isLoading: false, error: null })

    render(<UsersSection />)

    expect(screen.getByRole('alert')).toHaveTextContent('users unavailable')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
