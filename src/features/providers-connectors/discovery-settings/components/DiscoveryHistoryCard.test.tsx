import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { ProviderRecord } from '../../providers/model/providerTypes'
import type {
  DiscoveryCacheHistory,
  DiscoveryCacheHistoryFilters,
  DiscoveryCacheRun,
} from '../model/discoveryCacheTypes'

const labels = vi.hoisted(() => ({
  'pages.discoverySettings.history.title': 'Discovery history',
  'pages.discoverySettings.history.description': 'Review recent server discovery runs.',
  'pages.discoverySettings.history.filters.provider': 'Provider',
  'pages.discoverySettings.history.filters.allProviders': 'All infrastructure providers',
  'pages.discoverySettings.history.actions.refresh': 'Refresh history',
  'pages.discoverySettings.history.actions.refreshing': 'Refreshing history',
  'pages.discoverySettings.history.table.ariaLabel': 'Discovery history runs',
  'pages.discoverySettings.history.table.loading': 'Loading discovery history',
  'pages.discoverySettings.history.table.empty.title': 'No discovery history',
  'pages.discoverySettings.history.table.empty.description': 'No server discovery runs were returned.',
  'pages.discoverySettings.history.table.columns.started': 'Started',
  'pages.discoverySettings.history.table.columns.provider': 'Provider',
  'pages.discoverySettings.history.table.columns.providerType': 'Provider type',
  'pages.discoverySettings.history.table.columns.triggeredBy': 'Triggered by',
  'pages.discoverySettings.history.table.columns.status': 'Status',
  'pages.discoverySettings.history.table.columns.duration': 'Duration',
  'pages.discoverySettings.history.table.columns.records': 'Records',
  'pages.discoverySettings.history.trigger.stale': 'Stale cache',
  'pages.discoverySettings.history.trigger.forced': 'Forced',
  'pages.discoverySettings.history.trigger.param_change': 'Parameter change',
  'pages.discoverySettings.history.status.success': 'Success',
  'pages.discoverySettings.history.status.failed': 'Failed',
  'pages.discoverySettings.history.loadFailed': 'Discovery history could not be loaded',
  'pages.discoverySettings.history.loadFailedDescription': 'Unable to load discovery history.',
  'pages.discoverySettings.history.actions.retry': 'Retry loading discovery history',
  'pages.discoverySettings.history.providers.loadFailed': 'Infrastructure providers could not be loaded',
  'pages.discoverySettings.history.providers.loadFailedDescription': 'Unable to load infrastructure providers.',
  'pages.discoverySettings.history.providers.retry': 'Retry loading infrastructure providers',
  'pagination.showing': 'Showing {start}-{end} of {total}',
  'pagination.rows': 'Rows',
  'pagination.rowsPerPage': 'Rows per page',
  'pagination.previousPage': 'Previous page',
  'pagination.nextPage': 'Next page',
  'pagination.pageOf': 'Page {page} of {pageCount}',
  'pagination.page': 'Page {number}',
  'pagination.ellipsis': '...',
  'pagination.option10': '10',
  'pagination.option25': '25',
  'pagination.option50': '50',
}))

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => labels[key as keyof typeof labels],
    language: 'en' as const,
  }),
}))

const hooks = vi.hoisted(() => ({
  useDiscoveryCacheHistory: vi.fn<(filters: DiscoveryCacheHistoryFilters) => unknown>(),
  useProviders: vi.fn<(role: string) => unknown>(),
}))

vi.mock('../hooks/useDiscoveryCacheHistory', () => ({
  useDiscoveryCacheHistory: hooks.useDiscoveryCacheHistory,
}))

vi.mock('../../providers/hooks/useProviders', () => ({
  useProviders: hooks.useProviders,
}))

import { DiscoveryHistoryCard } from './DiscoveryHistoryCard'

const providers: ProviderRecord[] = [
  {
    id: 'vmware-01',
    name: 'Primary vCenter',
    description: '',
    type: 'VMWARE',
    ipAddress: '192.0.2.10',
    credentialId: 'credential-01',
    credentialStatus: 'ok',
  },
  {
    id: 'power-01',
    name: 'Production Power',
    description: '',
    type: 'IBM_POWER',
    ipAddress: '192.0.2.20',
    credentialId: 'credential-02',
    credentialStatus: 'ok',
  },
]

const runs: DiscoveryCacheRun[] = [
  {
    providerId: 'power-01',
    providerType: 'IBM_POWER',
    triggeredBy: 'forced',
    startedAt: '2026-08-30T10:20:30Z',
    durationMs: 2400,
    success: false,
    recordCount: null,
    error: 'Traceback: database password leaked',
  },
  {
    providerId: 'vmware-01',
    providerType: 'VMWARE',
    triggeredBy: 'stale',
    startedAt: '2026-08-29T09:10:11Z',
    durationMs: 125,
    success: true,
    recordCount: 42,
  },
]

const paginatedRuns: DiscoveryCacheRun[] = Array.from({ length: 60 }, (_, index) => ({
  providerId: `provider-${String(index + 1).padStart(2, '0')}`,
  providerType: 'VMWARE',
  triggeredBy: 'stale',
  startedAt: '2026-08-29T09:10:11Z',
  durationMs: 125,
  success: true,
  recordCount: 42,
}))

function historyQuery(overrides: Record<string, unknown> = {}) {
  return {
    data: { runs } satisfies DiscoveryCacheHistory,
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  }
}

function providersQuery(overrides: Record<string, unknown> = {}) {
  return {
    data: providers,
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
    ...overrides,
  }
}

function HistoryHarness({ initialProviderId }: { initialProviderId?: string }) {
  const [providerId, setProviderId] = useState(initialProviderId)

  return (
    <DiscoveryHistoryCard
      providerId={providerId}
      onProviderIdChange={value => { setProviderId(value || undefined) }}
    />
  )
}

describe('DiscoveryHistoryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hooks.useDiscoveryCacheHistory.mockReturnValue(historyQuery())
    hooks.useProviders.mockReturnValue(providersQuery())
  })

  it('requests 100 server records, renders backend order, and keeps pagination outside the vertical scroll region', () => {
    render(<HistoryHarness />)

    expect(hooks.useProviders).toHaveBeenCalledWith('all')
    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ limit: 100 })
    expect(screen.queryByLabelText('Latest runs')).not.toBeInTheDocument()

    const table = within(screen.getByLabelText('Discovery history runs')).getByRole('table')
    const renderedProviderIds = within(table).getAllByRole('row').slice(1).map(row => (
      within(row).getAllByRole('cell')[1]?.textContent
    ))

    expect(renderedProviderIds).toEqual(['power-01', 'vmware-01'])
    expect(screen.getByText('2026-08-30 10:20:30 UTC')).toBeInTheDocument()
    expect(screen.queryByText(/database password leaked/i)).not.toBeInTheDocument()

    const history = screen.getByRole('region', { name: 'Discovery history' })
    const verticalScroll = history.querySelector('.overflow-y-auto')
    expect(verticalScroll).toHaveClass('custom-scrollbar', 'min-h-0', 'overflow-y-auto')
    expect(verticalScroll).toContainElement(screen.getByLabelText('Discovery history runs'))
    expect(verticalScroll).not.toContainElement(screen.getByLabelText('Rows per page'))
    expect(screen.getByText('Showing 1-2 of 2')).toBeInTheDocument()
  })

  it('uses provider selection only as a server criterion and All removes it', async () => {
    const user = userEvent.setup()
    render(<HistoryHarness />)

    const providerSelect = screen.getByLabelText('Provider')
    expect(within(providerSelect).getAllByRole('option').map(option => option.textContent)).toEqual([
      'All infrastructure providers',
      'Primary vCenter — VMware',
      'Production Power — IBM Power',
    ])

    await user.selectOptions(providerSelect, 'vmware-01')
    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ providerId: 'vmware-01', limit: 100 })

    await user.selectOptions(providerSelect, '')
    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ limit: 100 })
  })

  it('paginates the loaded rows client-side without changing server criteria', async () => {
    const user = userEvent.setup()
    hooks.useDiscoveryCacheHistory.mockReturnValue(historyQuery({ data: { runs: paginatedRuns } }))
    render(<HistoryHarness />)

    expect(screen.getByText('provider-01')).toBeInTheDocument()
    expect(screen.queryByText('provider-26')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1-25 of 60')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next page' }))

    expect(screen.queryByText('provider-01')).not.toBeInTheDocument()
    expect(screen.getByText('provider-26')).toBeInTheDocument()
    expect(screen.getByText('Showing 26-50 of 60')).toBeInTheDocument()
    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ limit: 100 })
  })

  it('resets to page one when page size changes', async () => {
    const user = userEvent.setup()
    hooks.useDiscoveryCacheHistory.mockReturnValue(historyQuery({ data: { runs: paginatedRuns } }))
    render(<HistoryHarness />)

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('provider-26')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Rows per page'), '50')

    expect(screen.getByLabelText('Rows per page')).toHaveValue('50')
    expect(screen.getByText('provider-01')).toBeInTheDocument()
    expect(screen.getByText('Showing 1-50 of 60')).toBeInTheDocument()
    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ limit: 100 })
  })

  it('resets to page one when provider criteria changes', async () => {
    const user = userEvent.setup()
    hooks.useDiscoveryCacheHistory.mockReturnValue(historyQuery({ data: { runs: paginatedRuns } }))
    render(<HistoryHarness />)

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('provider-26')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Provider'), 'vmware-01')

    expect(await screen.findByText('provider-01')).toBeInTheDocument()
    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ providerId: 'vmware-01', limit: 100 })
  })

  it('preserves a deep-linked provider that is absent from the provider list', () => {
    render(<HistoryHarness initialProviderId="temporarily-missing" />)

    expect(screen.getByLabelText('Provider')).toHaveValue('temporarily-missing')
    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ providerId: 'temporarily-missing', limit: 100 })
  })

  it('keeps successful History rows visible when the provider list fails and retries only that query', async () => {
    const user = userEvent.setup()
    const retryProviders = vi.fn()
    hooks.useProviders.mockReturnValue(providersQuery({
      data: undefined,
      error: new OrvalApiError(503, 'Unavailable', { detail: 'Provider directory unavailable.' }),
      refetch: retryProviders,
    }))

    render(<HistoryHarness />)

    expect(within(screen.getByLabelText('Discovery history runs')).getByRole('table')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Provider directory unavailable.')

    await user.click(screen.getByRole('button', { name: 'Retry loading infrastructure providers' }))
    expect(retryProviders).toHaveBeenCalledTimes(1)
  })

  it('shows a safe first-load History error and retries the same criteria', async () => {
    const user = userEvent.setup()
    const retryHistory = vi.fn()
    hooks.useDiscoveryCacheHistory.mockReturnValue(historyQuery({
      data: undefined,
      error: new OrvalApiError(403, 'Forbidden', { detail: 'History access denied.' }),
      refetch: retryHistory,
    }))

    render(<HistoryHarness initialProviderId="vmware-01" />)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('History access denied.')

    await user.click(screen.getByRole('button', { name: 'Retry loading discovery history' }))

    expect(retryHistory).toHaveBeenCalledTimes(1)
    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ providerId: 'vmware-01', limit: 100 })
  })

  it('keeps cached History rows and pagination visible when a refetch fails', async () => {
    const user = userEvent.setup()
    const retryHistory = vi.fn()
    hooks.useDiscoveryCacheHistory.mockReturnValue(historyQuery({
      error: new OrvalApiError(503, 'Unavailable', { detail: 'History service unavailable.' }),
      refetch: retryHistory,
    }))

    render(<HistoryHarness initialProviderId="vmware-01" />)

    expect(screen.getByRole('alert')).toHaveTextContent('History service unavailable.')
    expect(screen.getByText('power-01')).toBeInTheDocument()
    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry loading discovery history' }))

    expect(retryHistory).toHaveBeenCalledTimes(1)
    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ providerId: 'vmware-01', limit: 100 })
  })

  it('renders shared table and pagination loading states without an empty-state message', () => {
    hooks.useDiscoveryCacheHistory.mockReturnValue(historyQuery({
      data: undefined,
      isLoading: true,
      isFetching: true,
    }))

    render(<HistoryHarness />)

    expect(screen.getByRole('status', { name: 'Loading discovery history' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByLabelText('Rows per page')).toBeDisabled()
    expect(screen.queryByText('No discovery history')).not.toBeInTheDocument()
  })

  it('leaves an unexpected started-at string unchanged', () => {
    hooks.useDiscoveryCacheHistory.mockReturnValue(historyQuery({
      data: {
        runs: [{ ...runs[0], startedAt: 'NOT-A-TIMESTAMPZ' }],
      },
    }))

    render(<HistoryHarness />)
    expect(screen.getByText('NOT-A-TIMESTAMPZ')).toBeInTheDocument()
  })

  it('refreshes the current query and renders an accessible empty success state', async () => {
    const user = userEvent.setup()
    const refreshHistory = vi.fn()
    hooks.useDiscoveryCacheHistory.mockReturnValue(historyQuery({
      data: { runs: [] },
      refetch: refreshHistory,
    }))

    render(<HistoryHarness initialProviderId="power-01" />)

    expect(screen.getByRole('status')).toHaveTextContent('No discovery history')
    await user.click(screen.getByRole('button', { name: 'Refresh history' }))

    expect(refreshHistory).toHaveBeenCalledTimes(1)
    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ providerId: 'power-01', limit: 100 })
  })
})
