import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGetPlatformProviders } from '@/generated/query/platform-providers/platform-providers.gen'
import { PlatformProvidersPage } from './PlatformProvidersPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/platform-providers/platform-providers.gen', () => ({ useGetPlatformProviders: vi.fn() }))
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
  vi.mocked(useGetPlatformProviders).mockReturnValue({
    data: [{ id: 'platform-provider-1' }],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGetPlatformProviders>)
})

describe('PlatformProvidersPage', () => {
  it('renders platform providers as an independent administration page', async () => {
    render(<PlatformProvidersPage />)

    expect(screen.getByText('Platform provider catalogue ready')).toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Add provider' }))
    expect(screen.getByText('Platform provider modal with 1 existing')).toBeInTheDocument()
  })

  it('refreshes platform providers from its own toolbar', async () => {
    const refetch = vi.fn()
    vi.mocked(useGetPlatformProviders).mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch,
    } as unknown as ReturnType<typeof useGetPlatformProviders>)
    render(<PlatformProvidersPage />)

    await userEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('keeps the page header and create action visible during initial loading', () => {
    vi.mocked(useGetPlatformProviders).mockReturnValue({
      data: [],
      isLoading: true,
      isFetching: true,
      error: null,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof useGetPlatformProviders>)

    render(<PlatformProvidersPage />)

    expect(screen.getByRole('heading', { name: 'Platform providers' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Add provider' })).toBeVisible()
    expect(screen.getByText('Platform provider catalogue loading')).toBeVisible()
  })
})
