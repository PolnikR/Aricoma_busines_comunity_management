import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RealmRolesSection } from './RealmRolesSection'
import { useRoles } from '../hooks/useRoles'
import { usePermissions } from '../hooks/usePermissions'
import { useUsers } from '../hooks/useUsers'
import type { Role } from '../models/identityTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useRoles', () => ({ useRoles: vi.fn() }))
vi.mock('../hooks/usePermissions', () => ({ usePermissions: vi.fn() }))
vi.mock('../hooks/useUsers', () => ({ useUsers: vi.fn() }))

const role: Role = {
  id: 'role-admin',
  name: 'Administrator',
  description: 'Full system access',
  permissionIds: ['perm-users', 'perm-recovery'],
  organizationId: 'org-1',
  createdAt: new Date('2026-08-20T10:00:00Z'),
  updatedAt: new Date('2026-08-20T10:00:00Z'),
}

function mockLoadedRoles(roles: Role[] = [role]) {
  vi.mocked(useRoles).mockReturnValue({ data: roles, isLoading: false, error: null, refetch: vi.fn() })
  vi.mocked(usePermissions).mockReturnValue({
    data: [
      { id: 'perm-users', name: 'Manage Users', description: '', category: 'admin', createdAt: new Date() },
      { id: 'perm-recovery', name: 'Execute Recovery', description: '', category: 'recovery', createdAt: new Date() },
    ],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
  vi.mocked(useUsers).mockReturnValue({
    data: [{
      id: 'user-1', email: 'admin@example.com', name: 'Admin User', organizationId: 'org-1', roleIds: ['role-admin'],
      status: 'active', createdAt: new Date(), updatedAt: new Date(),
    }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
}

describe('RealmRolesSection', () => {
  it('uses the shared table pattern and filters roles by search', async () => {
    mockLoadedRoles([
      role,
      { ...role, id: 'role-viewer', name: 'Viewer', description: 'Read-only access', permissionIds: [] },
    ])
    render(<RealmRolesSection />)

    expect(screen.getByLabelText('Realm roles')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add role' })).toBeDisabled()
    expect(screen.getByText('Administrator')).toBeInTheDocument()
    expect(screen.getByText('Viewer')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search roles' }), 'viewer')

    expect(screen.queryByText('Administrator')).not.toBeInTheDocument()
    expect(screen.getByText('Viewer')).toBeInTheDocument()
  })

  it('opens the shared detail drawer with current mock role data', async () => {
    mockLoadedRoles()
    render(<RealmRolesSection />)

    await userEvent.click(screen.getByRole('row', { name: 'Show details for Administrator' }))

    const drawer = screen.getByRole('dialog', { name: 'Role detail' })
    expect(drawer).toHaveTextContent('Administrator')
    expect(drawer).toHaveTextContent('Full system access')
    expect(drawer).toHaveTextContent('Manage Users, Execute Recovery')
    expect(drawer).toHaveTextContent('1')
  })

  it('shows the shared empty state when there are no roles', () => {
    mockLoadedRoles([])
    render(<RealmRolesSection />)

    expect(screen.getByText('No roles found')).toBeInTheDocument()
  })

  it('shows a retryable shared request error', async () => {
    const refetch = vi.fn()
    vi.mocked(useRoles).mockReturnValue({ data: undefined, isLoading: false, error: new Error('roles unavailable'), refetch })
    vi.mocked(usePermissions).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() })
    vi.mocked(useUsers).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() })

    render(<RealmRolesSection />)

    expect(screen.getByRole('alert')).toHaveTextContent('roles unavailable')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
