import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UsersSection } from './UsersSection'
import { IdentityAdminGatewayProvider } from '../services/IdentityAdminGatewayProvider'
import { createMockIdentityAdminGateway } from '../services/mockIdentityAdminGateway'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

function renderSection(overrides?: Partial<Parameters<typeof UsersSection>[0]>) {
  const props: Parameters<typeof UsersSection>[0] = { entityId: null, tabId: null, onEntityChange: vi.fn(), onTabChange: vi.fn(), isAddUserOpen: false, onSetAddUserOpen: vi.fn(), ...overrides }
  render(<IdentityAdminGatewayProvider gateway={createMockIdentityAdminGateway()}><UsersSection {...props} /></IdentityAdminGatewayProvider>)
  return props
}

describe('UsersSection', () => {
  it('keeps shared table search and opens a user through the URL entity callback', async () => {
    const props = renderSection()

    const usersTable = await screen.findByLabelText('Users')
    expect(await screen.findByText('Alice Smith')).toBeInTheDocument()
    const scrollRegion = usersTable.parentElement
    expect(usersTable).toBeInTheDocument()
    expect(scrollRegion).toHaveClass('min-h-0', 'flex-1', 'lg:overflow-y-auto')
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

  it('creates a preview user from focused fields without a password', async () => {
    const onSetAddUserOpen = vi.fn()
    renderSection({ isAddUserOpen: true, onSetAddUserOpen })
    expect(screen.getByRole('dialog', { name: 'Add user' })).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByLabelText('First name')).toBeInTheDocument()
    expect(screen.getByLabelText('Last name')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Enabled' })).toBeChecked()
    expect(screen.queryByRole('textbox', { name: /password/i })).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Username'), 'new.user')
    await userEvent.type(screen.getByLabelText('Email'), 'new.user@example.com')
    await userEvent.type(screen.getByLabelText('First name'), 'New')
    await userEvent.type(screen.getByLabelText('Last name'), 'User')
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }))
    await waitFor(() => { expect(onSetAddUserOpen).toHaveBeenCalledWith(false) })
  })
})
