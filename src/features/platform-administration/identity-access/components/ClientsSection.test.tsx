import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ClientsSection } from './ClientsSection'
import { useGetIdentityClientClientUuid, useGetIdentityClients } from '@/generated/query/identity-access/identity-access.gen'
import type { IdentityClient } from '@/generated/query/zod'

import { detailSectionsFields, openDetailSection } from '@/test-utils/detailView'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/identity-access/identity-access.gen', () => ({
  useGetIdentityClients: vi.fn(),
  useGetIdentityClientClientUuid: vi.fn(),
}))
vi.mock('../hooks/useIdentityAdminPreview', () => ({
  useIdentityAdminPreview: () => { throw new Error('Clients must not use the preview gateway') },
}))

const backend: IdentityClient = {
  id: '6f1c2a9e-0000-4000-8000-000000000001',
  clientId: 'abco-be',
  displayName: 'ABCO Backend',
  protocol: 'openid-connect',
  rootUrl: 'https://abco.example.com',
  homeUrl: '',
  enabled: true,
  isPublicClient: false,
  isPreview: false,
  roles: [],
}
const portal: IdentityClient = {
  id: '6f1c2a9e-0000-4000-8000-000000000002',
  clientId: 'abco-portal',
  displayName: 'ABCO Portal',
  protocol: 'openid-connect',
  rootUrl: '',
  homeUrl: '',
  enabled: false,
  isPublicClient: true,
  isPreview: false,
  roles: [],
}
const backendDetail: IdentityClient = {
  ...backend,
  homeUrl: 'https://abco.example.com/home',
  roles: [
    { id: 'r1', name: 'platform-admin', description: 'Manages platform configuration.', capabilityIds: [] },
    { id: 'r2', name: 'recovery-operator', description: '', capabilityIds: [] },
  ],
}

interface QueryState<T> { data?: T, isLoading?: boolean, isFetching?: boolean, error?: Error | null, refetch?: () => void }

function queryResult<T>(state: QueryState<T>) {
  return {
    data: state.data,
    isLoading: state.isLoading ?? false,
    isFetching: state.isFetching ?? false,
    error: state.error ?? null,
    refetch: state.refetch ?? vi.fn(),
  } as never
}

function mockClients(state: QueryState<IdentityClient[]>) {
  vi.mocked(useGetIdentityClients).mockReturnValue(queryResult({ ...state, data: state.data ? { clients: state.data } : undefined }))
}

function mockDetail(state: QueryState<IdentityClient>) {
  vi.mocked(useGetIdentityClientClientUuid).mockReturnValue(queryResult(state))
}


async function openClient(clientId: string) {
  await userEvent.click(screen.getByRole('row', { name: `Open client ${clientId}` }))
  const dialog = screen.getByRole('dialog', { name: 'Client detail' })
  return Object.assign(within(dialog), { element: dialog })
}

describe('ClientsSection', () => {
  beforeEach(() => {
    vi.mocked(useGetIdentityClients).mockReset()
    vi.mocked(useGetIdentityClientClientUuid).mockReset()
    mockDetail({ data: backendDetail })
  })

  it('renders clients from GET /get_identity_clients with compact read-only columns', () => {
    mockClients({ data: [backend, portal] })
    render(<ClientsSection />)

    expect(useGetIdentityClients).toHaveBeenCalledWith()
    expect(screen.getAllByRole('columnheader').map(header => header.textContent)).toEqual(['Client', 'Protocol', 'Type', 'Status'])
    const backendRow = within(screen.getByRole('row', { name: 'Open client abco-be' }))
    expect(backendRow.getByText('ABCO Backend')).toBeInTheDocument()
    expect(backendRow.getByText('abco-be')).toBeInTheDocument()
    expect(backendRow.getByText('openid-connect')).toBeInTheDocument()
    expect(backendRow.getByText('Confidential')).toBeInTheDocument()
    expect(backendRow.getByText('Enabled')).toBeInTheDocument()
    const portalRow = within(screen.getByRole('row', { name: 'Open client abco-portal' }))
    expect(portalRow.getByText('Public')).toBeInTheDocument()
    expect(portalRow.getByText('Disabled')).toBeInTheDocument()
    expect(screen.queryByText('Preview only')).not.toBeInTheDocument()
  })

  it('shows a warning badge only when a client is unexpectedly marked as preview', () => {
    mockClients({ data: [{ ...backend, isPreview: true }] })
    render(<ClientsSection />)

    expect(screen.getByText('Preview only')).toBeInTheDocument()
  })

  it('does not request client detail while no client is selected', () => {
    mockClients({ data: [backend, portal] })
    render(<ClientsSection />)

    expect(useGetIdentityClientClientUuid).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('filters by display name, client id and protocol, with a filtered-empty state', async () => {
    mockClients({ data: [backend, { ...portal, protocol: 'saml' }] })
    render(<ClientsSection />)
    const search = screen.getByRole('searchbox', { name: 'Search clients' })

    await userEvent.type(search, 'portal')
    expect(screen.queryByText('ABCO Backend')).not.toBeInTheDocument()
    expect(screen.getByText('ABCO Portal')).toBeInTheDocument()

    await userEvent.clear(search)
    await userEvent.type(search, 'abco-be')
    expect(screen.getByText('ABCO Backend')).toBeInTheDocument()
    expect(screen.queryByText('ABCO Portal')).not.toBeInTheDocument()

    await userEvent.clear(search)
    await userEvent.type(search, 'saml')
    expect(screen.getByText('ABCO Portal')).toBeInTheDocument()

    await userEvent.clear(search)
    await userEvent.type(search, 'nothing-matches')
    expect(screen.getByText('No clients match the search.')).toBeInTheDocument()
  })

  it('paginates the client list', async () => {
    const many = Array.from({ length: 12 }, (_, index) => ({ ...backend, id: `uuid-${String(index)}`, clientId: `client-${String(index).padStart(2, '0')}`, displayName: `Client ${String(index).padStart(2, '0')}` }))
    mockClients({ data: many })
    render(<ClientsSection />)

    expect(screen.getByText('Client 00')).toBeInTheDocument()
    expect(screen.queryByText('Client 11')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('Client 11')).toBeInTheDocument()
    expect(screen.queryByText('Client 00')).not.toBeInTheDocument()
  })

  it('keeps table chrome visible and skeletonizes rows while loading', () => {
    mockClients({ isLoading: true, isFetching: true })
    const { container } = render(<ClientsSection />)

    expect(screen.getByRole('searchbox', { name: 'Search clients' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Client' })).toBeInTheDocument()
    expect(container.querySelectorAll('.animate-pulse').length).toBeGreaterThan(0)
    expect(screen.queryByText('No clients found')).not.toBeInTheDocument()
  })

  it('shows a load error with backend detail and a working retry', async () => {
    const refetch = vi.fn()
    mockClients({ error: new Error('Keycloak unavailable'), refetch })
    render(<ClientsSection />)

    expect(screen.getByText('Clients could not be loaded')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('keeps cached clients visible when a refresh fails', () => {
    mockClients({ data: [backend], error: new Error('Keycloak unavailable') })
    render(<ClientsSection />)

    expect(screen.getByText('Clients could not be loaded')).toBeInTheDocument()
    expect(screen.getByText('ABCO Backend')).toBeInTheDocument()
  })

  it('shows the empty state when the API returns no clients', () => {
    mockClients({ data: [] })
    render(<ClientsSection />)

    expect(screen.getByText('No clients found')).toBeInTheDocument()
  })

  it('opens a read-only detail for the internal UUID, highlights the row and keeps the list visible', async () => {
    mockClients({ data: [backend, portal] })
    render(<ClientsSection />)

    const drawer = await openClient('abco-be')

    expect(useGetIdentityClientClientUuid).toHaveBeenLastCalledWith(backend.id)
    expect(useGetIdentityClientClientUuid).not.toHaveBeenCalledWith('abco-be')
    expect(screen.getByRole('row', { name: 'Open client abco-be' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('row', { name: 'Open client abco-portal' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByText('ABCO Portal')).toBeInTheDocument()
    const header = drawer.getByRole('heading', { level: 2, name: 'ABCO Backend' }).closest('header')
    expect(drawer.element).toHaveAttribute('data-size', 'md')
    expect(header).toHaveTextContent('Client')
    expect(header).toHaveTextContent('Enabled')
    // The status is a header badge; the IDs live in Technical.
    expect(detailSectionsFields(drawer.element)).toEqual({
      'Display name': 'ABCO Backend',
      Protocol: 'openid-connect',
      'Client type': 'Confidential',
      Roles: 'platform-adminrecovery-operator',
      ID: backend.id,
      'Client ID': 'abco-be',
    })
  })

  it('takes roles from the detail endpoint even though the list returns roles: []', async () => {
    mockClients({ data: [backend] })
    render(<ClientsSection />)

    const drawer = await openClient('abco-be')
    const roles = openDetailSection(drawer.element, 'Roles')
    expect(within(roles).getByText('platform-admin')).toBeInTheDocument()
    expect(within(roles).getByText('recovery-operator')).toBeInTheDocument()
    expect(screen.queryByText('Manages platform configuration.')).not.toBeInTheDocument()
    expect(screen.queryByText(/capabilit/i)).not.toBeInTheDocument()
  })

  it('renders empty detail values as "Not set" and empty roles as No roles', async () => {
    mockClients({ data: [portal] })
    mockDetail({ data: { ...portal, displayName: '' } })
    render(<ClientsSection />)

    const drawer = await openClient('abco-portal')
    expect(drawer.getByRole('heading', { level: 2 }).closest('header')).toHaveTextContent('Disabled')
    expect(detailSectionsFields(drawer.element)).toMatchObject({ 'Display name': 'Not set', 'Client type': 'Public', Roles: 'No roles' })
  })

  it('shows a detail skeleton in a single section while the detail loads', async () => {
    mockClients({ data: [backend] })
    mockDetail({ isLoading: true, isFetching: true })
    render(<ClientsSection />)

    const drawer = await openClient('abco-be')
    expect(drawer.getByLabelText('Loading client detail')).toHaveAttribute('aria-busy', 'true')
    expect(drawer.queryByRole('navigation')).not.toBeInTheDocument()
    expect(drawer.getByText('Protocol')).toBeInTheDocument()
    expect(drawer.queryByText('Root URL')).not.toBeInTheDocument()
    expect(drawer.queryByText('Home URL')).not.toBeInTheDocument()
    expect(screen.getByText('ABCO Backend', { selector: 'span' })).toBeInTheDocument()
  })

  it('shows detail errors with Retry inside the detail without affecting the table', async () => {
    const refetch = vi.fn()
    mockClients({ data: [backend, portal] })
    mockDetail({ error: new Error('Client not found'), refetch })
    render(<ClientsSection />)

    const drawer = await openClient('abco-be')
    expect(drawer.getByText('Client detail could not be loaded')).toBeInTheDocument()
    await userEvent.click(drawer.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Clients could not be loaded')).not.toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Open client abco-portal' })).toBeInTheDocument()
  })

  it('closes the detail and clears the selection', async () => {
    mockClients({ data: [backend] })
    render(<ClientsSection />)

    const drawer = await openClient('abco-be')
    await userEvent.click(drawer.getByRole('button', { name: 'Close client detail' }))

    expect(screen.queryByRole('dialog', { name: 'Client detail' })).not.toBeInTheDocument()
    expect(screen.getByRole('row', { name: 'Open client abco-be' })).toHaveAttribute('aria-selected', 'false')
  })

  it('exposes no tabs or management actions', async () => {
    mockClients({ data: [backend] })
    render(<ClientsSection />)

    const drawer = await openClient('abco-be')
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /settings|roles/i })).not.toBeInTheDocument()
    const header = drawer.getByRole('heading', { level: 2 }).closest('header')
    if (!header) throw new Error('Expected the detail header')
    expect(within(header).getAllByRole('button').map(button => button.getAttribute('aria-label') ?? button.textContent)).toEqual(['Client help', 'Close client detail'])
    expect(drawer.element.querySelector('footer')).toBeNull()
    await userEvent.click(drawer.getByRole('button', { name: 'Client help' }))
    expect(screen.getByRole('dialog', { name: 'What a client is' })).toHaveTextContent('Client type')
    expect(screen.queryByRole('button', { name: /create|edit|delete|assign|remove|secret/i })).not.toBeInTheDocument()
  })
})
