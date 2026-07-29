import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ProvidersCatalogueTable } from './ProvidersCatalogueTable'
import type { ProviderRecord } from '../model/providerTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('react-router-dom', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router-dom')>(),
  useBlocker: () => ({ state: 'unblocked' as const }),
}))

const providerA: ProviderRecord = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter',
  description: 'Primary vCenter',
  type: 'VMWARE',
  ipAddress: '10.99.99.40',
  credentialId: 'vcenter-admin',
  credentialStatus: 'ok',
}
const providerB: ProviderRecord = {
  id: 'flashsystem-01',
  name: 'Backup FlashSystem',
  description: 'DR array',
  type: 'FLASHCOPY',
  ipAddress: '10.99.99.41',
  credentialId: null,
  credentialStatus: 'none',
}

function mockFetch() {
  return vi.fn((input: string | URL) => {
    const url = String(input)
    if (url.includes('get_providers')) {
      return Promise.resolve(new Response(JSON.stringify({ providers: [providerA, providerB] }), { status: 200 }))
    }
    if (url.includes('delete_provider')) {
      return Promise.resolve(new Response(JSON.stringify({ providers: [providerB] }), { status: 200 }))
    }
    return Promise.reject(new Error(`unexpected fetch: ${url}`))
  })
}

function renderTable() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={queryClient}><ProvidersCatalogueTable /></QueryClientProvider>)
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

  it('opens the detail drawer with actions when a row is clicked', async () => {
    renderTable()
    fireEvent.click(await screen.findByText('Production vCenter'))
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
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
})
