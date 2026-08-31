import { useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import type { ProviderRecord } from '../../providers/model/providerTypes'
import type { DiscoveryCacheHistory, DiscoveryCacheRun } from '../model/discoveryCacheTypes'
import type { DiscoverySettingsHistoryLimit } from '../hooks/useDiscoverySettingsSearchParams'

const labels = vi.hoisted(() => ({
  'pages.discoverySettings.history.title': 'Discovery history',
  'pages.discoverySettings.history.description': 'Review recent server discovery runs.',
  'pages.discoverySettings.history.filters.provider': 'Provider',
  'pages.discoverySettings.history.filters.allProviders': 'All infrastructure providers',
  'pages.discoverySettings.history.filters.limit': 'Latest runs',
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
}))

vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: keyof typeof labels) => labels[key] ?? key,
    language: 'en' as const,
  }),
}))

const hooks = vi.hoisted(() => ({
  useDiscoveryCacheHistory: vi.fn(),
  useProviders: vi.fn(),
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

function HistoryHarness({
  initialProviderId,
  initialLimit = 50,
}: {
  initialProviderId?: string
  initialLimit?: DiscoverySettingsHistoryLimit
}) {
  const [providerId, setProviderId] = useState(initialProviderId)
  const [limit, setLimit] = useState<DiscoverySettingsHistoryLimit>(initialLimit)

  return (
    <DiscoveryHistoryCard
      providerId={providerId}
      limit={limit}
      onProviderIdChange={value => { setProviderId(value || undefined) }}
      onLimitChange={setLimit}
    />
  )
}

describe('DiscoveryHistoryCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    hooks.useDiscoveryCacheHistory.mockReturnValue(historyQuery())
    hooks.useProviders.mockReturnValue(providersQuery())
  })

  it('requests the default server criteria and renders response rows in backend order without raw errors', () => {
    render(<HistoryHarness />)

    expect(hooks.useProviders).toHaveBeenCalledWith('all')
    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ limit: 50 })
    expect(hooks.useDiscoveryCacheHistory.mock.calls.at(-1)?.[0].providerId).toBeUndefined()

    const table = within(screen.getByLabelText('Discovery history runs')).getByRole('table')
    const renderedProviderIds = within(table).getAllByRole('row').slice(1).map(row => (
      within(row).getAllByRole('cell')[1]?.textContent
    ))

    expect(renderedProviderIds).toEqual(['power-01', 'vmware-01'])
    expect(screen.getByText('2026-08-30 10:20:30 UTC')).toBeInTheDocument()
    expect(screen.getByText('IBM Power')).toBeInTheDocument()
    expect(screen.getByText('Forced')).toBeInTheDocument()
    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText(/database password leaked/i)).not.toBeInTheDocument()
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

    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ providerId: 'vmware-01', limit: 50 })
    expect(screen.getByText('power-01')).toBeInTheDocument()

    await user.selectOptions(providerSelect, '')

    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ limit: 50 })
    expect(hooks.useDiscoveryCacheHistory.mock.calls.at(-1)?.[0].providerId).toBeUndefined()
  })

  it('updates the server limit immediately', async () => {
    const user = userEvent.setup()
    render(<HistoryHarness />)

    await user.selectOptions(screen.getByLabelText('Latest runs'), '100')

    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ limit: 100 })
    expect(hooks.useDiscoveryCacheHistory.mock.calls.at(-1)?.[0].providerId).toBeUndefined()
  })

  it('preserves a deep-linked provider that is absent from the provider list', () => {
    render(<HistoryHarness initialProviderId="temporarily-missing" />)

    expect(screen.getByLabelText('Provider')).toHaveValue('temporarily-missing')
    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ providerId: 'temporarily-missing', limit: 50 })
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
    expect(screen.getByText('power-01')).toBeInTheDocument()
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

    render(<HistoryHarness initialProviderId="vmware-01" initialLimit={25} />)

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('History access denied.')

    await user.click(screen.getByRole('button', { name: 'Retry loading discovery history' }))

    expect(retryHistory).toHaveBeenCalledTimes(1)
    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ providerId: 'vmware-01', limit: 25 })
  })

  it('refreshes the current query and renders an accessible empty success state', async () => {
    const user = userEvent.setup()
    const refreshHistory = vi.fn()
    hooks.useDiscoveryCacheHistory.mockReturnValue(historyQuery({
      data: { runs: [] },
      refetch: refreshHistory,
    }))

    render(<HistoryHarness initialProviderId="power-01" initialLimit={100} />)

    expect(screen.getByRole('status')).toHaveTextContent('No discovery history')
    await user.click(screen.getByRole('button', { name: 'Refresh history' }))

    expect(refreshHistory).toHaveBeenCalledTimes(1)
    expect(hooks.useDiscoveryCacheHistory).toHaveBeenLastCalledWith({ providerId: 'power-01', limit: 100 })
  })
})
