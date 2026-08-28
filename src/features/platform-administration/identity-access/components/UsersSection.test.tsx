import { useState } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UsersSection } from './UsersSection'
import { IdentityAdminGatewayProvider } from '../services/IdentityAdminGatewayProvider'
import { createMockIdentityAdminGateway } from '../services/mockIdentityAdminGateway'
import type { CreateIdentityUserInput, IdentityAdminPreview } from '../services/identityAdminGateway'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

function renderSection(
  overrides?: Partial<Parameters<typeof UsersSection>[0]>,
  gateway = createMockIdentityAdminGateway(),
) {
  const props: Parameters<typeof UsersSection>[0] = { entityId: null, tabId: null, onEntityChange: vi.fn(), onTabChange: vi.fn(), isAddUserOpen: false, onSetAddUserOpen: vi.fn(), ...overrides }
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

  it('keeps Add User open and shows an actionable error when creation fails', async () => {
    const gateway = createMockIdentityAdminGateway()
    gateway.createUser = vi.fn(() => Promise.reject(new Error('Identity gateway rejected the user')))
    const onSetAddUserOpen = vi.fn()
    renderSection({ isAddUserOpen: true, onSetAddUserOpen }, gateway)

    await userEvent.type(screen.getByLabelText('Username'), 'failed.user')
    await userEvent.type(screen.getByLabelText('Email'), 'failed.user@example.com')
    await userEvent.type(screen.getByLabelText('First name'), 'Failed')
    await userEvent.type(screen.getByLabelText('Last name'), 'User')
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('User could not be created')
    expect(screen.getByRole('alert')).toHaveTextContent('Identity gateway rejected the user')
    expect(screen.getByRole('dialog', { name: 'Add user' })).toBeInTheDocument()
    expect(onSetAddUserOpen).not.toHaveBeenCalledWith(false)
  })

  it('clears a failed Add User mutation when the modal is closed and reopened', async () => {
    const gateway = createMockIdentityAdminGateway()
    gateway.createUser = vi.fn(() => Promise.reject(new Error('Identity gateway rejected the user')))

    function Harness() {
      const [open, setOpen] = useState(true)
      return (
        <IdentityAdminGatewayProvider gateway={gateway}>
          <button type="button" onClick={() => { setOpen(true) }}>Open add user</button>
          <UsersSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} isAddUserOpen={open} onSetAddUserOpen={setOpen} />
        </IdentityAdminGatewayProvider>
      )
    }

    render(<Harness />)
    await userEvent.type(screen.getByLabelText('Username'), 'failed.user')
    await userEvent.type(screen.getByLabelText('Email'), 'failed.user@example.com')
    await userEvent.type(screen.getByLabelText('First name'), 'Failed')
    await userEvent.type(screen.getByLabelText('Last name'), 'User')
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Identity gateway rejected the user')

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Open add user' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toHaveValue('')
  })

  it('blocks duplicate creation while pending and resets Add User after Cancel, Escape, and success', async () => {
    const gateway = createMockIdentityAdminGateway()
    const originalCreateUser = gateway.createUser.bind(gateway)
    let releaseCreate: (() => void) | undefined
    const createGate = new Promise<void>(resolve => { releaseCreate = resolve })
    const createUser = vi.fn(async (input: CreateIdentityUserInput) => {
      await createGate
      return originalCreateUser(input)
    })
    gateway.createUser = createUser

    function Harness() {
      const [open, setOpen] = useState(true)
      return (
        <IdentityAdminGatewayProvider gateway={gateway}>
          <button type="button" onClick={() => { setOpen(true) }}>Open add user</button>
          <UsersSection entityId={null} tabId={null} onEntityChange={vi.fn()} onTabChange={vi.fn()} isAddUserOpen={open} onSetAddUserOpen={setOpen} />
        </IdentityAdminGatewayProvider>
      )
    }

    render(<Harness />)
    await userEvent.type(screen.getByLabelText('Username'), 'cancelled')
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await userEvent.click(screen.getByRole('button', { name: 'Open add user' }))
    expect(screen.getByLabelText('Username')).toHaveValue('')

    await userEvent.type(screen.getByLabelText('Username'), 'escaped')
    await userEvent.keyboard('{Escape}')
    await userEvent.click(screen.getByRole('button', { name: 'Open add user' }))
    expect(screen.getByLabelText('Username')).toHaveValue('')

    await userEvent.type(screen.getByLabelText('Username'), 'new.user')
    await userEvent.type(screen.getByLabelText('Email'), 'new.user@example.com')
    await userEvent.type(screen.getByLabelText('First name'), 'New')
    await userEvent.type(screen.getByLabelText('Last name'), 'User')
    await userEvent.click(screen.getByRole('button', { name: 'Create user' }))
    const pendingButton = screen.getByRole('button', { name: 'Creating user…' })
    expect(pendingButton).toBeDisabled()
    await userEvent.click(pendingButton)
    expect(createUser).toHaveBeenCalledTimes(1)

    releaseCreate?.()
    await waitFor(() => { expect(screen.queryByRole('dialog', { name: 'Add user' })).not.toBeInTheDocument() })
    await userEvent.click(screen.getByRole('button', { name: 'Open add user' }))
    expect(screen.getByLabelText('Username')).toHaveValue('')
    expect(screen.getByLabelText('Email')).toHaveValue('')
  })
})
