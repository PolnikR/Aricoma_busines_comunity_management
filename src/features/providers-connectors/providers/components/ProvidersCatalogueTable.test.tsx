import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProvidersCatalogueTable } from './ProvidersCatalogueTable'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { ProviderRecord, ProviderRoleFilter } from '../model/providerTypes'
import { useGetProviders } from '@/generated/query/providers/providers.gen'
import { ConnectionTestManager } from '@/shared/connection-test/ConnectionTestManager'
import { ConnectionTestProvider } from '@/shared/connection-test/ConnectionTestProvider'
import { ConnectionTestHost } from '@/shared/connection-test/ConnectionTestHost'
import { selectProviders } from '../model/selectProviders'
import en from '@/locales/en.json'
import sk from '@/locales/sk.json'

const keycloakMock = vi.hoisted(() => ({
  token: 'provider-test-token',
  updateToken: vi.fn(() => Promise.resolve(true)),
  logout: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/config/keycloak', () => ({ keycloak: keycloakMock }))
import { detailNavigationLabels, detailSectionsFields, detailSectionsLabels, openDetailSection } from '@/test-utils/detailView'

const locale = vi.hoisted((): { language: 'en' | 'sk' } => ({ language: 'en' }))
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, string | number>) => {
      const dictionary: Record<string, string> = locale.language === 'en' ? en : sk
      let text = dictionary[key] ?? key
      for (const [name, value] of Object.entries(params ?? {})) {
        text = text.replace(`{{${name}}}`, String(value))
      }
      return text
    },
    language: locale.language,
  }),
}))
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
  const connectionTestManager = new ConnectionTestManager(queryClient, 'test-session')
  function ProvidersTableHarness() {
    const [roleFilter, setRoleFilter] = useState<ProviderRoleFilter>('all')
    const { data = [], isLoading, isFetching, error, refetch } = useGetProviders({ role: roleFilter }, { query: { select: selectProviders } })
    const { data: allProviders = [] } = useGetProviders({ role: 'all' }, { query: { select: selectProviders } })
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
      <ConnectionTestProvider manager={connectionTestManager}>
        <ProvidersTableHarness />
        <ConnectionTestHost />
      </ConnectionTestProvider>
    </QueryClientProvider>,
  )
}

describe('ProvidersCatalogueTable', () => {
  beforeEach(() => {
    locale.language = 'en'
    vi.stubGlobal('fetch', mockFetch())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    cleanup()
  })

  it.each(([
    { type: 'VMWARE', help: ['role', 'credentialId', 'url', 'vmPrefix', 'vmTags', 'notificationEmail', 'cacheRefreshSeconds', 'backingStorageProviderIds'] },
    { type: 'FLASHCOPY', help: ['role', 'partnerProviderId', 'credentialId', 'url', 'notificationEmail', 'cacheRefreshSeconds'] },
    { type: 'HITACHI', help: ['role', 'credentialId', 'url', 'notificationEmail', 'cacheRefreshSeconds'] },
    { type: 'IBM_POWER', help: ['role', 'credentialId', 'url', 'notificationEmail', 'cacheRefreshSeconds', 'backingStorageProviderIds', 'managedSystem'] },
  ] as const).flatMap(row => (['en', 'sk'] as const).map(language => ({ ...row, language }))))(
    'shows exactly the $type field help in $language without changing the displayed values', ({ type, help, language }) => {
      locale.language = language
      const dictionary: Record<string, string> = language === 'en' ? en : sk
      const t = (key: string) => dictionary[key] ?? key
      const provider: ProviderRecord = {
        ...providerA, name: 'Display provider', type, vmPrefix: 'prod-', vmTags: ['tag-a', 'tag-b'],
        managedSystem: 'power-system', cacheRefreshSeconds: 120,
      }
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
      render(
        <QueryClientProvider client={queryClient}>
          <ConnectionTestProvider manager={new ConnectionTestManager(queryClient, 'test-session')}>
            <ProvidersCatalogueTable providers={[provider]} allProviders={[provider]} roleFilter="all"
              onRoleFilterChange={vi.fn()} isLoading={false} error={null} isRetrying={false} onRetry={vi.fn()} />
          </ConnectionTestProvider>
        </QueryClientProvider>,
      )
      fireEvent.click(screen.getByText('Display provider'))
      const drawer = screen.getByRole('dialog', { name: t('drawer.providerDetail') })
      const triggers = within(drawer).queryAllByRole('button', { name: /^(Help:|Nápoveda:)/ })
      expect(triggers.map(button => button.getAttribute('aria-label')).sort()).toEqual(
        help.map(field => t(`providers.fieldHelp.${field}.trigger`)).sort(),
      )
      const fields = detailSectionsFields(drawer)
      expect(fields[t('forms.cacheRefreshSeconds')]).toBe('120')
      expect(fields[t('forms.vmPrefix')]).toBe(type === 'VMWARE' ? 'prod-' : undefined)
      expect(fields[t('forms.vmTags')]).toBe(type === 'VMWARE' ? 'tag-a, tag-b' : undefined)
      expect(fields[t('forms.managedSystem')]).toBe(type === 'IBM_POWER' ? 'power-system' : undefined)
      for (const field of help) {
        const trigger = within(drawer).getByRole('button', { name: t(`providers.fieldHelp.${field}.trigger`) })
        expect(trigger.closest('dt')).not.toBeNull()
        fireEvent.click(trigger)
        const popover = screen.getByRole('dialog', { name: t(`providers.fieldHelp.${field}.title`) })
        expect(popover).toHaveTextContent(t(`providers.fieldHelp.${field}.intro`))
        expect(popover).not.toHaveTextContent(/default|predvolen/i)
        fireEvent.keyDown(window, { key: 'Escape' })
        expect(popover).not.toBeInTheDocument()
        expect(drawer).toBeInTheDocument()
      }
      expect(detailSectionsFields(drawer)).toEqual(fields)
      expect(within(drawer).getByRole('button', { name: t('providers.help.trigger') })).toBeInTheDocument()
      expect(fetch).not.toHaveBeenCalled()
    },
  )

  it('keeps provider table chrome visible and skeletonizes only rows while loading', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => undefined)))

    renderTable()

    expect(screen.getByRole('status', { name: 'Loading providers' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('searchbox', { name: 'Search providers by name' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Provider' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeVisible()
    expect(screen.getByRole('combobox', { name: 'Rows per page' })).toBeDisabled()
    expect(screen.queryByText('Loading providers…')).not.toBeInTheDocument()
  })

  it('keeps search and filters available without exposing provider API errors', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <ConnectionTestProvider manager={new ConnectionTestManager(queryClient, 'test-session')}>
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
        </ConnectionTestProvider>
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
        <ConnectionTestProvider manager={new ConnectionTestManager(queryClient, 'test-session')}>
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
        </ConnectionTestProvider>
      </QueryClientProvider>,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Failed to load providers.')
    expect(alert).toHaveTextContent('The provider inventory is unavailable.')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('keeps pagination available when the all-provider cache survives a refresh error', () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <ConnectionTestProvider manager={new ConnectionTestManager(queryClient, 'test-session')}>
          <ProvidersCatalogueTable
          providers={[providerA]}
          allProviders={[providerA, providerB]}
          roleFilter="all"
          onRoleFilterChange={vi.fn()}
          isLoading={false}
          error={new Error('background refresh failed')}
          isRetrying={false}
          onRetry={vi.fn()}
          />
        </ConnectionTestProvider>
      </QueryClientProvider>,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument()
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

  it('shows one flat Overview in the original drawer order, with backing storage only for compute providers', async () => {
    renderTable()
    fireEvent.click(await screen.findByText('Production vCenter'))
    const drawer = screen.getByRole('dialog', { name: 'Provider detail' })

    // Exactly one section: the navigation lists only Overview, no Connection, Relationships or Technical.
    expect(detailNavigationLabels(drawer)).toEqual(['Overview'])
    expect(within(drawer).getAllByRole('region')).toHaveLength(1)
    expect(within(drawer).getByRole('region', { name: 'Overview' })).toBeInTheDocument()
    for (const name of ['Connection', 'Relationships', 'Technical']) {
      expect(within(drawer).queryByRole('button', { name })).not.toBeInTheDocument()
      expect(within(drawer).queryByRole('region', { name })).not.toBeInTheDocument()
    }
    expect(detailSectionsLabels(drawer)).toEqual([
      'Provider ID', 'Type', 'Backing storage', 'Role', 'IP address', 'URL',
      'Notification email', 'Credential', 'Credential status', 'Cache refresh interval (seconds)', 'VM prefix', 'VM tags', 'Description',
    ])
    expect(detailSectionsFields(drawer)).toMatchObject({ 'Provider ID': 'vmware-vcenter-01', 'Backing storage': 'None', Role: 'Source', 'Credential status': 'Available' })

    fireEvent.click(screen.getByText('Backup FlashSystem'))
    const storageDrawer = screen.getByRole('dialog', { name: 'Provider detail' })
    await within(storageDrawer).findByRole('heading', { name: 'Backup FlashSystem' })
    expect(detailNavigationLabels(storageDrawer)).toEqual(['Overview'])
    expect(detailSectionsLabels(storageDrawer)).toEqual([
      'Provider ID', 'Type', 'Partner FlashSystem provider', 'Role', 'IP address', 'URL',
      'Notification email', 'Credential', 'Credential status', 'Cache refresh interval (seconds)', 'Description',
    ])
  })

  it('shows the header statuses, Test connection in the header, Delete left and Edit right', async () => {
    renderTable()
    fireEvent.click(await screen.findByText('Production vCenter'))
    const drawer = screen.getByRole('dialog', { name: 'Provider detail' })
    const header = within(drawer).getByRole('heading', { level: 2, name: 'Production vCenter' }).closest('header')
    const deleteButton = within(drawer).getByRole('button', { name: 'Delete' })
    const footer = deleteButton.closest('footer')

    expect(drawer).toHaveAttribute('data-size', 'md')
    expect(header).toHaveTextContent('Provider')
    expect(header).toHaveTextContent('Source')
    expect(header).toHaveTextContent('Available')
    expect(header).not.toHaveTextContent('vmware-vcenter-01')
    expect(header).toHaveTextContent(detailSectionsFields(drawer)['Type'] ?? 'missing type')
    expect(header).toContainElement(within(drawer).getByRole('button', { name: 'Test connection' }))
    expect(header).toContainElement(within(drawer).getByRole('button', { name: 'Provider help' }))
    // Type, role and credential state stay in the header and are repeated in Overview, with the ID.
    expect(openDetailSection(drawer, 'Overview')).toHaveTextContent('vmware-vcenter-01')
    expect(footer?.children[0]).toContainElement(deleteButton)
    expect(footer?.children[1]).toContainElement(within(drawer).getByRole('button', { name: 'Edit' }))
    fireEvent.click(within(drawer).getByRole('button', { name: 'Provider help' }))
    const help = screen.getByRole('dialog', { name: 'What an infrastructure provider is' })
    expect(help).toHaveTextContent('Role')
    expect(help).toHaveTextContent('Credential')
    expect(within(help).getByRole('heading', { name: 'Provider relationships' })).toBeInTheDocument()
    expect(within(help).queryByRole('heading', { name: 'Partner provider' })).not.toBeInTheDocument()
    // Only the selected provider's neighbourhood, never the whole topology.
    expect(within(help).getByRole('group', { name: 'Production vCenter' })).toHaveTextContent('Selected')
    expect(within(help).queryByText('Recovery vCenter')).not.toBeInTheDocument()
    expect(within(help).getByText('No backing storage relationships')).toBeInTheDocument()
    expect(within(help).queryByText('Other storage relationships')).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Provider relationships' })).not.toBeInTheDocument()
  })

  it('opens the connection test for the selected provider and shows the real result', async () => {
    renderTable()
    fireEvent.click(await screen.findByText('Production vCenter'))
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }))

    const dialog = await screen.findByRole('dialog', { name: 'Test provider connection' })
    // The test runs as a query, so the dialog opens before the result arrives.
    await waitFor(() => { expect(dialog).toHaveTextContent('Connection test completed') })
    expect(dialog).toHaveTextContent('Credentials')
    expect(screen.queryByRole('dialog', { name: 'Provider detail' })).not.toBeInTheDocument()
  })

  it('shows loading until a complete response arrives and resets to loading on Retry', async () => {
    const fetchProvider = mockFetch()
    const pendingTests: ((response: Response) => void)[] = []
    vi.stubGlobal('fetch', vi.fn((input: string | URL) => {
      if (String(input).includes('test_provider')) {
        return new Promise<Response>(resolve => { pendingTests.push(resolve) })
      }
      return fetchProvider(input)
    }))

    renderTable()
    fireEvent.click(await screen.findByText('Production vCenter'))
    fireEvent.click(screen.getByRole('button', { name: 'Test connection' }))

    const dialog = screen.getByRole('dialog', { name: 'Test provider connection' })
    await waitFor(() => { expect(pendingTests).toHaveLength(1) })
    expect(dialog).toHaveTextContent('Testing provider connection…')
    expect(dialog).not.toHaveTextContent('Connection test completed')
    expect(dialog).not.toHaveTextContent('0 / 0 passed')
    expect(dialog).not.toHaveTextContent('Response body')

    await act(async () => {
      pendingTests[0]?.(new Response(JSON.stringify({
        provider_id: 'vmware-vcenter-01', provider_type: 'VMWARE', ok: false,
        checks: [{ name: 'Connectivity', status: 'timeout', detail: 'Connection timed out' }],
      }), { status: 200 }))
      await Promise.resolve()
    })
    await waitFor(() => { expect(dialog).toHaveTextContent('Connection timed out') })
    expect(dialog).toHaveTextContent('The connection test could not be completed.')
    expect(dialog).not.toHaveTextContent('Testing provider connection…')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Retry' }))
    await waitFor(() => { expect(pendingTests).toHaveLength(2) })
    expect(dialog).toHaveTextContent('Testing provider connection…')
    expect(dialog).not.toHaveTextContent('Connection timed out')
    expect(dialog).not.toHaveTextContent('Response body')

    await act(async () => {
      pendingTests[1]?.(new Response(JSON.stringify({
        provider_id: 'vmware-vcenter-01', provider_type: 'VMWARE', ok: true,
        checks: [{ name: 'Connectivity', status: 'ok', detail: 'Connected to vCenter' }],
      }), { status: 200 }))
      await Promise.resolve()
    })
    await waitFor(() => { expect(dialog).toHaveTextContent('Connection test completed') })
    expect(dialog).toHaveTextContent('1 / 1 passed')
    expect(dialog).toHaveTextContent('Connected to vCenter')
    expect(dialog).toHaveTextContent('Response body')
  })

  it('disables connection test when the selected provider has no credential', async () => {
    renderTable()
    fireEvent.click(await screen.findByText('Backup FlashSystem'))
    const button = screen.getByRole('button', { name: 'Test connection' })
    expect(button).toBeDisabled()
    expect(button).toHaveClass('bg-accent-soft')
    expect(button.querySelector('svg')).toBeInTheDocument()
    expect(button).toHaveAttribute('title', 'A valid credential is required to test this provider.')
    expect(document.getElementById(button.getAttribute('aria-describedby') ?? '')).toHaveTextContent('A valid credential is required to test this provider.')
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
