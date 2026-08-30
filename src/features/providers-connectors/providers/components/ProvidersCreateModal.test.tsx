import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProvidersCreateModal } from './ProvidersCreateModal'
import type { ProviderRecord } from '../model/providerTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
const { useTagsMock } = vi.hoisted(() => ({ useTagsMock: vi.fn() }))
vi.mock('@/features/discovery-inventory/resources/hooks/useVmwareTags', () => ({
  useTags: useTagsMock,
}))
vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))
vi.mock('../../credentials/hooks/useCredentials', () => ({
  useCredentials: () => ({
    data: [{
      id: 'vcenter-admin',
      name: 'vCenter admin',
      description: 'Production account',
      username: 'administrator',
    }],
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
}))

const mockProviderA: ProviderRecord = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter',
  description: 'Primary vCenter',
  type: 'VMWARE',
  ipAddress: '10.99.99.40',
  url: 'https://vcenter.example.test',
  port: 22,
  credentialId: 'vcenter-admin',
  role: 'source',
  notificationEmail: 'provider-alerts@example.test',
  credentialStatus: 'ok',
}

function renderWithQueryClient(component: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}>{component}</QueryClientProvider>)
}

function fillValidForm() {
  fireEvent.change(screen.getByLabelText('ID'), { target: { value: 'flashcopy-01' } })
  fireEvent.change(screen.getByLabelText('Provider name'), { target: { value: 'New Provider' } })
  fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'Test description' } })
  fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'VMWARE' } })
  fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'source' } })
  fireEvent.change(screen.getByLabelText('IP address'), { target: { value: '10.0.0.1' } })
}

describe('ProvidersCreateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useTagsMock.mockReturnValue({ data: [], isLoading: false, error: null, refetch: vi.fn() })
  })

  afterEach(cleanup)

  it('renders form fields when open', () => {
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[]} />,
    )
    expect(screen.getByLabelText('ID')).toBeInTheDocument()
    expect(screen.getByLabelText('Provider name')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Type')).toBeInTheDocument()
    expect(screen.getByLabelText('IP address')).toBeInTheDocument()
    expect(screen.getByLabelText('URL')).toBeInTheDocument()
    expect(screen.getByLabelText('Notification email')).toBeInTheDocument()
    expect(screen.getByLabelText('Port')).toHaveValue(22)
    expect(screen.getByLabelText(/Cache refresh interval \(seconds\)/)).toHaveValue(null)
    expect(screen.getByLabelText('Credentials')).toBeInTheDocument()
    expect(useTagsMock).toHaveBeenCalledWith(null, false)

    const dialog = screen.getByRole('dialog')
    expect(dialog.querySelector('[class~="overflow-y-auto"]')).not.toBeNull()
    expect(dialog.querySelector('[class~="md:overflow-visible"]')).toBeNull()
  })

  it('loads VMware tags only for an edited provider and submits VM settings', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ providers: [] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', mockFetch)
    const editedProvider: ProviderRecord = {
      ...mockProviderA,
      vmPrefix: 'prod-',
      vmTags: ['saved-tag'],
    }
    useTagsMock.mockReturnValue({
      data: ['available-tag'],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })
    const onClose = vi.fn()

    renderWithQueryClient(
      <ProvidersCreateModal
        open
        onClose={onClose}
        existingProviders={[editedProvider]}
        provider={editedProvider}
      />,
    )

    expect(useTagsMock).toHaveBeenCalledWith('vmware-vcenter-01', true)
    expect(screen.getByLabelText('VM prefix')).toHaveValue('prod-')
    expect(screen.getByLabelText('VM tags')).toHaveValue('saved-tag')

    fireEvent.click(screen.getByRole('button', { name: /Edit provider/i }))

    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    const init = mockFetch.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(init.body as string)).toMatchObject({
      vmPrefix: 'prod-',
      vmTags: ['saved-tag'],
    })
    vi.unstubAllGlobals()
  })

  it('normalizes legacy provider VM tags to the first saved tag', () => {
    const editedProvider: ProviderRecord = {
      ...mockProviderA,
      vmTags: ['first-tag', 'second-tag'],
    }
    useTagsMock.mockReturnValue({
      data: ['first-tag', 'second-tag'],
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    })

    renderWithQueryClient(
      <ProvidersCreateModal
        open
        onClose={vi.fn()}
        existingProviders={[editedProvider]}
        provider={editedProvider}
      />,
    )

    expect(screen.getByLabelText('VM tags')).toHaveValue('first-tag')
  })

  it('preserves an edited provider port without sending it to the backend', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ providers: [] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', mockFetch)
    const onClose = vi.fn()
    const editedProvider = { ...mockProviderA, port: 8443 }
    renderWithQueryClient(
      <ProvidersCreateModal
        open
        onClose={onClose}
        existingProviders={[editedProvider]}
        provider={editedProvider}
      />,
    )

    expect(screen.getByLabelText('Port')).toHaveValue(8443)
    fireEvent.click(screen.getByRole('button', { name: /Edit provider/i }))

    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    const init = mockFetch.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(init.body as string)).not.toHaveProperty('port')
    vi.unstubAllGlobals()
  })

  it('preserves and submits an edited provider URL', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ providers: [] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', mockFetch)
    const onClose = vi.fn()
    renderWithQueryClient(
      <ProvidersCreateModal
        open
        onClose={onClose}
        existingProviders={[mockProviderA]}
        provider={mockProviderA}
      />,
    )

    expect(screen.getByLabelText('URL')).toHaveValue('https://vcenter.example.test')
    fireEvent.change(screen.getByLabelText('Provider name'), { target: { value: 'Renamed vCenter' } })
    fireEvent.click(screen.getByRole('button', { name: /Edit provider/i }))

    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    const init = mockFetch.mock.calls[0]?.[1] as RequestInit
    expect(JSON.parse(init.body as string)).toMatchObject({ url: 'https://vcenter.example.test' })
    vi.unstubAllGlobals()
  })

  it('renders nothing when closed', () => {
    renderWithQueryClient(
      <ProvidersCreateModal open={false} onClose={vi.fn()} existingProviders={[]} />,
    )
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('updates form fields on input change', () => {
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[]} />,
    )
    const nameInput = screen.getByLabelText('Provider name')
    fireEvent.change(nameInput, { target: { value: 'New vCenter' } })
    expect((nameInput as HTMLInputElement).value).toBe('New vCenter')
  })

  it('derives a normalized ID from the provider name while creating', () => {
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[]} />,
    )

    fireEvent.change(screen.getByLabelText('Provider name'), { target: { value: 'Production vCenter' } })

    expect(screen.getByLabelText('ID')).toHaveValue('production_vcenter')
  })

  it('preserves a manually customized ID when the provider name changes', () => {
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[]} />,
    )

    fireEvent.change(screen.getByLabelText('Provider name'), { target: { value: 'Production vCenter' } })
    fireEvent.change(screen.getByLabelText('ID'), { target: { value: 'custom_provider' } })
    fireEvent.change(screen.getByLabelText('Provider name'), { target: { value: 'Disaster Recovery' } })

    expect(screen.getByLabelText('ID')).toHaveValue('custom_provider')
  })

  it('normalizes a manually entered ID when the field loses focus', () => {
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[]} />,
    )

    const idInput = screen.getByLabelText('ID')
    fireEvent.change(idInput, { target: { value: 'Flash Copy Primary' } })
    fireEvent.blur(idInput)

    expect(idInput).toHaveValue('flash_copy_primary')
  })

  it('rejects an ID that collides after normalization', async () => {
    renderWithQueryClient(
      <ProvidersCreateModal
        open
        onClose={vi.fn()}
        existingProviders={[{ ...mockProviderA, id: 'new_provider' }]}
      />,
    )

    fireEvent.change(screen.getByLabelText('ID'), { target: { value: 'New Provider' } })
    fireEvent.click(screen.getByRole('button', { name: /Create Provider/i }))

    await waitFor(() => {
      expect(screen.getByText('A provider with this ID already exists')).toBeInTheDocument()
    })
  })

  it('shows validation errors for required fields', async () => {
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[]} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Create Provider/i }))

    await waitFor(() => {
      expect(screen.getByText('ID is required')).toBeInTheDocument()
      expect(screen.getByText('Provider name is required')).toBeInTheDocument()
      expect(screen.getByText('Description is required')).toBeInTheDocument()
      expect(screen.getByText('Type is required')).toBeInTheDocument()
      expect(screen.getByText('IP address is required')).toBeInTheDocument()
    })
  })

  it('clears a field error once the user corrects it', async () => {
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[]} />,
    )
    const nameInput = screen.getByLabelText('Provider name')
    fireEvent.click(screen.getByRole('button', { name: /Create Provider/i }))
    await waitFor(() => {
      expect(screen.getByText('Provider name is required')).toBeInTheDocument()
    })

    fireEvent.change(nameInput, { target: { value: 'New Provider' } })
    expect(screen.queryByText('Provider name is required')).not.toBeInTheDocument()
  })

  it('does not submit while the form is invalid', () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[]} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Create Provider/i }))
    expect(mockFetch).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('does not overwrite an existing provider from create mode', async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[mockProviderA]} />,
    )

    fillValidForm()
    fireEvent.change(screen.getByLabelText('ID'), { target: { value: mockProviderA.id } })
    fireEvent.click(screen.getByRole('button', { name: /Create Provider/i }))

    expect(await screen.findByText('A provider with this ID already exists')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('submits the entered id in the payload', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ providers: [] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', mockFetch)
    const onClose = vi.fn()
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={onClose} existingProviders={[]} />,
    )

    fillValidForm()
    fireEvent.change(screen.getByLabelText('Credentials'), { target: { value: 'vcenter-admin' } })
    fireEvent.click(screen.getByRole('button', { name: /Create Provider/i }))

    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })

    const init = mockFetch.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(init.body as string) as ProviderRecord
    expect(body).toMatchObject({
      id: 'flashcopy_01',
      name: 'New Provider',
      type: 'VMWARE',
      ipAddress: '10.0.0.1',
      credentialId: 'vcenter-admin',
      role: 'source',
    })
    expect(body).not.toHaveProperty('credentialStatus')
    expect(body).not.toHaveProperty('port')
    vi.unstubAllGlobals()
  })

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn()
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={onClose} existingProviders={[]} />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows backend detail below the localized submit failure title', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: 'A provider with this ID already exists.' }), { status: 400 }),
    )
    vi.stubGlobal('fetch', mockFetch)

    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[]} />,
    )

    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /Create Provider/i }))

    await waitFor(() => {
      const alert = screen.getByRole('alert')
      expect(alert).toHaveTextContent('Failed to create provider')
      expect(alert).toHaveTextContent('A provider with this ID already exists.')
    })

    vi.unstubAllGlobals()
  })

  it('does not show a synthetic request detail when the backend detail is unsupported', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Internal provider error' }), { status: 500 }),
    )
    vi.stubGlobal('fetch', mockFetch)

    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[]} />,
    )

    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /Create Provider/i }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Failed to create provider')
    expect(alert).not.toHaveTextContent('Submit provider request failed with status 500')
    expect(alert).not.toHaveTextContent('Internal provider error')

    vi.unstubAllGlobals()
  })

  it('prefills fields and locks the id and type in edit mode', () => {
    const providerWithCacheRefresh = { ...mockProviderA, cacheRefreshSeconds: 120 }
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[providerWithCacheRefresh]} provider={providerWithCacheRefresh} />,
    )
    expect(screen.getByRole('heading', { name: 'Edit provider' })).toBeInTheDocument()
    const idInput = screen.getByLabelText('ID')
    const typeSelect = screen.getByLabelText('Type')
    const nameInput = screen.getByLabelText('Provider name')
    expect((idInput as HTMLInputElement).value).toBe('vmware-vcenter-01')
    expect(idInput).toBeDisabled()
    expect(typeSelect).toHaveValue('VMWARE')
    expect(typeSelect).toBeDisabled()
    expect((nameInput as HTMLInputElement).value).toBe('Production vCenter')
    expect(screen.getByLabelText('Credentials')).toHaveValue('vcenter-admin')
    expect(screen.getByLabelText('Notification email')).toHaveValue('provider-alerts@example.test')
    expect(screen.getByLabelText(/Cache refresh interval \(seconds\)/)).toHaveValue(120)
  })

  it.each(['0', '-1', '1.5'])('rejects invalid cache refresh interval %s before requesting', (cacheRefreshSeconds) => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[]} />,
    )

    fillValidForm()
    fireEvent.change(screen.getByLabelText(/Cache refresh interval \(seconds\)/), { target: { value: cacheRefreshSeconds } })
    fireEvent.click(screen.getByRole('button', { name: /Create provider/i }))

    expect(screen.getByText('Enter a positive whole number.')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('submits an edited cache refresh interval', async () => {
    const providerWithCacheRefresh = { ...mockProviderA, cacheRefreshSeconds: 120 }
    const mockFetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ providers: [] }), { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)
    const onClose = vi.fn()
    renderWithQueryClient(
      <ProvidersCreateModal
        open
        onClose={onClose}
        existingProviders={[providerWithCacheRefresh]}
        provider={providerWithCacheRefresh}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Cache refresh interval \(seconds\)/), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: /Edit provider/i }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect(JSON.parse((mockFetch.mock.calls[0]?.[1] as RequestInit).body as string)).toMatchObject({ cacheRefreshSeconds: 60 })
    vi.unstubAllGlobals()
  })

  it('submits null when an edited cache refresh interval is cleared', async () => {
    const providerWithCacheRefresh = { ...mockProviderA, cacheRefreshSeconds: 120 }
    const mockFetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ providers: [] }), { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)
    const onClose = vi.fn()

    renderWithQueryClient(
      <ProvidersCreateModal
        open
        onClose={onClose}
        existingProviders={[providerWithCacheRefresh]}
        provider={providerWithCacheRefresh}
      />,
    )

    fireEvent.change(screen.getByLabelText(/Cache refresh interval \(seconds\)/), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Edit provider/i }))
    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    expect(JSON.parse((mockFetch.mock.calls[0]?.[1] as RequestInit).body as string)).toMatchObject({ cacheRefreshSeconds: null })
    vi.unstubAllGlobals()
  })

  it('posts a single edited provider object in edit mode', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ providers: [] }), { status: 200 }),
    )
    vi.stubGlobal('fetch', mockFetch)
    const onClose = vi.fn()
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={onClose} existingProviders={[mockProviderA]} provider={mockProviderA} />,
    )

    fireEvent.change(screen.getByLabelText('Provider name'), { target: { value: 'Renamed vCenter' } })
    fireEvent.click(screen.getByRole('button', { name: /Edit provider/i }))

    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })

    const init = mockFetch.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(init.body as string) as ProviderRecord
    expect(body).toMatchObject({ id: 'vmware-vcenter-01', name: 'Renamed vCenter' })
    expect(body.notificationEmail).toBe('provider-alerts@example.test')
    vi.unstubAllGlobals()
  })

  it('blocks an invalid notification email before requesting', () => {
    const mockFetch = vi.fn()
    vi.stubGlobal('fetch', mockFetch)

    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[]} />,
    )

    fillValidForm()
    fireEvent.change(screen.getByLabelText('Notification email'), { target: { value: 'invalid-email' } })
    fireEvent.click(screen.getByRole('button', { name: /Create provider/i }))

    expect(screen.getByText('Enter a valid email address.')).toBeInTheDocument()
    expect(mockFetch).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('submits null when an edited notification email is cleared', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ providers: [] }), { status: 200 }))
    vi.stubGlobal('fetch', mockFetch)
    const onClose = vi.fn()

    renderWithQueryClient(
      <ProvidersCreateModal
        open
        onClose={onClose}
        existingProviders={[mockProviderA]}
        provider={mockProviderA}
      />,
    )

    fireEvent.change(screen.getByLabelText('Notification email'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: /Edit provider/i }))

    await waitFor(() => { expect(onClose).toHaveBeenCalledOnce() })
    const init = mockFetch.mock.calls[0]?.[1] as RequestInit
    const body = JSON.parse(init.body as string) as { notificationEmail?: unknown }
    expect(body.notificationEmail).toBeNull()
    vi.unstubAllGlobals()
  })

  it('warns before closing a dirty provider form', () => {
    const onClose = vi.fn()
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={onClose} existingProviders={[]} />,
    )

    fireEvent.change(screen.getByLabelText('Provider name'), { target: { value: 'Unsaved provider' } })
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Discard unsaved provider changes?' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('warns before closing when only cache refresh interval changes', () => {
    const onClose = vi.fn()
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={onClose} existingProviders={[]} />,
    )

    fireEvent.change(screen.getByLabelText(/Cache refresh interval \(seconds\)/), { target: { value: '60' } })
    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }))

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Discard unsaved provider changes?' })).toBeInTheDocument()
  })
})
