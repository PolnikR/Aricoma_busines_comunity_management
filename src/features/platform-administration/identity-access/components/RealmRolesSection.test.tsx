import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RealmRolesSection } from './RealmRolesSection'
import { useGetRolesPermissions } from '@/generated/query/identity-access/identity-access.gen'
import { useUsers } from '../hooks/useUsers'
import type { IdentityRoleRecord } from '../model/rolesPermissionsTypes'

import { detailNavigationLabels, detailSectionsFields, detailSectionsLabels } from '@/test-utils/detailView'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/identity-access/identity-access.gen', () => ({ useGetRolesPermissions: vi.fn() }))
// Guard: the section must not read mock Users data any more.
vi.mock('../hooks/useUsers', () => ({ useUsers: vi.fn() }))

const admin: IdentityRoleRecord = {
  id: 'platform-admin',
  name: 'platform-admin',
  description: 'Manages platform configuration.',
  permissions: ['providers.read', 'providers.write', 'users.read'],
  users: ['alice', 'bob'],
  userCount: 2,
  clientId: 'abco-api',
}
const viewer: IdentityRoleRecord = { id: 'viewer', name: 'viewer', description: '', permissions: [], users: [], userCount: 0, clientId: 'abco-api' }
// Keycloak membership lookup failed: users/userCount are placeholders, not real values.
const operator: IdentityRoleRecord = { id: 'operator', name: 'operator', description: 'Runs recoveries.', permissions: ['runs.read'], users: [], userCount: 0, clientId: null }

function mockRoles(state: { roles?: IdentityRoleRecord[], isLoading?: boolean, isFetching?: boolean, error?: Error | null, refetch?: () => void }) {
  vi.mocked(useGetRolesPermissions).mockReturnValue({
    data: state.roles ? { roles: state.roles, permissions: [] } : undefined,
    isLoading: state.isLoading ?? false,
    isFetching: state.isFetching ?? false,
    error: state.error ?? null,
    refetch: state.refetch ?? vi.fn(),
  } as never)
}

function cellsOf(rowName: string) {
  return within(screen.getByRole('row', { name: rowName })).getAllByRole('cell').map(cell => cell.textContent)
}

async function openRole(name: string) {
  await userEvent.click(screen.getByRole('row', { name: `Open application role ${name}` }))
  return within(screen.getByRole('dialog', { name: 'Application role detail' }))
}

function drawerFields() {
  return detailSectionsFields(screen.getByRole('dialog', { name: 'Application role detail' }))
}

describe('RealmRolesSection', () => {
  it('keeps search and column labels visible while API rows load', () => {
    mockRoles({ isLoading: true })
    render(<RealmRolesSection />)

    expect(screen.getByRole('searchbox', { name: 'Search roles' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Role' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Permissions' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Users' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveAttribute('aria-busy', 'true')
  })

  it('renders API roles with description, permission count and userCount in the shared table layout', () => {
    mockRoles({ roles: [admin, viewer] })
    render(<RealmRolesSection />)

    const [rolesSurface, rolesTable] = screen.getAllByLabelText('Application roles')
    if (!rolesSurface || !rolesTable) throw new Error('Expected application roles surface and table')
    const scrollRegion = rolesTable.parentElement
    if (!scrollRegion) throw new Error('Expected application roles table scroll region')
    expect(rolesSurface).toHaveClass('grid', 'grid-rows-[auto_minmax(0,1fr)_auto]')
    expect(scrollRegion).toHaveClass('custom-scrollbar', 'min-h-0', 'overflow-y-auto')
    expect(scrollRegion).not.toContainElement(screen.getByLabelText('Rows per page'))

    expect(cellsOf('Open application role platform-admin')).toEqual(['platform-adminManages platform configuration.', '3', '2'])
    expect(cellsOf('Open application role viewer')).toEqual(['viewer', '0', '0'])
    expect(screen.queryByText(/providers\.read/)).not.toBeInTheDocument()
  })

  it('shows an em dash instead of 0 users when Keycloak membership is unavailable', () => {
    mockRoles({ roles: [operator] })
    render(<RealmRolesSection />)

    expect(cellsOf('Open application role operator')).toEqual(['operatorRuns recoveries.', '1', '—'])
  })

  it.each([
    ['name', 'viewer', 'viewer'],
    ['description', 'recoveries', 'operator'],
    ['permission', 'providers.write', 'platform-admin'],
    ['user', 'alice', 'platform-admin'],
  ])('filters roles by %s', async (_field, query, expected) => {
    mockRoles({ roles: [admin, viewer, operator] })
    render(<RealmRolesSection />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search roles' }), query)

    const rows = screen.getAllByRole('row', { name: /^Open application role / })
    expect(rows.map(row => row.getAttribute('aria-label'))).toEqual([`Open application role ${expected}`])
  })

  it('shows the filtered-empty message when no role matches the search', async () => {
    mockRoles({ roles: [admin] })
    render(<RealmRolesSection />)

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search roles' }), 'nothing-matches')
    expect(screen.getByText('No roles match your search.')).toBeInTheDocument()
  })

  it('shows the empty state when the API returns no roles', () => {
    mockRoles({ roles: [] })
    render(<RealmRolesSection />)

    expect(screen.getByText('No roles found')).toBeInTheDocument()
  })

  it('shows a retryable error state', async () => {
    const refetch = vi.fn()
    mockRoles({ error: new Error('roles unavailable'), refetch })
    render(<RealmRolesSection />)

    expect(screen.getByText('Roles could not be loaded')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('keeps pagination available when cached roles remain after a refresh error', () => {
    mockRoles({ roles: [admin], error: new Error('background refresh failed') })
    render(<RealmRolesSection />)

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument()
  })

  it('opens a read-only DetailView with every role field and highlights the selected row', async () => {
    mockRoles({ roles: [admin, viewer] })
    render(<RealmRolesSection />)

    const drawer = await openRole('platform-admin')

    expect(screen.getByRole('row', { name: 'Open application role platform-admin' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('row', { name: 'Open application role viewer' })).toHaveAttribute('aria-selected', 'false')
    const header = drawer.getByRole('heading', { level: 2, name: 'platform-admin' }).closest('header')
    expect(header).toHaveTextContent('Application role')
    // The client ID is a field in Overview, not a header badge.
    expect(header).not.toHaveTextContent('abco-api')
    // One flat Overview in the original drawer order; permissions, users and client ID included.
    const dialog = screen.getByRole('dialog', { name: 'Application role detail' })
    expect(detailNavigationLabels(dialog)).toEqual(['Overview'])
    expect(within(dialog).getAllByRole('region')).toHaveLength(1)
    expect(within(dialog).getByRole('region', { name: 'Overview' })).toBeInTheDocument()
    expect(detailSectionsLabels(dialog)).toEqual(['Role name', 'Description', 'Client ID', 'Users count', 'Permissions', 'Users in role'])
    expect(drawerFields()).toEqual({
      'Role name': 'platform-admin',
      Description: 'Manages platform configuration.',
      'Client ID': 'abco-api',
      'Users count': '2',
      Permissions: 'providers.readproviders.writeusers.read',
      'Users in role': 'alicebob',
    })
  })

  it('renders unknown membership as an em dash when clientId is null', async () => {
    mockRoles({ roles: [operator] })
    render(<RealmRolesSection />)

    await openRole('operator')

    expect(drawerFields()).toMatchObject({ 'Client ID': 'Not set', 'Users count': '—', 'Users in role': '—', Permissions: 'runs.read' })
  })

  it('distinguishes a known-empty role from missing values', async () => {
    mockRoles({ roles: [viewer] })
    render(<RealmRolesSection />)

    await openRole('viewer')

    expect(drawerFields()).toMatchObject({ Description: 'Not set', 'Users count': '0', Permissions: 'Not set', 'Users in role': 'No users assigned' })
  })

  it('has no Edit/Delete/Actions buttons, no role tabs and closes the detail', async () => {
    mockRoles({ roles: [admin] })
    render(<RealmRolesSection />)

    expect(screen.queryByRole('button', { name: /create|add|edit|delete|assign|remove|actions/i })).not.toBeInTheDocument()
    const drawer = await openRole('platform-admin')
    const dialog = screen.getByRole('dialog', { name: 'Application role detail' })
    const header = drawer.getByRole('heading', { level: 2 }).closest('header')
    if (!header) throw new Error('Expected the detail header')
    expect(within(header).getAllByRole('button').map(button => button.getAttribute('aria-label') ?? button.textContent)).toEqual(['Application role help', 'Close application role detail'])
    expect(dialog.querySelector('footer')).toBeNull()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Application role help' }))
    expect(screen.getByRole('dialog', { name: 'What an application role is' })).toHaveTextContent('Permissions')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /associated roles|attributes|users in role/i })).not.toBeInTheDocument()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Close application role detail' }))
    expect(screen.queryByRole('dialog', { name: 'Application role detail' })).not.toBeInTheDocument()
  })

  it('does not read mock Users data', async () => {
    mockRoles({ roles: [admin, operator] })
    render(<RealmRolesSection />)
    await openRole('platform-admin')

    expect(useUsers).not.toHaveBeenCalled()
  })
})
