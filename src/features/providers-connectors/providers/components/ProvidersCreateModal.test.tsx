import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProvidersCreateModal } from './ProvidersCreateModal'
import type { ProviderRecord } from '../model/providerTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
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
  port: 22,
  credentialId: 'vcenter-admin',
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
  fireEvent.change(screen.getByLabelText('IP address'), { target: { value: '10.0.0.1' } })
}

describe('ProvidersCreateModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
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
    expect(screen.getByLabelText('Port')).toHaveValue(22)
    expect(screen.getByLabelText('Credentials')).toBeInTheDocument()
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

  it('shows error message on submit failure', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Invalid provider' }), { status: 400 }),
    )
    vi.stubGlobal('fetch', mockFetch)

    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[]} />,
    )

    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /Create Provider/i }))

    await waitFor(() => {
      expect(screen.getByText(/Failed to create provider/i)).toBeInTheDocument()
    })

    vi.unstubAllGlobals()
  })

  it('prefills fields and locks the id in edit mode', () => {
    renderWithQueryClient(
      <ProvidersCreateModal open onClose={vi.fn()} existingProviders={[mockProviderA]} provider={mockProviderA} />,
    )
    expect(screen.getByRole('heading', { name: 'Edit provider' })).toBeInTheDocument()
    const idInput = screen.getByLabelText('ID')
    const nameInput = screen.getByLabelText('Provider name')
    expect((idInput as HTMLInputElement).value).toBe('vmware-vcenter-01')
    expect(idInput).toBeDisabled()
    expect((nameInput as HTMLInputElement).value).toBe('Production vCenter')
    expect(screen.getByLabelText('Credentials')).toHaveValue('vcenter-admin')
  })

  it('posts a single edited provider object in edit mode', async () => {
    const mockFetch = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({}), { status: 200 }),
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
})
