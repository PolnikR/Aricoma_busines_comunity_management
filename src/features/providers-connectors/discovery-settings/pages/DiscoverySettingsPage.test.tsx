import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { DiscoveryCacheConfig, DiscoveryCacheConfigPatch } from '../model/discoveryCacheTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const api = vi.hoisted(() => ({
  fetchDiscoveryCacheConfig: vi.fn(),
  fetchDiscoveryCacheHistory: vi.fn(),
  updateDiscoveryCacheConfig: vi.fn(),
}))

vi.mock('../api/discoveryCacheApi', async importOriginal => ({
  ...await importOriginal<typeof import('../api/discoveryCacheApi')>(),
  fetchDiscoveryCacheConfig: api.fetchDiscoveryCacheConfig,
  fetchDiscoveryCacheHistory: api.fetchDiscoveryCacheHistory,
  updateDiscoveryCacheConfig: api.updateDiscoveryCacheConfig,
}))

import { DiscoverySettingsPage } from './DiscoverySettingsPage'

const config: DiscoveryCacheConfig = {
  defaults: { VMWARE: 300, CUSTOM_ENGINE: 600 },
  historyRetention: { retentionDays: 30, maxRecords: 100 },
}

function renderPage(initialEntry = '/providers-connectors/discovery-settings') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })

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
    vi.clearAllMocks()
    api.fetchDiscoveryCacheConfig.mockResolvedValue(config)
    api.fetchDiscoveryCacheHistory.mockResolvedValue({ runs: [] })
    api.updateDiscoveryCacheConfig.mockImplementation((patch: DiscoveryCacheConfigPatch) => Promise.resolve({
      defaults: { ...config.defaults, ...patch.defaults },
      historyRetention: { ...config.historyRetention, ...patch.historyRetention },
    }))
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
    const user = userEvent.setup()
    renderPage('/providers-connectors/discovery-settings?tab=notifications')
    const notifications = screen.getByRole('region', { name: 'Failure notifications' })
    const recipient = within(notifications).getByLabelText('Notification recipient')

    expect(api.fetchDiscoveryCacheConfig).not.toHaveBeenCalled()
    expect(api.fetchDiscoveryCacheHistory).not.toHaveBeenCalled()

    await user.selectOptions(recipient, 'martin')
    await user.click(within(notifications).getByRole('button', { name: 'Save notification changes' }))
    await user.selectOptions(recipient, 'jana')
    await user.click(within(notifications).getByRole('button', { name: 'Cancel notification changes' }))

    expect(recipient).toHaveValue('martin')
    expect(within(notifications).getByRole('status')).toHaveTextContent('Notification changes discarded locally.')
    expect(api.updateDiscoveryCacheConfig).not.toHaveBeenCalled()
  })

  it('prepares a local notification test for the selected recipient without cache requests', async () => {
    const user = userEvent.setup()
    renderPage('/providers-connectors/discovery-settings?tab=notifications')
    const notifications = screen.getByRole('region', { name: 'Failure notifications' })

    await user.selectOptions(within(notifications).getByLabelText('Notification recipient'), 'martin')
    await user.click(within(notifications).getByRole('button', { name: 'Send test' }))

    expect(within(notifications).getByRole('status')).toHaveTextContent('Test notification prepared for martin.horvath@example.com.')
    expect(api.fetchDiscoveryCacheConfig).not.toHaveBeenCalled()
    expect(api.fetchDiscoveryCacheHistory).not.toHaveBeenCalled()
    expect(api.updateDiscoveryCacheConfig).not.toHaveBeenCalled()
  })

  it('sends only the changed TTL and adopts the response without another GET', async () => {
    const user = userEvent.setup()
    renderPage()
    const cache = await screen.findByRole('region', { name: 'Cache configuration' })
    const vmwareTtl = await within(cache).findByLabelText('VMware cache TTL (seconds)')

    expect(within(cache).getByLabelText('CUSTOM_ENGINE cache TTL (seconds)')).toHaveValue('600')
    await user.clear(vmwareTtl)
    await user.type(vmwareTtl, '120')
    await user.click(within(cache).getByRole('button', { name: 'Save cache configuration' }))

    await waitFor(() => {
      expect(api.updateDiscoveryCacheConfig.mock.calls[0]?.[0]).toEqual({ defaults: { VMWARE: 120 } })
    })
    expect(api.fetchDiscoveryCacheConfig).toHaveBeenCalledTimes(1)
    expect(within(cache).getByLabelText('CUSTOM_ENGINE cache TTL (seconds)')).toHaveValue('600')
    expect(within(cache).getByRole('status')).toHaveTextContent('Cache configuration saved.')
    expect(within(cache).getByRole('button', { name: 'Save cache configuration' })).toBeDisabled()
  })

  it('sends only the changed retention field', async () => {
    const user = userEvent.setup()
    renderPage()
    const cache = await screen.findByRole('region', { name: 'Cache configuration' })
    const retentionDays = await within(cache).findByLabelText('History retention (days)')

    await user.clear(retentionDays)
    await user.type(retentionDays, '45')
    await user.click(within(cache).getByRole('button', { name: 'Save cache configuration' }))

    await waitFor(() => {
      expect(api.updateDiscoveryCacheConfig.mock.calls[0]?.[0]).toEqual({
        historyRetention: { retentionDays: 45 },
      })
    })
  })

  it('disables Cache Save for invalid values and Cancel restores the server baseline', async () => {
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
    expect(api.updateDiscoveryCacheConfig).not.toHaveBeenCalled()
  })

  it('keeps only the Cache configuration loading state visible', () => {
    api.fetchDiscoveryCacheConfig.mockReturnValue(new Promise(() => undefined))
    renderPage()

    expect(screen.queryByRole('region', { name: 'Discovery schedule' })).not.toBeInTheDocument()
    expect(screen.getByRole('status', { name: 'Loading cache configuration' })).toHaveAttribute('aria-busy', 'true')
  })

  it('shows a safe load error and retries the config GET', async () => {
    const user = userEvent.setup()
    api.fetchDiscoveryCacheConfig
      .mockRejectedValueOnce(new OrvalApiError(403, 'Forbidden', { detail: 'Configuration access denied.' }))
      .mockResolvedValueOnce(config)
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent('Configuration access denied.')
    await user.click(screen.getByRole('button', { name: 'Retry loading cache configuration' }))

    expect(await screen.findByLabelText('VMware cache TTL (seconds)')).toHaveValue('300')
    expect(api.fetchDiscoveryCacheConfig).toHaveBeenCalledTimes(2)
  })

  it('keeps the dirty draft after a safe mutation error', async () => {
    const user = userEvent.setup()
    api.updateDiscoveryCacheConfig.mockRejectedValue(
      new OrvalApiError(400, 'Bad Request', { detail: 'TTL is outside the allowed range.' }),
    )
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
