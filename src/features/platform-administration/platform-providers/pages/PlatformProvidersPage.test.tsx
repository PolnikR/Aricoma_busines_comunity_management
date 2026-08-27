import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePlatformProviders } from '../hooks/usePlatformProviders'
import { PlatformProvidersPage } from './PlatformProvidersPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/usePlatformProviders', () => ({ usePlatformProviders: vi.fn() }))
vi.mock('../components/PlatformProvidersTable', () => ({
  PlatformProvidersTable: ({ isLoading }: { isLoading: boolean }) => (
    <div>Platform provider catalogue {isLoading ? 'loading' : 'ready'}</div>
  ),
}))
vi.mock('../components/PlatformProvidersModal', () => ({
  PlatformProvidersModal: ({ open, existingProviders }: { open: boolean; existingProviders: unknown[] }) => (
    open ? <div>Platform provider modal with {existingProviders.length} existing</div> : null
  ),
}))

beforeEach(() => {
  vi.mocked(usePlatformProviders).mockReturnValue({
    data: [{ id: 'platform-provider-1' }],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof usePlatformProviders>)
})

describe('PlatformProvidersPage', () => {
  it('renders platform providers as an independent administration page', async () => {
    render(<PlatformProvidersPage />)

    expect(screen.getByText('Platform provider catalogue ready')).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Add Platform Provider' }))
    expect(screen.getByText('Platform provider modal with 1 existing')).toBeInTheDocument()
  })

  it('refreshes platform providers from its own toolbar', async () => {
    const refetch = vi.fn()
    vi.mocked(usePlatformProviders).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch,
    } as unknown as ReturnType<typeof usePlatformProviders>)
    render(<PlatformProvidersPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('keeps the page header and create action visible during initial loading', () => {
    vi.mocked(usePlatformProviders).mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof usePlatformProviders>)

    render(<PlatformProvidersPage />)

    expect(screen.getByRole('heading', { name: 'Platform Providers' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Add Platform Provider' })).toBeVisible()
    expect(screen.getByText('Platform provider catalogue loading')).toBeVisible()
  })
})
