import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrganizationsSection } from './OrganizationsSection'
import { useOrganizations } from '../hooks/useOrganizations'
import { useUsers } from '../hooks/useUsers'
import { useRoles } from '../hooks/useRoles'
import type { Organization } from '../models/identityTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useOrganizations', () => ({ useOrganizations: vi.fn() }))
vi.mock('../hooks/useUsers', () => ({ useUsers: vi.fn() }))
vi.mock('../hooks/useRoles', () => ({ useRoles: vi.fn() }))

const organization: Organization = {
  id: 'org-1',
  name: 'Engineering',
  description: 'Core platform engineering team',
  status: 'active',
  createdAt: new Date('2026-08-20T10:00:00Z'),
  updatedAt: new Date('2026-08-20T10:00:00Z'),
}

function mockLoadedOrganizations(organizations: Organization[] = [organization]) {
  vi.mocked(useOrganizations).mockReturnValue({ data: organizations, isLoading: false, error: null, refetch: vi.fn() })
  vi.mocked(useUsers).mockReturnValue({
    data: [{
      id: 'user-1', email: 'alice@example.com', name: 'Alice Smith', organizationId: 'org-1', roleIds: ['role-admin'], status: 'active',
      createdAt: new Date(), updatedAt: new Date(),
    }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
  vi.mocked(useRoles).mockReturnValue({
    data: [{
      id: 'role-admin', name: 'Administrator', description: 'Admin', permissionIds: [], organizationId: 'org-1',
      createdAt: new Date(), updatedAt: new Date(),
    }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  })
}

describe('OrganizationsSection', () => {
  it('renders current counts and filters organizations through shared table state', async () => {
    mockLoadedOrganizations([
      organization,
      { ...organization, id: 'org-2', name: 'Operations', description: 'Operations team', status: 'inactive' },
    ])
    render(<OrganizationsSection />)

    expect(screen.getByLabelText('Organizations')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add organization' })).toBeDisabled()
    expect(screen.getByText('Engineering')).toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search organizations' }), 'operations')

    expect(screen.queryByText('Engineering')).not.toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
  })

  it('opens shared organization details with members, roles, and status', async () => {
    mockLoadedOrganizations()
    render(<OrganizationsSection />)

    await userEvent.click(screen.getByRole('row', { name: 'Show details for Engineering' }))

    const drawer = screen.getByRole('dialog', { name: 'Organization detail' })
    expect(drawer).toHaveTextContent('Core platform engineering team')
    expect(drawer).toHaveTextContent('Alice Smith')
    expect(drawer).toHaveTextContent('Administrator')
    expect(drawer).toHaveTextContent('active')
  })

  it('shows the shared empty state when no organizations exist', () => {
    mockLoadedOrganizations([])
    render(<OrganizationsSection />)

    expect(screen.getByText('No organizations found')).toBeInTheDocument()
  })

  it('shows a retryable shared request error', async () => {
    const refetch = vi.fn()
    vi.mocked(useOrganizations).mockReturnValue({ data: undefined, isLoading: false, error: new Error('organizations unavailable'), refetch })
    vi.mocked(useUsers).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() })
    vi.mocked(useRoles).mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() })

    render(<OrganizationsSection />)

    expect(screen.getByRole('alert')).toHaveTextContent('organizations unavailable')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
