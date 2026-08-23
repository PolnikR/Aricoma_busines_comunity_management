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
  id: 'user-1', email: 'alice@example.com', name: 'Alice Smith', organizationId: 'org-1', roleIds: ['role-admin'], status: 'active',
  lastLogin: new Date('2026-08-23T08:00:00Z'), createdAt: new Date('2026-08-20T10:00:00Z'), updatedAt: new Date('2026-08-20T10:00:00Z'),
}

function mockLoadedUsers(users: User[] = [user]) {
  vi.mocked(useUsers).mockReturnValue({ data: users, isLoading: false, error: null, refetch: vi.fn() })
  vi.mocked(useRoles).mockReturnValue({ data: [{ id: 'role-admin', name: 'Administrator', description: 'Admin', permissionIds: [], organizationId: 'org-1', createdAt: new Date(), updatedAt: new Date() }], isLoading: false, error: null, refetch: vi.fn() })
  vi.mocked(useOrganizations).mockReturnValue({ data: [{ id: 'org-1', name: 'Engineering', description: 'Engineering', status: 'active', createdAt: new Date(), updatedAt: new Date() }], isLoading: false, error: null, refetch: vi.fn() })
}

function renderSection(overrides?: Partial<Parameters<typeof UsersSection>[0]>) {
  const props: Parameters<typeof UsersSection>[0] = { entityId: null, tabId: null, onEntityChange: vi.fn(), onTabChange: vi.fn(), ...overrides }
  render(<UsersSection {...props} />)
  return props
}

describe('UsersSection', () => {
  it('keeps shared table search and opens a user through the URL entity callback', async () => {
    mockLoadedUsers([user, { ...user, id: 'user-2', name: 'Bob Jones', email: 'bob@example.com', status: 'inactive', roleIds: [] }])
    const props = renderSection()

    expect(screen.getByLabelText('Users')).toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search users' }), 'bob@')
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('row', { name: 'Open user Bob Jones' }))
    expect(props.onEntityChange).toHaveBeenCalledWith('user-2')
  })

  it('opens a Keycloak-style full user management page with nested tabs', async () => {
    mockLoadedUsers()
    const props = renderSection({ entityId: 'user-1', tabId: 'details' })

    expect(screen.getByRole('heading', { name: 'Alice Smith' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'User management sections' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByDisplayValue('Engineering')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Credentials' }))
    expect(props.onTabChange).toHaveBeenCalledWith('credentials')
    await userEvent.click(screen.getByRole('button', { name: 'Users' }))
    expect(props.onEntityChange).toHaveBeenCalledWith(null)
  })

  it('shows available role mappings and truthful empty states for unsupported user areas', () => {
    mockLoadedUsers()
    const { rerender } = render(<UsersSection entityId="user-1" tabId="role-mappings" onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByLabelText('User role mappings')).toBeInTheDocument()
    expect(screen.getByText('Administrator')).toBeInTheDocument()

    rerender(<UsersSection entityId="user-1" tabId="credentials" onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByText('Keycloak credentials data is not connected yet.')).toBeInTheDocument()
  })

  it('opens the add-user design workflow but keeps persistence gated', async () => {
    mockLoadedUsers()
    renderSection()
    await userEvent.click(screen.getByRole('button', { name: 'Add user' }))
    expect(screen.getByRole('dialog', { name: 'Add user' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create user' })).toBeDisabled()
  })

  it('shows shared empty and retryable error states', async () => {
    mockLoadedUsers([])
    const { rerender } = render(<UsersSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByText('No users found')).toBeInTheDocument()

    const refetch = vi.fn()
    vi.mocked(useUsers).mockReturnValue({ data: undefined, isLoading: false, error: new Error('users unavailable'), refetch })
    rerender(<UsersSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
