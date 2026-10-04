import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import {
  useGetDiscoveryCacheConfig,
  useGetDiscoveryCacheHistory,
  usePutDiscoveryCacheConfig,
} from '@/generated/query/discovery-cache/discovery-cache.gen'
import type { CacheConfigResponseOutput, CacheConfigUpdate } from '@/generated/query/zod'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/generated/query/discovery-cache/discovery-cache.gen', () => ({
  useGetDiscoveryCacheConfig: vi.fn(),
  usePutDiscoveryCacheConfig: vi.fn(),
  useGetDiscoveryCacheHistory: vi.fn(),
}))

import { DiscoverySettingsPage } from './DiscoverySettingsPage'

const config: CacheConfigResponseOutput = {
  defaults: { VMWARE: 300, CUSTOM_ENGINE: 600 },
  history_retention: { retention_days: 30, max_records: 100 },
}

function queryResult(overrides: Record<string, unknown> = {}) {
  return {
    data: config,
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  }
}

function mutationResult(overrides: Record<string, unknown> = {}) {
  return {
    mutate: vi.fn(),
    isPending: false,
    error: null,
    reset: vi.fn(),
    ...overrides,
  }
}

function renderPage(initialEntry = '/discovery-inventory/discovery-settings') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <DiscoverySettingsPage />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('DiscoverySettingsPage', () => {
  beforeEach(() => {
    vi.mocked(useGetDiscoveryCacheConfig).mockReturnValue(queryResult() as unknown as ReturnType<typeof useGetDiscoveryCacheConfig>)
    vi.mocked(usePutDiscoveryCacheConfig).mockReturnValue(mutationResult() as unknown as ReturnType<typeof usePutDiscoveryCacheConfig>)
    vi.mocked(useGetDiscoveryCacheHistory).mockReturnValue(queryResult({ data: [] }) as unknown as ReturnType<typeof useGetDiscoveryCacheHistory>)
  })

  it('mounts only the active top-level tab panel', async () => {
    const user = userEvent.setup()
    renderPage()

    const configuration = await screen.findByRole('region', { name: 'Cache configuration' })
    expect(within(configuration).getByRole('tablist', { name: 'Discovery settings sections' })).toBeInTheDocument()
    expect(within(configuration).getAllByRole('tab')).toHaveLength(3)
    expect(screen.queryByRole('region', { name: 'Discovery schedule' })).not.toBeInTheDocument()
    expect(screen.getByRole('tabpanel', { name: 'Configuration' })).not.toHaveClass('lg:grid-cols-2')
    expect(screen.queryByRole('region', { name: 'Discovery history' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Failure notifications' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'History' }))

    const historyPanel = screen.getByRole('tabpanel', { name: 'History' })
    const history = screen.getByRole('region', { name: 'Discovery history' })
    expect(within(history).getByRole('tablist', { name: 'Discovery settings sections' })).toBeInTheDocument()
    expect(within(history).getByLabelText('Discovery history runs')).toBeInTheDocument()
    expect(historyPanel.parentElement).toHaveClass('overflow-hidden')
    expect(historyPanel.parentElement).not.toHaveClass('overflow-y-auto')
    expect(screen.queryByRole('region', { name: 'Discovery schedule' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Cache configuration' })).not.toBeInTheDocument()
  })

  it('persists notification edits locally and restores the saved baseline on Cancel', async () => {
    const mutate = vi.fn()
    vi.mocked(usePutDiscoveryCacheConfig).mockReturnValue(mutationResult({ mutate }) as unknown as ReturnType<typeof usePutDiscoveryCacheConfig>)
    const user = userEvent.setup()
    renderPage('/discovery-inventory/discovery-settings?tab=notifications')
    const notifications = screen.getByRole('region', { name: 'Failure notifications' })
    const recipient = within(notifications).getByLabelText('Notification recipient')

    await user.selectOptions(recipient, 'martin')
    await user.click(within(notifications).getByRole('button', { name: 'Save notification changes' }))
    await user.selectOptions(recipient, 'jana')
    await user.click(within(notifications).getByRole('button', { name: 'Cancel notification changes' }))

    expect(recipient).toHaveValue('martin')
    expect(within(notifications).getByRole('status')).toHaveTextContent('Notification changes discarded locally.')
    expect(mutate).not.toHaveBeenCalled()
  })

  it('prepares a local notification test for the selected recipient without cache requests', async () => {
    const mutate = vi.fn()
    vi.mocked(usePutDiscoveryCacheConfig).mockReturnValue(mutationResult({ mutate }) as unknown as ReturnType<typeof usePutDiscoveryCacheConfig>)
    const user = userEvent.setup()
    renderPage('/discovery-inventory/discovery-settings?tab=notifications')
    const notifications = screen.getByRole('region', { name: 'Failure notifications' })

    await user.selectOptions(within(notifications).getByLabelText('Notification recipient'), 'martin')
    await user.click(within(notifications).getByRole('button', { name: 'Send test' }))

    expect(within(notifications).getByRole('status')).toHaveTextContent('Test notification prepared for martin.horvath@example.com.')
    expect(mutate).not.toHaveBeenCalled()
  })

  it('sends only the changed TTL and adopts the response without another GET', async () => {
    const mutate = vi.fn((variables: { data: CacheConfigUpdate }, options?: { onSuccess?: (data: CacheConfigResponseOutput) => void }) => {
      options?.onSuccess?.({
        defaults: { ...config.defaults, ...variables.data.defaults },
        history_retention: { ...config.history_retention, ...variables.data.history_retention } as CacheConfigResponseOutput['history_retention'],
      })
    })
    vi.mocked(usePutDiscoveryCacheConfig).mockReturnValue(mutationResult({ mutate }) as unknown as ReturnType<typeof usePutDiscoveryCacheConfig>)
    const user = userEvent.setup()
    renderPage()
    const cache = await screen.findByRole('region', { name: 'Cache configuration' })
    const vmwareTtl = await within(cache).findByLabelText('VMware cache TTL (seconds)')

    expect(within(cache).getByLabelText('CUSTOM_ENGINE cache TTL (seconds)')).toHaveValue('600')
    await user.clear(vmwareTtl)
    await user.type(vmwareTtl, '120')
    await user.click(within(cache).getByRole('button', { name: 'Save cache configuration' }))

    await waitFor(() => {
      expect(mutate.mock.calls[0]?.[0]).toEqual({ data: { defaults: { VMWARE: 120 } } })
    })
    expect(within(cache).getByLabelText('CUSTOM_ENGINE cache TTL (seconds)')).toHaveValue('600')
    expect(within(cache).getByRole('status')).toHaveTextContent('Cache configuration saved.')
    expect(within(cache).getByRole('button', { name: 'Save cache configuration' })).toBeDisabled()
  })

  it('sends only the changed retention field', async () => {
    const mutate = vi.fn()
    vi.mocked(usePutDiscoveryCacheConfig).mockReturnValue(mutationResult({ mutate }) as unknown as ReturnType<typeof usePutDiscoveryCacheConfig>)
    const user = userEvent.setup()
    renderPage()
    const cache = await screen.findByRole('region', { name: 'Cache configuration' })
    const retentionDays = await within(cache).findByLabelText('History retention (days)')

    await user.clear(retentionDays)
    await user.type(retentionDays, '45')
    await user.click(within(cache).getByRole('button', { name: 'Save cache configuration' }))

    await waitFor(() => {
      expect(mutate.mock.calls[0]?.[0]).toEqual({
        data: { history_retention: { retention_days: 45 } },
      })
    })
  })

  it('disables Cache Save for invalid values and Cancel restores the server baseline', async () => {
    const mutate = vi.fn()
    vi.mocked(usePutDiscoveryCacheConfig).mockReturnValue(mutationResult({ mutate }) as unknown as ReturnType<typeof usePutDiscoveryCacheConfig>)
    const user = userEvent.setup()
    renderPage()
    const cache = await screen.findByRole('region', { name: 'Cache configuration' })
    const vmwareTtl = await within(cache).findByLabelText('VMware cache TTL (seconds)')
    const save = within(cache).getByRole('button', { name: 'Save cache configuration' })

    await user.clear(vmwareTtl)

    expect(save).toBeDisabled()
    expect(within(cache).getByText('Enter a positive whole number.')).toBeInTheDocument()

    await user.type(vmwareTtl, '120')
    await user.click(within(cache).getByRole('button', { name: 'Cancel cache changes' }))

    expect(vmwareTtl).toHaveValue('300')
    expect(save).toBeDisabled()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('keeps only the Cache configuration loading state visible', () => {
    vi.mocked(useGetDiscoveryCacheConfig).mockReturnValue(
      queryResult({ data: undefined, isLoading: true }) as unknown as ReturnType<typeof useGetDiscoveryCacheConfig>,
    )
    renderPage()

    expect(screen.queryByRole('region', { name: 'Discovery schedule' })).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Loading cache configuration' })).toHaveAttribute('aria-busy', 'true')
  })

  it('shows a safe load error and retries the config GET', async () => {
    const refetch = vi.fn()
    vi.mocked(useGetDiscoveryCacheConfig).mockReturnValue(
      queryResult({
        data: undefined,
        error: new OrvalApiError(403, 'Forbidden', { detail: 'Configuration access denied.' }),
        refetch,
      }) as unknown as ReturnType<typeof useGetDiscoveryCacheConfig>,
    )
    const user = userEvent.setup()
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Configuration access denied.')
    await user.click(screen.getByRole('button', { name: 'Retry loading cache configuration' }))

    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('keeps the dirty draft after a safe mutation error', async () => {
    vi.mocked(usePutDiscoveryCacheConfig).mockReturnValue(
      mutationResult({
        mutate: vi.fn(),
        error: new OrvalApiError(400, 'Bad Request', { detail: 'TTL is outside the allowed range.' }),
      }) as unknown as ReturnType<typeof usePutDiscoveryCacheConfig>,
    )
    const user = userEvent.setup()
    renderPage()
    const cache = await screen.findByRole('region', { name: 'Cache configuration' })
    const vmwareTtl = await within(cache).findByLabelText('VMware cache TTL (seconds)')

    await user.clear(vmwareTtl)
    await user.type(vmwareTtl, '120')
    await user.click(within(cache).getByRole('button', { name: 'Save cache configuration' }))

    expect(await within(cache).findByRole('alert')).toHaveTextContent('TTL is outside the allowed range.')
    expect(vmwareTtl).toHaveValue('120')
    expect(within(cache).getByRole('button', { name: 'Save cache configuration' })).toBeEnabled()
  })
})
