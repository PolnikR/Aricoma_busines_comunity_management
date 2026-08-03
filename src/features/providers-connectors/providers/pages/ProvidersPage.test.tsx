import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useProviders } from '../hooks/useProviders'
import { ProvidersPage } from './ProvidersPage'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useProviders', () => ({ useProviders: vi.fn() }))
vi.mock('../components/ProvidersCatalogueTable', () => ({
  ProvidersCatalogueTable: () => <div>Provider catalogue</div>,
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
})
