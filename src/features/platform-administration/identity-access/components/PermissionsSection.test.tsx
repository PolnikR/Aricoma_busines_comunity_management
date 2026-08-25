import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PermissionsSection } from './PermissionsSection'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const useRolesPermissionsMock = vi.hoisted(() => ({ useRolesPermissions: vi.fn() }))
vi.mock('../hooks/useRolesPermissions', () => useRolesPermissionsMock)

describe('PermissionsSection', () => {
  it('renders API permissions and roles without reusing ABCO permission mocks', () => {
    useRolesPermissionsMock.useRolesPermissions.mockReturnValue({
      data: { roles: [{ id: 'platform-admin', name: 'platform-admin', permissions: ['providers.read'] }], permissions: ['providers.read'] },
      isLoading: false, error: null, refetch: vi.fn(),
    })
    render(<PermissionsSection />)

    expect(screen.getByText('providers.read')).toBeInTheDocument()
    expect(screen.getByText('platform-admin')).toBeInTheDocument()
    expect(screen.queryByText('Manage Users')).not.toBeInTheDocument()
    expect(screen.queryByText('Execute Recovery')).not.toBeInTheDocument()
  })

  it('does not render redundant top-level section header', () => {
    useRolesPermissionsMock.useRolesPermissions.mockReturnValue({ data: { roles: [], permissions: [] }, isLoading: false, error: null, refetch: vi.fn() })
    render(<PermissionsSection />)
    expect(screen.queryByRole('heading', { name: 'Permissions' })).not.toBeInTheDocument()
  })
})
