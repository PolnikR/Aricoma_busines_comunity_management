import { useState } from 'react'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProvidersCatalogueTable } from './ProvidersCatalogueTable'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { ProviderRecord, ProviderRoleFilter } from '../model/providerTypes'
import { useProviders } from '../hooks/useProviders'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))

const providerA: ProviderRecord = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter',
  description: 'Primary vCenter',
  type: 'VMWARE',
  ipAddress: '10.99.99.40',
  url: 'https://10.99.99.40/ui/',
  credentialId: 'vcenter-admin',
  role: 'source',
  notificationEmail: 'provider-alerts@example.test',
  credentialStatus: 'ok',
}
const providerB: ProviderRecord = {
  id: 'flashsystem-01',
  name: 'Backup FlashSystem',
  description: 'DR array',
  type: 'FLASHCOPY',
  ipAddress: '10.99.99.41',
  credentialId: null,
  role: 'source',
  credentialStatus: 'none',
}
const providerC: ProviderRecord = {
  id: 'vmware-vcenter-02',
  name: 'Recovery vCenter',
  description: 'Target vCenter',
  type: 'VMWARE',
  ipAddress: '10.99.99.42',
  credentialId: 'vcenter-admin',
  role: 'target',
  credentialStatus: 'ok',
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  return input.url
}

function mockFetch() {
  let deleted = false
  return vi.fn((input: string | URL) => {
    const url = String(input)
    if (url.includes('get_providers')) {
      const providerAResponse = { ...providerA, description: null }
      const allProviders = deleted ? [providerB, providerC] : [providerAResponse, providerB, providerC]
      const providers = url.includes('role=target')
        ? allProviders.filter(provider => provider.role === 'target')
        : url.includes('role=source')
          ? allProviders.filter(provider => provider.role === 'source')
          : allProviders
      return Promise.resolve(new Response(JSON.stringify({ providers }), { status: 200 }))
    }
    if (url.includes('delete_provider')) {
      deleted = true
      return Promise.resolve(new Response(JSON.stringify({ providers: [providerB] }), { status: 200 }))
    }
    if (url.includes('test_provider')) {
      return Promise.resolve(new Response(
        JSON.stringify({
          provider_id: 'vmware-vcenter-01',
          provider_type: 'VMWARE',
          ok: true,
          checks: [{ name: 'Credentials', status: 'ok', detail: 'Credential validated' }],
        }),
        { status: 200 },
      ))
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}

function renderTable() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  function ProvidersTableHarness() {
    const [roleFilter, setRoleFilter] = useState<ProviderRoleFilter>('all')
    const { data = [], isLoading, isFetching, error, refetch } = useProviders(roleFilter)
    const { data: allProviders = [] } = useProviders('all')
    return (
      <ProvidersCatalogueTable
        providers={data}
        allProviders={allProviders}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        isLoading={isLoading}
        error={error}
        isRetrying={isFetching}
        onRetry={() => { void refetch() }}
      />
    )
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <ProvidersTableHarness />
    </QueryClientProvider>,
  )
}

describe('ProvidersCatalogueTable', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    cleanup()
  })

  it('renders the shared table skeleton while providers are loading', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)))

    renderTable()

    expect(screen.getByRole('status', { name: 'Loading providers' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Loading providers…')).not.toBeInTheDocument()
  })

  it('keeps search and filters available without exposing provider API errors', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <ProvidersCatalogueTable
          providers={[]}
          allProviders={[]}
          roleFilter="all"
          onRoleFilterChange={vi.fn()}
          isLoading={false}
          error={new Error('provider service internals')}
          isRetrying={false}
          onRetry={vi.fn()}
        />
      </QueryClientProvider>,
    )

    const alert = screen.getByRole('alert')
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    expect(alert).not.toHaveTextContent('provider service internals')
  })

  it('shows nested backend detail below the localized provider load title', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const error = new Error('Get providers request failed with status 503', {
      cause: new OrvalApiError(503, 'Service Unavailable', { detail: 'The provider inventory is unavailable.' }),
    })

    render(
      <QueryClientProvider client={queryClient}>
        <ProvidersCatalogueTable
          providers={[]}
          allProviders={[]}
          roleFilter="all"
          onRoleFilterChange={vi.fn()}
          isLoading={false}
          error={error}
          isRetrying={false}
          onRetry={vi.fn()}
        />
      </QueryClientProvider>,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Failed to load providers.')
    expect(alert).toHaveTextContent('The provider inventory is unavailable.')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('requests a role from the server only after filters are applied', async () => {
    renderTable()
    await screen.findByText('Production vCenter')
    const fetchMock = vi.mocked(fetch)

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'target' } })

    expect(fetchMock.mock.calls.some(([input]) => requestUrl(input).includes('role=target'))).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText('Recovery vCenter')).toBeInTheDocument()
    expect(screen.queryByText('Production vCenter')).not.toBeInTheDocument()
    expect(fetchMock.mock.calls.some(([input]) => requestUrl(input).includes('role=target'))).toBe(true)
    expect(screen.getByRole('button', { name: /Filters/ })).toHaveTextContent('1')
  })

  it('discards pending role changes when the filter modal is cancelled', async () => {
    renderTable()
    await screen.findByText('Production vCenter')
    const fetchMock = vi.mocked(fetch)

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'target' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))

    expect(screen.getByLabelText('Role')).toHaveValue('all')
    expect(fetchMock.mock.calls.some(([input]) => requestUrl(input).includes('role=target'))).toBe(false)
  })

  it('combines client type with server role and clears both filters', async () => {
    renderTable()
    await screen.findByText('Production vCenter')

    fireEvent.click(screen.getByRole('button', { name: 'Filters' }))
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'VMWARE' } })
    fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'target' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply' }))

    expect(await screen.findByText('Recovery vCenter')).toBeInTheDocument()
    expect(screen.queryByText('Backup FlashSystem')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Filters/ })).toHaveTextContent('2')

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    expect(within(screen.getByLabelText('Type')).getByRole('option', { name: 'FlashCopy' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(await screen.findByText('Production vCenter')).toBeInTheDocument()
    expect(screen.getByText('Backup FlashSystem')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Filters' })).not.toHaveTextContent('1')
    expect(screen.getByRole('button', { name: 'Filters' })).not.toHaveTextContent('2')
  })

  it('opens the detail drawer with actions when a row is clicked', async () => {
    renderTable()
    fireEvent.click(await screen.findByText('Production vCenter'))
    expect(screen.getAllByText('Source').length).toBeGreaterThanOrEqual(2)
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Test connection' })).toHaveClass('bg-accent-soft', 'text-accent', 'border-accent/30')
    expect(screen.getByRole('link', { name: 'https://10.99.99.40/ui/' })).toHaveAttribute('target', '_blank')
    expect(screen.getByText('provider-alerts@example.test')).toBeInTheDocument()
  })

  it('opens the connection test for the selected provider and shows the real result', async () => {
    renderTable()
    fireEvent.click(await screen.findByText('Production vCenter'))
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }))

    const dialog = await screen.findByRole('dialog', { name: 'Test provider connection' })
    expect(dialog).toHaveTextContent('Connection test completed')
    expect(dialog).toHaveTextContent('Credentials')
    expect(screen.queryByRole('dialog', { name: 'Provider detail' })).not.toBeInTheDocument()
  })

  it('disables connection test when the selected provider has no credential', async () => {
    renderTable()
    fireEvent.click(await screen.findByText('Backup FlashSystem'))
    expect(screen.getByRole('button', { name: 'Test connection' })).toBeDisabled()
  })

  it('shows the complete provider GET record without opening the detail drawer', async () => {
    renderTable()

    const [viewButton] = await screen.findAllByRole('button', { name: 'View' })
    if (!viewButton) throw new Error('Expected a View button for the provider row')
    fireEvent.click(viewButton)

    const dialog = screen.getByRole('dialog', { name: 'Provider JSON' })
    expect(dialog).toHaveTextContent('"id": "vmware-vcenter-01"')
    expect(dialog).toHaveTextContent('"ipAddress": "10.99.99.40"')
    expect(dialog).toHaveTextContent('"credentialId": "vcenter-admin"')
    expect(dialog).toHaveTextContent('"credentialStatus": "ok"')
    expect(dialog).toHaveTextContent('"description": null')
    expect(dialog).not.toHaveTextContent('"port"')
    expect(dialog).toHaveTextContent('"url": "https://10.99.99.40/ui/"')
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument()
  })

  it('Edit closes the drawer and opens the prefilled modal with a locked id', async () => {
    renderTable()
    fireEvent.click(await screen.findByText('Production vCenter'))
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(screen.getByRole('heading', { name: 'Edit provider' })).toBeInTheDocument()
    const idInput = screen.getByLabelText('ID')
    expect((idInput as HTMLInputElement).value).toBe('vmware-vcenter-01')
    expect(idInput).toBeDisabled()
  })

  it('Delete confirms then removes the provider', async () => {
    renderTable()
    fireEvent.click(await screen.findByText('Production vCenter'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    const dialog = screen.getByText(/Are you sure you want to delete/i).closest('[role="dialog"]')
    expect(dialog).not.toBeNull()
    fireEvent.click(within(dialog as HTMLElement).getByRole('button', { name: 'Delete' }))

    await waitFor(() => {
      expect(screen.queryByText('Production vCenter')).not.toBeInTheDocument()
    })
    const fetchMock = vi.mocked(fetch)
    expect(fetchMock.mock.calls.some(([input]) => typeof input === 'string' && input.includes('delete_provider'))).toBe(true)
  })

  it('shows backend detail in a table-context alert when deletion fails', async () => {
    vi.stubGlobal('fetch', vi.fn((input: string | URL) => {
      const url = String(input)
      if (url.includes('get_providers')) {
        return Promise.resolve(new Response(JSON.stringify({ providers: [providerA, providerB, providerC] }), { status: 200 }))
      }
      if (url.includes('delete_provider')) {
        return Promise.resolve(new Response(JSON.stringify({ detail: 'This provider is still referenced by a recovery group.' }), { status: 409 }))
      }
      return Promise.reject(new Error(`unexpected fetch: ${url}`))
    }))

    renderTable()
    fireEvent.click(await screen.findByText('Production vCenter'))
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    const dialog = screen.getByText(/Are you sure you want to delete/i).closest('[role="dialog"]')
    expect(dialog).not.toBeNull()
    fireEvent.click(within(dialog as HTMLElement).getByRole('button', { name: 'Delete' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Delete provider')
    expect(alert).toHaveTextContent('This provider is still referenced by a recovery group.')
    expect(screen.queryByRole('dialog', { name: 'Delete provider' })).not.toBeInTheDocument()
  })
})
