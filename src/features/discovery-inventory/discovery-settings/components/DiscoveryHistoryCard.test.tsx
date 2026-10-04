import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { CacheRunRecordOutput, GetDiscoveryCacheHistoryParams } from '@/generated/query/zod'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'

const labels = vi.hoisted(() => ({
  'pages.discoverySettings.history.title': 'Discovery history',
  'pages.discoverySettings.history.description': 'Review recent server discovery runs.',
  'pages.discoverySettings.history.filters.provider': 'Provider',
  'pages.discoverySettings.history.filters.allProviders': 'All infrastructure providers',
  'pages.discoverySettings.history.actions.refresh': 'Refresh history',
  'pages.discoverySettings.history.actions.refreshing': 'Refreshing history',
  'pages.discoverySettings.history.table.ariaLabel': 'Discovery history runs',
  'pages.discoverySettings.history.table.loading': 'Loading discovery history',
  'pages.discoverySettings.history.pagination.ariaLabel': 'Discovery history pagination',
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
  useGetDiscoveryCacheHistory: vi.fn<(params?: GetDiscoveryCacheHistoryParams, options?: unknown) => unknown>(),
  useProviders: vi.fn<(params: { role: string }, options?: unknown) => unknown>(),
}))

vi.mock('@/generated/query/discovery-cache/discovery-cache.gen', () => ({
  useGetDiscoveryCacheHistory: hooks.useGetDiscoveryCacheHistory,
}))

vi.mock('@/generated/query/providers/providers.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/providers/providers.gen')>(),
  useGetProviders: hooks.useProviders,
}))

import { DiscoveryHistoryCard } from './DiscoveryHistoryCard'
import { selectDiscoveryCacheHistory } from '../model/selectDiscoveryCacheHistory'

const selectOptions = { query: { select: selectDiscoveryCacheHistory } }

const providers: ProviderRecord[] = [
  {
    id: 'vmware-01',
    name: 'Primary vCenter',
    description: '',
    type: 'VMWARE',
    role: 'source',
    ipAddress: '192.0.2.10',
    credentialId: 'credential-01',
    credentialStatus: 'ok',
  },
  {
    id: 'power-01',
    name: 'Production Power',
    description: '',
    type: 'IBM_POWER',
    role: 'source',
    ipAddress: '192.0.2.20',
    credentialId: 'credential-02',
    credentialStatus: 'ok',
  },
]

const runs: CacheRunRecordOutput[] = [
  {
    provider_id: 'power-01',
    provider_type: 'IBM_POWER',
    triggered_by: 'forced',
    started_at: '2026-08-30T10:20:30.167838',
    duration_ms: 2400,
    success: false,
    record_count: null,
    error: 'Traceback: database password leaked',
  },
  {
    provider_id: 'vmware-01',
    provider_type: 'VMWARE',
    triggered_by: 'stale',
    started_at: '2026-08-29T09:10:11Z',
    duration_ms: 125,
    success: true,
    record_count: 42,
  },
]

const paginatedRuns: CacheRunRecordOutput[] = Array.from({ length: 60 }, (_, index) => ({
  provider_id: `provider-${String(index + 1).padStart(2, '0')}`,
  provider_type: 'VMWARE',
  triggered_by: 'stale',
  started_at: '2026-08-29T09:10:11Z',
  duration_ms: 125,
  success: true,
  record_count: 42,
}))

function historyQuery(overrides: Record<string, unknown> = {}) {
  return {
    data: runs,
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
    hooks.useGetDiscoveryCacheHistory.mockReturnValue(historyQuery())
    hooks.useProviders.mockReturnValue(providersQuery())
  })

  it('requests 100 server records, renders backend order, and keeps pagination outside the vertical scroll region', () => {
    render(<HistoryHarness />)

    expect(hooks.useProviders).toHaveBeenCalledWith({ role: 'all' }, expect.anything())
    expect(hooks.useGetDiscoveryCacheHistory).toHaveBeenLastCalledWith({ limit: 100 }, selectOptions)
    expect(screen.queryByLabelText('Latest runs')).not.toBeInTheDocument()

    const tableViewport = screen.getByLabelText('Discovery history runs')
    const table = within(tableViewport).getByRole('table')
    const renderedProviderIds = within(table).getAllByRole('row').slice(1).map(row => (
      within(row).getAllByRole('cell')[1]?.textContent
    ))

    expect(renderedProviderIds).toEqual(['power-01', 'vmware-01'])
    expect(screen.getByText('30. 8. 2026 10:20:30')).toBeInTheDocument()
    expect(screen.queryByText(/database password leaked/i)).not.toBeInTheDocument()

    const history = tableViewport.closest('section')
    expect(history).not.toBeNull()
    expect(history).toHaveClass('grid', 'min-h-0', 'flex-1', 'grid-rows-[auto_minmax(0,1fr)_auto]', 'rounded-[20px]', 'overflow-hidden')
    const verticalScroll = history?.querySelector('.overflow-y-auto') ?? null
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
    expect(hooks.useGetDiscoveryCacheHistory).toHaveBeenLastCalledWith({ provider_id: 'vmware-01', limit: 100 }, selectOptions)

    await user.selectOptions(providerSelect, '')
    expect(hooks.useGetDiscoveryCacheHistory).toHaveBeenLastCalledWith({ limit: 100 }, selectOptions)
  })

  it('paginates the loaded rows client-side without changing server criteria', async () => {
    const user = userEvent.setup()
    hooks.useGetDiscoveryCacheHistory.mockReturnValue(historyQuery({ data: paginatedRuns }))
    render(<HistoryHarness />)

    expect(screen.getByText('provider-01')).toBeInTheDocument()
    expect(screen.queryByText('provider-26')).not.toBeInTheDocument()
    expect(screen.getByText('Showing 1-25 of 60')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Discovery history pagination' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next page' }))

    expect(screen.queryByText('provider-01')).not.toBeInTheDocument()
    expect(screen.getByText('provider-26')).toBeInTheDocument()
    expect(screen.getByText('Showing 26-50 of 60')).toBeInTheDocument()
    expect(hooks.useGetDiscoveryCacheHistory).toHaveBeenLastCalledWith({ limit: 100 }, selectOptions)
  })

  it('resets to page one when page size changes', async () => {
    const user = userEvent.setup()
    hooks.useGetDiscoveryCacheHistory.mockReturnValue(historyQuery({ data: paginatedRuns }))
    render(<HistoryHarness />)

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('provider-26')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Rows per page'), '50')

    expect(screen.getByLabelText('Rows per page')).toHaveValue('50')
    expect(screen.getByText('provider-01')).toBeInTheDocument()
    expect(screen.getByText('Showing 1-50 of 60')).toBeInTheDocument()
    expect(hooks.useGetDiscoveryCacheHistory).toHaveBeenLastCalledWith({ limit: 100 }, selectOptions)
  })

  it('resets to page one when provider criteria changes', async () => {
    const user = userEvent.setup()
    hooks.useGetDiscoveryCacheHistory.mockReturnValue(historyQuery({ data: paginatedRuns }))
    render(<HistoryHarness />)

    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('provider-26')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Provider'), 'vmware-01')

    expect(await screen.findByText('provider-01')).toBeInTheDocument()
    expect(hooks.useGetDiscoveryCacheHistory).toHaveBeenLastCalledWith({ provider_id: 'vmware-01', limit: 100 }, selectOptions)
  })

  it('preserves a deep-linked provider that is absent from the provider list', () => {
    render(<HistoryHarness initialProviderId="temporarily-missing" />)

    expect(screen.getByLabelText('Provider')).toHaveValue('temporarily-missing')
    expect(hooks.useGetDiscoveryCacheHistory).toHaveBeenLastCalledWith({ provider_id: 'temporarily-missing', limit: 100 }, selectOptions)
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
    hooks.useGetDiscoveryCacheHistory.mockReturnValue(historyQuery({
      data: undefined,
      error: new OrvalApiError(403, 'Forbidden', { detail: 'History access denied.' }),
      refetch: retryHistory,
    }))

    render(<HistoryHarness initialProviderId="vmware-01" />)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('History access denied.')

    await user.click(screen.getByRole('button', { name: 'Retry loading discovery history' }))

    expect(retryHistory).toHaveBeenCalledTimes(1)
    expect(hooks.useGetDiscoveryCacheHistory).toHaveBeenLastCalledWith({ provider_id: 'vmware-01', limit: 100 }, selectOptions)
  })

  it('keeps cached History rows and pagination visible when a refetch fails', async () => {
    const user = userEvent.setup()
    const retryHistory = vi.fn()
    hooks.useGetDiscoveryCacheHistory.mockReturnValue(historyQuery({
      error: new OrvalApiError(503, 'Unavailable', { detail: 'History service unavailable.' }),
      refetch: retryHistory,
    }))

    render(<HistoryHarness initialProviderId="vmware-01" />)

    expect(screen.getByRole('alert')).toHaveTextContent('History service unavailable.')
    expect(screen.getByText('power-01')).toBeInTheDocument()
    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Retry loading discovery history' }))

    expect(retryHistory).toHaveBeenCalledTimes(1)
    expect(hooks.useGetDiscoveryCacheHistory).toHaveBeenLastCalledWith({ provider_id: 'vmware-01', limit: 100 }, selectOptions)
  })

  it('renders shared table and pagination loading states without an empty-state message', () => {
    hooks.useGetDiscoveryCacheHistory.mockReturnValue(historyQuery({
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
    hooks.useGetDiscoveryCacheHistory.mockReturnValue(historyQuery({
      data: [{ ...runs[0], started_at: 'NOT-A-TIMESTAMPZ' }],
    }))

    render(<HistoryHarness />)
    expect(screen.getByText('NOT-A-TIMESTAMPZ')).toBeInTheDocument()
  })

  it('refreshes the current query and renders an accessible empty success state', async () => {
    const user = userEvent.setup()
    const refreshHistory = vi.fn()
    hooks.useGetDiscoveryCacheHistory.mockReturnValue(historyQuery({
      data: [],
      refetch: refreshHistory,
    }))

    render(<HistoryHarness initialProviderId="power-01" />)

    expect(screen.getByRole('status')).toHaveTextContent('No discovery history')
    await user.click(screen.getByRole('button', { name: 'Refresh history' }))

    expect(refreshHistory).toHaveBeenCalledTimes(1)
    expect(hooks.useGetDiscoveryCacheHistory).toHaveBeenLastCalledWith({ provider_id: 'power-01', limit: 100 }, selectOptions)
  })
})
