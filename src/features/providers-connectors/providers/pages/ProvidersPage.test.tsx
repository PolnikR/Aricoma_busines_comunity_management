import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlatformProviders } from '../hooks/usePlatformProviders'
import { useProviders } from '../hooks/useProviders'
import { ProvidersPage } from './ProvidersPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useProviders', () => ({ useProviders: vi.fn() }))
vi.mock('../hooks/usePlatformProviders', () => ({ usePlatformProviders: vi.fn() }))
vi.mock('../components/ProvidersCatalogueTable', () => ({
  ProvidersCatalogueTable: () => <div>Provider catalogue</div>,
}))
vi.mock('../components/PlatformProvidersTable', () => ({
  PlatformProvidersTable: () => <div>Platform provider catalogue</div>,
}))
vi.mock('../components/ProvidersCreateModal', () => ({
  ProvidersCreateModal: ({ open, existingProviders }: { open: boolean; existingProviders: unknown[] }) => (
    open ? <div>Provider modal with {existingProviders.length} existing</div> : null
  ),
}))
vi.mock('../components/PlatformProvidersModal', () => ({
  PlatformProvidersModal: ({ open, existingProviders }: { open: boolean; existingProviders: unknown[] }) => (
    open ? <div>Platform provider modal with {existingProviders.length} existing</div> : null
  ),
}))

beforeEach(() => {
  vi.mocked(useProviders).mockReturnValue({
    data: [{ id: 'provider-1' }],
    isFetching: false,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useProviders>)
  vi.mocked(usePlatformProviders).mockReturnValue({
    data: [{ id: 'platform-provider-1' }],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePlatformProviders>)
})

describe('ProvidersPage', () => {
  it('renders platform providers first and opens the platform create modal with cached records', async () => {
    render(<ProvidersPage />)
    expect(screen.getByText('Platform provider catalogue')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Add Platform Provider' }))
    expect(screen.getByText('Platform provider modal with 1 existing')).toBeInTheDocument()
  })

  it('switches to infrastructure providers and opens the infrastructure create modal', async () => {
    render(<ProvidersPage />)

    await userEvent.click(screen.getByRole('tab', { name: 'Infrastructure Providers' }))
    expect(screen.getByText('Provider catalogue')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Add Provider' }))
    expect(screen.getByText('Provider modal with 1 existing')).toBeInTheDocument()
  })

  it('refreshes active platform providers from the toolbar', async () => {
    const refetchPlatformProviders = vi.fn()
    vi.mocked(usePlatformProviders).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: refetchPlatformProviders,
    } as unknown as ReturnType<typeof usePlatformProviders>)
    render(<ProvidersPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(refetchPlatformProviders).toHaveBeenCalledOnce()
  })

  it('refreshes infrastructure providers from the toolbar after switching tabs', async () => {
    const refetch = vi.fn()
    vi.mocked(useProviders).mockReturnValue({
      data: [],
      isFetching: false,
      refetch,
    } as unknown as ReturnType<typeof useProviders>)
    render(<ProvidersPage />)

    await userEvent.click(screen.getByRole('tab', { name: 'Infrastructure Providers' }))
    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(refetch).toHaveBeenCalledOnce()
  })
})
