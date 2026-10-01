import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UsersSection } from './UsersSection'
import { IdentityAdminGatewayProvider } from '../services/IdentityAdminGatewayProvider'
import { createMockIdentityAdminGateway } from '../services/mockIdentityAdminGateway'
import type { IdentityAdminPreview } from '../services/identityAdminGateway'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

function renderSection(
  overrides?: Partial<Parameters<typeof UsersSection>[0]>,
  gateway = createMockIdentityAdminGateway(),
) {
  const props: Parameters<typeof UsersSection>[0] = { entityId: null, tabId: null, onEntityChange: vi.fn(), onTabChange: vi.fn(), ...overrides }
  const view = render(<IdentityAdminGatewayProvider gateway={gateway}><UsersSection {...props} /></IdentityAdminGatewayProvider>)
  return { ...props, ...view }
}

describe('UsersSection', () => {
  it('keeps table chrome visible and skeletonizes only user records during initial loading', () => {
    const gateway = createMockIdentityAdminGateway()
    gateway.getPreview = vi.fn(() => new Promise<IdentityAdminPreview>(() => undefined))

    const { container } = renderSection(undefined, gateway)

    expect(screen.getByRole('searchbox', { name: 'Search users' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'User' })).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByText('No users found')).not.toBeInTheDocument()
  })

  it('keeps the selected-user shell and field labels visible during initial loading', () => {
    const gateway = createMockIdentityAdminGateway()
    gateway.getPreview = vi.fn(() => new Promise<IdentityAdminPreview>(() => undefined))

    const { container } = renderSection({ entityId: 'user-1', tabId: 'details' }, gateway)

    expect(screen.getByRole('button', { name: 'Users' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Details' })).toBeInTheDocument()
    expect(screen.getByText('Username')).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(2)
    expect(screen.queryByText('Reading identity adapter data')).not.toBeInTheDocument()
  })

  it('keeps cached user details visible while a post-mutation refresh is pending', async () => {
    const gateway = createMockIdentityAdminGateway()
    const preview = await gateway.getPreview()
    const getPreview = vi.fn()
      .mockResolvedValueOnce(preview)
      .mockImplementation(() => new Promise<IdentityAdminPreview>(() => undefined))
    gateway.getPreview = getPreview

    renderSection({ entityId: 'user-1', tabId: 'credentials' }, gateway)
    const checkbox = await screen.findByRole('checkbox', { name: 'Require Verify Email' })
    await userEvent.click(checkbox)
    await waitFor(() => { expect(getPreview).toHaveBeenCalledTimes(2) })

    expect(screen.getByText('No credential values are stored or displayed in this preview.')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Require Verify Email' })).toBeInTheDocument()
  })


  it('keeps shared table search and opens a user through the URL entity callback', async () => {
    const props = renderSection()

    const [usersSurface, usersTable] = await screen.findAllByLabelText('Users')
    if (!usersSurface || !usersTable) throw new Error('Expected users surface and table')
    expect(await screen.findByText('Alice Smith')).toBeInTheDocument()
    const scrollRegion = usersTable.parentElement
    if (!scrollRegion) throw new Error('Expected users table scroll region')
    expect(usersSurface).toHaveClass('grid', 'grid-rows-[auto_minmax(0,1fr)_auto]')
    expect(usersTable).toBeInTheDocument()
    expect(scrollRegion).toHaveClass('custom-scrollbar', 'min-h-0', 'overflow-y-auto')
    expect(scrollRegion.parentElement).toBe(usersSurface)
    expect(scrollRegion).not.toContainElement(screen.getByLabelText('Rows per page'))
    expect(screen.queryByText('Search and manage users')).not.toBeInTheDocument()
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search users' }), 'bob@')
    expect(screen.queryByText('Alice Smith')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('row', { name: 'Open user Bob Jones' }))
    expect(props.onEntityChange).toHaveBeenCalledWith('user-2')
  })

  it('opens a Keycloak-style full user management page with nested tabs', async () => {
    const props = renderSection({ entityId: 'user-1', tabId: 'details' })

    expect(await screen.findByRole('heading', { name: 'Alice Smith' })).toBeInTheDocument()
    const tabs = within(screen.getByRole('tablist', { name: 'User management sections' }))
    expect(tabs.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Details', 'Credentials', 'Role mappings'])
    expect(screen.getByRole('tab', { name: 'Details' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Credentials' }))
    expect(props.onTabChange).toHaveBeenCalledWith('credentials')
    await userEvent.click(screen.getByRole('button', { name: 'Users' }))
    expect(props.onEntityChange).toHaveBeenCalledWith(null)
  })

  it('shows safe credential and required-action preview controls', async () => {
    renderSection({ entityId: 'user-1', tabId: 'credentials' })
    expect(await screen.findByText('No credential values are stored or displayed in this preview.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /password/i })).not.toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Require Update Password' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Require Verify Email' }))
    expect(screen.getByRole('checkbox', { name: 'Require Verify Email' })).toBeChecked()
  })

  it('shows assigned and available ABCO roles with an effective capability summary', async () => {
    renderSection({ entityId: 'user-1', tabId: 'role-mappings' })
    expect(await screen.findByRole('heading', { name: 'Assigned ABCO client roles' })).toBeInTheDocument()
    expect(screen.getByText('Administrator')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Available ABCO client roles' })).toBeInTheDocument()
    expect(screen.getByText('Recovery Manager')).toBeInTheDocument()
    expect(screen.getByText('Effective ABCO application capabilities')).toBeInTheDocument()
    expect(screen.getByText(/Manage users and application access/)).toBeInTheDocument()
  })

  it('keeps the canonical hidden user Sessions deep link functional', async () => {
    renderSection({ entityId: 'user-1', tabId: 'sessions' })

    expect(await screen.findByLabelText('User sessions')).toBeInTheDocument()
    expect(await screen.findByText('192.168.1.100')).toBeInTheDocument()
    expect(screen.getByText('active')).toBeInTheDocument()
  })
})
