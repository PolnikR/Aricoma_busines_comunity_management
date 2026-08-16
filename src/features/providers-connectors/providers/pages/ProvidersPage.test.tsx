import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProviders } from '../hooks/useProviders'
import type { ProviderRecord, ProviderRoleFilter } from '../model/providerTypes'
import { ProvidersPage } from './ProvidersPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useProviders', () => ({ useProviders: vi.fn() }))
vi.mock('../components/ProvidersCatalogueTable', () => ({
  ProvidersCatalogueTable: ({
    providers,
    roleFilter,
    onRoleFilterChange,
  }: {
    providers: ProviderRecord[]
    roleFilter?: ProviderRoleFilter
    onRoleFilterChange?: (role: ProviderRoleFilter) => void
  }) => (
    <div>
      <div>Provider catalogue</div>
      <div>Role: {roleFilter ?? 'missing'}</div>
      {providers.map(provider => <div key={provider.id}>{provider.name}</div>)}
      <button onClick={() => { onRoleFilterChange?.('source') }}>Apply source role</button>
      <button onClick={() => { onRoleFilterChange?.('target') }}>Apply target role</button>
    </div>
  ),
}))
vi.mock('../components/ProvidersCreateModal', () => ({
  ProvidersCreateModal: ({ open, existingProviders }: { open: boolean; existingProviders: unknown[] }) => (
    open ? <div>Provider modal with {existingProviders.length} existing</div> : null
  ),
}))

beforeEach(() => {
  vi.mocked(useProviders).mockReturnValue({
    data: [{ id: 'provider-1' }],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useProviders>)
})

describe('ProvidersPage', () => {
  it('renders only infrastructure providers without provider-category tabs', async () => {
    render(<ProvidersPage />)

    expect(screen.getByText('Provider catalogue')).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.queryByText('Platform provider catalogue')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }))
    expect(screen.getByText('Provider modal with 1 existing')).toBeInTheDocument()
  })

  it('refreshes infrastructure providers from the toolbar', async () => {
    const refetch = vi.fn()
    vi.mocked(useProviders).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch,
    } as unknown as ReturnType<typeof useProviders>)
    render(<ProvidersPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('loads the server-filtered provider list after applying a role', async () => {
    const sourceProvider: ProviderRecord = {
      id: 'source-provider',
      name: 'Source provider',
      description: 'Source infrastructure',
      type: 'VMWARE',
      ipAddress: '10.0.0.1',
      credentialId: 'source-admin',
      role: 'source',
      credentialStatus: 'ok',
    }
    const targetProvider: ProviderRecord = {
      id: 'target-provider',
      name: 'Target provider',
      description: 'Target infrastructure',
      type: 'VMWARE',
      ipAddress: '10.0.0.2',
      credentialId: 'target-admin',
      role: 'target',
      credentialStatus: 'ok',
    }
    vi.mocked(useProviders).mockImplementation((role = 'all') => ({
      data: role === 'source' ? [sourceProvider] : [sourceProvider, targetProvider],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    }) as unknown as ReturnType<typeof useProviders>)

    render(<ProvidersPage />)
    expect(screen.getByText('Role: all')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Apply source role' }))

    expect(screen.getByText('Role: source')).toBeInTheDocument()
    expect(screen.getByText('Source provider')).toBeInTheDocument()
    expect(screen.queryByText('Target provider')).not.toBeInTheDocument()
    expect(useProviders).toHaveBeenCalledWith('source')
  })

  it('keeps the complete provider list available to the create modal', async () => {
    const sourceProvider = {
      id: 'source-provider',
      name: 'Source provider',
    }
    const targetProvider = {
      id: 'target-provider',
      name: 'Target provider',
    }
    vi.mocked(useProviders).mockImplementation((role = 'all') => ({
      data: role === 'target' ? [targetProvider] : [sourceProvider, targetProvider],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    }) as unknown as ReturnType<typeof useProviders>)

    render(<ProvidersPage />)
    await userEvent.click(screen.getByRole('button', { name: 'Apply target role' }))
    expect(screen.getByText('Role: target')).toBeInTheDocument()
    expect(screen.queryByText('Source provider')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }))

    expect(screen.getByText('Provider modal with 2 existing')).toBeInTheDocument()
  })
})
