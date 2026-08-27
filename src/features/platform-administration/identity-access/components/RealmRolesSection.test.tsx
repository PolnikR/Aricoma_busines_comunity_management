import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RealmRolesSection } from './RealmRolesSection'
import { useRolesPermissions } from '../hooks/useRolesPermissions'
import { useUsers } from '../hooks/useUsers'
import type { IdentityRoleRecord } from '../model/rolesPermissionsTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useRolesPermissions', () => ({ useRolesPermissions: vi.fn() }))
vi.mock('../hooks/useUsers', () => ({ useUsers: vi.fn() }))

const role: IdentityRoleRecord = { id: 'role-admin', name: 'Administrator', permissions: ['providers.read'] }

function mockLoadedRoles(roles: IdentityRoleRecord[] = [role]) {
  vi.mocked(useRolesPermissions).mockReturnValue({ data: { roles, permissions: ['providers.read'] }, isLoading: false, error: null, refetch: vi.fn() } as never)
  vi.mocked(useUsers).mockReturnValue({ data: [{ id: 'user-1', email: 'admin@example.com', name: 'Admin User', organizationId: 'org-1', roleIds: ['role-admin'], status: 'active', createdAt: new Date(), updatedAt: new Date() }], isLoading: false, error: null, refetch: vi.fn() })
}

function renderSection(overrides?: Partial<Parameters<typeof RealmRolesSection>[0]>) {
  const props: Parameters<typeof RealmRolesSection>[0] = { entityId: null, tabId: null, onEntityChange: vi.fn(), onTabChange: vi.fn(), ...overrides }
  render(<RealmRolesSection {...props} />)
  return props
}

describe('RealmRolesSection', () => {
  it('keeps role search and column labels visible while API rows load', () => {
    vi.mocked(useRolesPermissions).mockReturnValue({ data: undefined, isLoading: true, error: null, refetch: vi.fn() } as never)
    vi.mocked(useUsers).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() })
    renderSection()

    expect(screen.getByRole('searchbox', { name: 'Search roles' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Role name' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Permissions' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
  })

  it('uses the shared list/search pattern without generic permission counts', async () => {
    mockLoadedRoles([role, { ...role, id: 'role-viewer', name: 'Viewer', permissions: [] }])
    const props = renderSection()

    const rolesTable = screen.getByLabelText('Realm roles')
    const scrollRegion = rolesTable.parentElement
    expect(rolesTable).toBeInTheDocument()
    expect(scrollRegion).toHaveClass('min-h-0', 'flex-1', 'lg:overflow-y-auto')
    expect(scrollRegion).not.toContainElement(screen.getByLabelText('Rows per page'))
    expect(screen.queryByText('Manage realm-level roles')).not.toBeInTheDocument()
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
    expect(screen.getByDisplayValue('Administrator')).toBeInTheDocument()
    expect(screen.getByDisplayValue('providers.read')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Users in role' }))
    expect(props.onTabChange).toHaveBeenCalledWith('users-in-role')
  })

  it('uses current users for Users in role and never maps ABCO permissionIds into Keycloak permissions', () => {
    mockLoadedRoles()
    const { rerender } = render(<RealmRolesSection entityId="role-admin" tabId="users-in-role" onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByLabelText('Users in realm role')).toBeInTheDocument()
    expect(screen.getByText('Admin User')).toBeInTheDocument()

    rerender(<RealmRolesSection entityId="role-admin" tabId="permissions" onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByText(/role permissions are shown in the role details/i)).toBeInTheDocument()
    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument()
  })

  it('shows shared empty and retryable request states', async () => {
    mockLoadedRoles([])
    const { rerender } = render(<RealmRolesSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    expect(screen.getByText('No roles found')).toBeInTheDocument()

    const refetch = vi.fn()
    vi.mocked(useRolesPermissions).mockReturnValue({ data: undefined, isLoading: false, error: new Error('roles unavailable'), refetch } as never)
    rerender(<RealmRolesSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('keeps pagination available when cached roles remain after a refresh error', () => {
    vi.mocked(useRolesPermissions).mockReturnValue({
      data: { roles: [role], permissions: ['providers.read'] },
      isLoading: false,
      error: new Error('background refresh failed'),
      refetch: vi.fn(),
    } as never)
    vi.mocked(useUsers).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() })

    renderSection()

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument()
  })
})
