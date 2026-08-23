import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RealmRolesSection } from './RealmRolesSection'
import { useRoles } from '../hooks/useRoles'
import { useUsers } from '../hooks/useUsers'
import type { Role } from '../models/identityTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useRoles', () => ({ useRoles: vi.fn() }))
vi.mock('../hooks/useUsers', () => ({ useUsers: vi.fn() }))

const role: Role = {
  id: 'role-admin', name: 'Administrator', description: 'Full system access', permissionIds: ['perm-users'], organizationId: 'org-1',
  createdAt: new Date('2026-08-20T10:00:00Z'), updatedAt: new Date('2026-08-20T10:00:00Z'),
}

function mockLoadedRoles(roles: Role[] = [role]) {
  vi.mocked(useRoles).mockReturnValue({ data: roles, isLoading: false, error: null, refetch: vi.fn() })
  vi.mocked(useUsers).mockReturnValue({ data: [{ id: 'user-1', email: 'admin@example.com', name: 'Admin User', organizationId: 'org-1', roleIds: ['role-admin'], status: 'active', createdAt: new Date(), updatedAt: new Date() }], isLoading: false, error: null, refetch: vi.fn() })
}

function renderSection(overrides?: Partial<Parameters<typeof RealmRolesSection>[0]>) {
  const props: Parameters<typeof RealmRolesSection>[0] = { entityId: null, tabId: null, onEntityChange: vi.fn(), onTabChange: vi.fn(), ...overrides }
  render(<RealmRolesSection {...props} />)
  return props
}

describe('RealmRolesSection', () => {
  it('uses the shared list/search pattern without generic permission counts', async () => {
    mockLoadedRoles([role, { ...role, id: 'role-viewer', name: 'Viewer', description: 'Read-only access', permissionIds: [] }])
    const props = renderSection()

    const rolesTable = screen.getByLabelText('Realm roles')
    const scrollRegion = rolesTable.parentElement
    expect(rolesTable).toBeInTheDocument()
    expect(scrollRegion).toHaveClass('min-h-0', 'flex-1', 'lg:overflow-y-auto')
    expect(scrollRegion).not.toContainElement(screen.getByLabelText('Rows per page'))
    expect(screen.queryByText('Permissions')).not.toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search roles' }), 'viewer')
    expect(screen.queryByText('Administrator')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('row', { name: 'Open realm role Viewer' }))
    expect(props.onEntityChange).toHaveBeenCalledWith('role-viewer')
  })

  it('opens a full role workspace with Keycloak-oriented tabs and current details', async () => {
    mockLoadedRoles()
    const props = renderSection({ entityId: 'role-admin', tabId: 'details' })

    expect(screen.getByRole('heading', { name: 'Administrator' })).toBeInTheDocument()
    expect(screen.getByRole('tablist', { name: 'Realm role sections' })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Full system access')).toBeInTheDocument()
    expect(screen.getByText('Composite-role metadata is not available in the current frontend contract.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Users in role' }))
    expect(props.onTabChange).toHaveBeenCalledWith('users-in-role')
  })

  it('uses current users for Users in role and never maps ABCO permissionIds into Keycloak permissions', () => {
    mockLoadedRoles()
    const { rerender } = render(<RealmRolesSection entityId="role-admin" tabId="users-in-role" onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByLabelText('Users in realm role')).toBeInTheDocument()
    expect(screen.getByText('Admin User')).toBeInTheDocument()

    rerender(<RealmRolesSection entityId="role-admin" tabId="permissions" onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByText(/existing ABCO application permission mock is intentionally not used/i)).toBeInTheDocument()
    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument()
  })

  it('shows shared empty and retryable request states', async () => {
    mockLoadedRoles([])
    const { rerender } = render(<RealmRolesSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByText('No roles found')).toBeInTheDocument()

    const refetch = vi.fn()
    vi.mocked(useRoles).mockReturnValue({ data: undefined, isLoading: false, error: new Error('roles unavailable'), refetch })
    rerender(<RealmRolesSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
