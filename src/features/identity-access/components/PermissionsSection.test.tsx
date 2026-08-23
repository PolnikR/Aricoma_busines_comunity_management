import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { PermissionsSection } from './PermissionsSection'
import { usePermissions } from '../hooks/usePermissions'
import { useRoles } from '../hooks/useRoles'
import type { Permission } from '../models/identityTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/usePermissions', () => ({ usePermissions: vi.fn() }))
vi.mock('../hooks/useRoles', () => ({ useRoles: vi.fn() }))

const permission: Permission = {
  id: 'perm-users',
  name: 'Manage Users',
  description: 'Create, edit, delete users',
  category: 'admin',
  createdAt: new Date('2026-08-20T10:00:00Z'),
}

function mockLoadedPermissions(permissions: Permission[] = [permission]) {
  vi.mocked(usePermissions).mockReturnValue({ data: permissions, isLoading: false, error: null, refetch: vi.fn() })
  vi.mocked(useRoles).mockReturnValue({
    data: [{ id: 'role-admin', name: 'Administrator', description: '', permissionIds: ['perm-users'], organizationId: 'org-1', createdAt: new Date(), updatedAt: new Date() }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
}

describe('PermissionsSection', () => {
  it('renders a read-only shared table and filters permissions', async () => {
    mockLoadedPermissions([
      permission,
      { ...permission, id: 'perm-recovery', name: 'Execute Recovery', description: 'Execute recovery plans', category: 'recovery' },
    ])
    render(<PermissionsSection />)

    expect(screen.getByText('Read-only')).toBeInTheDocument()
    expect(screen.getByLabelText('Permissions')).toBeInTheDocument()
    expect(screen.getByText('Manage Users')).toBeInTheDocument()
    expect(screen.getByText('Execute Recovery')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search permissions' }), 'recovery')

    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument()
    expect(screen.getByText('Execute Recovery')).toBeInTheDocument()
  })

  it('opens shared permission details including roles using the permission', async () => {
    mockLoadedPermissions()
    render(<PermissionsSection />)

    await userEvent.click(screen.getByRole('row', { name: 'Show details for Manage Users' }))

    const drawer = screen.getByRole('dialog', { name: 'Permission detail' })
    expect(drawer).toHaveTextContent('Create, edit, delete users')
    expect(drawer).toHaveTextContent('admin')
    expect(drawer).toHaveTextContent('Administrator')
  })

  it('shows shared empty and retryable error states', async () => {
    mockLoadedPermissions([])
    const { rerender } = render(<PermissionsSection />)
    expect(screen.getByText('No permissions found')).toBeInTheDocument()

    const refetch = vi.fn()
    vi.mocked(usePermissions).mockReturnValue({ data: undefined, isLoading: false, error: new Error('permissions unavailable'), refetch })
    rerender(<PermissionsSection />)

    expect(screen.getByRole('alert')).toHaveTextContent('permissions unavailable')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
