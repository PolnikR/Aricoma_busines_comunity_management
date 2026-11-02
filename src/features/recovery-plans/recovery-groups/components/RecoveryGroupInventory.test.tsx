import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createAppQueryClient } from '@/shared/query/createAppQueryClient'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGetRecoveryGroupInventory } from '@/generated/query/recovery-groups/recovery-groups.gen'
import { RecoveryGroupInventory } from './RecoveryGroupInventory'
import { RecoveryGroupInventorySummary } from './RecoveryGroupInventorySummary'

vi.mock('@/generated/query/recovery-groups/recovery-groups.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/recovery-groups/recovery-groups.gen')>(),
  useGetRecoveryGroupInventory: vi.fn(),
}))
// Keys come back as-is with their parameters appended, so labels stay distinguishable.
vi.mock('@/hooks/useTranslation', () => ({
  useTranslation: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) => ({
      'pagination.previousPage': 'Previous page',
      'pagination.nextPage': 'Next page',
      'pagination.pageOf': 'Page {page} of {pageCount}',
      'pagination.page': 'Page {number}',
    })[key] ?? (params ? `${key}:${Object.values(params).join('|')}` : key),
  }),
}))

const AUX = 'auxb099da7e_'
const snapshots = (name: string, count: number) => Array.from({ length: count }, (_, index) => ({
  role: 'source' as const, mapping: { id: `fc-${String(index)}` }, paired_volume: { name: `snap${String(index + 1)}_${name}` },
}))
const volumes = (counts: Record<string, number>) => Object.fromEntries(Object.entries(counts).map(([name, count]) => [AUX + name, { found: true, relations: snapshots(AUX + name, count) }]))
const mapping = (name: string, extra: Record<string, unknown> = {}) => ({ master_volume: name, auxiliary_volume: AUX + name, state: 'inconsistent_copying', progress: 72, primary: 'master', ...extra })
const group = { id: '55', name: 'rdb_and_app', state: 'inconsistent_copying', primary: 'master', relationship_count: 2, progress: 64 }

function mockInventory(data: Record<string, unknown>) {
  vi.mocked(useGetRecoveryGroupInventory).mockReturnValue({
    data: { recovery_group_id: 'group-1', recovery_group_name: 'rdb_and_app', run_id: 'run-1', provider_id_volume: 'ibm-flashsystem-01', volumes: volumes({ V5000_VOLUME01: 2, RDM_DISK01: 14 }), ...data },
    isLoading: false, isFetching: false, error: null, refetch: vi.fn(),
  } as unknown as ReturnType<typeof useGetRecoveryGroupInventory>)
}

function renderInventory() {
  return render(<QueryClientProvider client={createAppQueryClient()}><RecoveryGroupInventory runId="run-1" active /></QueryClientProvider>)
}

const metroMirror = (extra: Record<string, unknown> = {}) => ({
  mode: 'managed', queried_provider_id: 'ibm-flashsystem-02', consistency_group: group,
  mappings: [mapping('V5000_VOLUME01'), mapping('RDM_DISK01', { progress: 64 })], error: null, ...extra,
})
const chainRows = () => [...(screen.queryByRole('list', { name: 'recoveryInventory.chain.title' })?.querySelectorAll<HTMLElement>(':scope > li') ?? [])]
const replication = (row: HTMLElement) => row.querySelector('[data-edge-kind="replication"], [data-edge-kind="problem"]')
const inventoryRow = (name: string) => document.querySelector(`summary span[title="${name}"]`)?.closest('li') ?? null

const scrollIntoView = vi.fn()

beforeEach(() => {
  scrollIntoView.mockClear()
  Element.prototype.scrollIntoView = scrollIntoView
  window.matchMedia = vi.fn().mockReturnValue({ matches: true })
})

describe('RecoveryGroupInventory', () => {
  it('keeps cached volumes on background error and isolates a different run', async () => {
    const actual = await vi.importActual<typeof import('@/generated/query/recovery-groups/recovery-groups.gen')>('@/generated/query/recovery-groups/recovery-groups.gen')
    vi.mocked(useGetRecoveryGroupInventory).mockImplementation(actual.useGetRecoveryGroupInventory)
    const client = createAppQueryClient()
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } })
    let failed = false
    let volume = 'cached-volume'
    vi.stubGlobal('fetch', () => Promise.resolve(Response.json(failed ? { detail: 'Unavailable' } : {
      recovery_group_id: 'group', recovery_group_name: 'Group', run_id: 'run-1', volumes: { [volume]: { found: true, relations: [] } },
    }, { status: failed ? 503 : 200 })))
    const view = render(<QueryClientProvider client={client}><RecoveryGroupInventory runId="run-1" active /></QueryClientProvider>)
    try {
      await screen.findByTitle('cached-volume')
      failed = true
      await act(async () => { await client.refetchQueries() })
      expect(await screen.findByRole('alert')).toHaveTextContent('recoveryInventory.refreshFailed')
      expect(screen.getByTitle('cached-volume')).toBeInTheDocument()
      failed = false
      volume = 'updated-volume'
      fireEvent.click(screen.getByRole('button', { name: 'buttons.retry' }))
      await screen.findByTitle('updated-volume')
      await waitFor(() => { expect(screen.queryByRole('alert')).not.toBeInTheDocument() })
      failed = true
      view.rerender(<QueryClientProvider client={client}><RecoveryGroupInventory runId="run-2" active /></QueryClientProvider>)
      expect(screen.queryByTitle('updated-volume')).not.toBeInTheDocument()
      expect(await screen.findByRole('alert')).toHaveTextContent('recoveryInventory.error')
    } finally {
      view.unmount()
      client.clear()
      vi.unstubAllGlobals()
    }
  })

  it('without Metro Mirror renders only the auxiliary volume inventory', () => {
    mockInventory({})
    renderInventory()

    expect(screen.queryByText('recoveryInventory.metroMirror.title')).toBeNull()
    expect(screen.queryByText('recoveryInventory.chain.title')).toBeNull()
    expect(screen.getByText('recoveryInventory.auxiliary.title')).toBeInTheDocument()
    expect(screen.getByTitle(`${AUX}V5000_VOLUME01`)).toBeInTheDocument()
  })

  it('shows a quiet empty state when Metro Mirror reports no group and no mappings', () => {
    mockInventory({ metro_mirror: metroMirror({ consistency_group: null, mappings: [] }) })
    renderInventory()

    expect(screen.getByText('recoveryInventory.metroMirror.empty')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'recoveryInventory.chain.title' })).toBeNull()
  })

  it('maps master to auxiliary to snapshots with numeric progress and no repeated group state or primary', () => {
    mockInventory({ metro_mirror: metroMirror() })
    renderInventory()
    const [first] = chainRows()
    if (!first) throw new Error('chain row missing')

    expect(chainRows()).toHaveLength(2)
    expect(within(first).getByRole('group', { name: 'V5000_VOLUME01' })).toBeInTheDocument()
    expect(within(first).getByRole('button', { name: `recoveryInventory.chain.showVolume:${AUX}V5000_VOLUME01` })).toBeInTheDocument()
    expect(within(first).getByRole('button', { name: `recoveryInventory.chain.showSnapshots:${AUX}V5000_VOLUME01` })).toHaveTextContent('recoveryInventory.chain.snapshots.other:2')
    expect(replication(first)?.querySelector('[data-connector-value]')).toHaveTextContent('72 %')
    expect(replication(first)?.querySelector('[data-connector-progress]')).toHaveAttribute('data-connector-progress', '72')
    expect(replication(first)?.querySelector('[data-connector-note]')).toBeNull()
    expect(screen.getAllByText('Inconsistent copying')).toHaveLength(1)
    expect(screen.queryByText(/primaryException/)).toBeNull()
  })

  it('shows In sync for synchronized null progress and a real 0 %', () => {
    mockInventory({ metro_mirror: metroMirror({
      consistency_group: { ...group, state: 'consistent_synchronized', progress: null },
      mappings: [mapping('V5000_VOLUME01', { state: 'consistent_synchronized', progress: null }), mapping('RDM_DISK01', { state: 'consistent_synchronized', progress: 0 })],
    }) })
    renderInventory()
    const [synced, zero] = chainRows()

    expect(synced && replication(synced)?.querySelector('[data-connector-value]')).toHaveTextContent('recoveryInventory.metroMirror.inSync')
    expect(synced && replication(synced)?.querySelector('[data-connector-progress]')).toBeNull()
    expect(zero && replication(zero)?.querySelector('[data-connector-value]')).toHaveTextContent('0 %')
  })

  it('prints differing and unknown row states, the primary exception and reverses that row', () => {
    mockInventory({ metro_mirror: metroMirror({
      mappings: [mapping('V5000_VOLUME01', { state: 'consistent_stopped', progress: null }), mapping('RDM_DISK01', { state: 'some_future_state', progress: null, primary: 'aux' })],
    }) })
    renderInventory()
    const [stopped, future] = chainRows()
    if (!stopped || !future) throw new Error('chain rows missing')

    expect(replication(stopped)?.querySelector('[data-connector-note]')).toHaveTextContent('Consistent stopped')
    expect(replication(stopped)?.querySelector('[data-connector-value]')).toHaveTextContent('recoveryInventory.metroMirror.notReported')
    expect(replication(future)?.querySelector('[data-connector-note]')).toHaveTextContent('Some future state · recoveryInventory.metroMirror.primaryException:recoveryInventory.metroMirror.side.aux')
    expect(replication(future)).toHaveAttribute('data-direction', 'backward')
    expect(replication(stopped)).toHaveAttribute('data-direction', 'forward')
    expect([...document.querySelectorAll('[data-connector-note]')].filter(note => note.textContent.includes('primaryException'))).toHaveLength(1)
  })

  it('keeps the auxiliary inventory when Metro Mirror reports an error', () => {
    mockInventory({ metro_mirror: metroMirror({ consistency_group: null, mappings: [], error: 'Provider did not respond' }) })
    renderInventory()

    expect(screen.getByText('recoveryInventory.metroMirror.unavailable')).toBeInTheDocument()
    expect(screen.getByText('Provider did not respond')).toBeInTheDocument()
    expect(screen.getByText('ibm-flashsystem-02')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'recoveryInventory.chain.title' })).toBeNull()
    expect(screen.getByTitle(`${AUX}RDM_DISK01`)).toBeInTheDocument()
  })

  it('draws an auxiliary volume missing from the inventory as a problem node without actions', () => {
    mockInventory({ metro_mirror: metroMirror({ mappings: [mapping('V5000_VOLUME03')] }) })
    renderInventory()
    const [row] = chainRows()
    if (!row) throw new Error('chain row missing')

    expect(within(row).getByRole('group', { name: `${AUX}V5000_VOLUME03` })).toHaveClass('border-dashed')
    expect(within(row).getByText('recoveryInventory.chain.notInInventory')).toBeInTheDocument()
    expect(within(row).queryAllByRole('button')).toHaveLength(0)
    expect(within(row).getByText('recoveryInventory.chain.noInventoryData')).toBeInTheDocument()
  })

  it('reveals the auxiliary volume from the snapshot endpoint as a fan-out with the source drawn once', async () => {
    mockInventory({ metro_mirror: metroMirror() })
    renderInventory()

    await userEvent.setup().click(screen.getByRole('button', { name: `recoveryInventory.chain.showSnapshots:${AUX}RDM_DISK01` }))

    const row = inventoryRow(`${AUX}RDM_DISK01`)
    const details = row?.querySelector('details')
    const list = screen.getByRole('region', { name: `recoveryInventory.fanOut.list:${AUX}RDM_DISK01` })
    expect(details).toHaveAttribute('open')
    expect(scrollIntoView).toHaveBeenCalled()
    expect(row?.querySelector('summary')).toHaveFocus()
    expect(within(list).getAllByRole('listitem')).toHaveLength(14)
    expect(within(list).queryByText(`${AUX}RDM_DISK01`)).toBeNull()
    expect(within(row as HTMLElement).getByRole('group', { name: `${AUX}RDM_DISK01` })).toBeInTheDocument()
    expect(list).toHaveClass('max-h-60', 'overflow-y-auto', 'overscroll-contain')
    expect(list).toHaveAttribute('tabIndex', '0')
    expect(within(list).getByText('recoveryInventory.fanOut.snapshots').parentElement).toHaveClass('sticky', 'top-0')
    expect(screen.getByLabelText('recoveryInventory.showTechnicalJson')).toBeInTheDocument()
  })

  it('cross-highlights the chain row and the inventory row', () => {
    mockInventory({ metro_mirror: metroMirror() })
    renderInventory()

    fireEvent.pointerEnter(screen.getByRole('button', { name: `recoveryInventory.chain.showVolume:${AUX}RDM_DISK01` }))
    expect(inventoryRow(`${AUX}RDM_DISK01`)).toHaveAttribute('data-highlight', 'on')
    expect(inventoryRow(`${AUX}V5000_VOLUME01`)).toHaveAttribute('data-highlight', 'idle')
    fireEvent.pointerLeave(screen.getByRole('button', { name: `recoveryInventory.chain.showVolume:${AUX}RDM_DISK01` }))

    const listRow = inventoryRow(`${AUX}V5000_VOLUME01`)
    if (!listRow) throw new Error('inventory row missing')
    fireEvent.pointerEnter(listRow)
    expect(document.querySelector(`[data-entity-id="aux:${AUX}V5000_VOLUME01"]`)).toHaveAttribute('data-highlight', 'on')
    expect(document.querySelector(`[data-entity-id="aux:${AUX}RDM_DISK01"]`)).toHaveAttribute('data-highlight', 'off')
  })

  it('forces explicit refresh and updates visible snapshots and the shared summary', async () => {
    const actual = await vi.importActual<typeof import('@/generated/query/recovery-groups/recovery-groups.gen')>('@/generated/query/recovery-groups/recovery-groups.gen')
    vi.mocked(useGetRecoveryGroupInventory).mockImplementation(actual.useGetRecoveryGroupInventory)
    const client = createAppQueryClient()
    const inventory = (count: number) => ({
      recovery_group_id: 'group-1', recovery_group_name: 'rdb_and_app', run_id: 'run-1',
      volumes: volumes({ V5000_VOLUME01: count }),
    })
    let finishRefresh: (response: Response) => void = () => { throw new Error('Refresh has not started') }
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(inventory(1)))
      .mockImplementationOnce(() => new Promise<Response>(resolve => { finishRefresh = resolve }))
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<QueryClientProvider client={client}>
      <output aria-label="Inventory summary"><RecoveryGroupInventorySummary runId="run-1" fallback="Loading summary" /></output>
      <RecoveryGroupInventory runId="run-1" active />
    </QueryClientProvider>)
    try {
      const volume = await screen.findByTitle(`${AUX}V5000_VOLUME01`)
      expect(screen.getByText('recoveryInventory.refreshHelp')).toBeInTheDocument()
      await userEvent.setup().click(volume)
      expect(await screen.findByTitle(`snap1_${AUX}V5000_VOLUME01`)).toBeInTheDocument()
      expect(screen.getByLabelText('Inventory summary')).toHaveTextContent('recoveryInventory.summary.relations.one:1')

      await userEvent.setup().click(screen.getByRole('button', { name: 'buttons.refreshInventory' }))
      await waitFor(() => { expect(fetchMock).toHaveBeenCalledTimes(2) })
      expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/get_recovery_group_inventory?run_id=run-1&force_refresh=true')
      expect(fetchMock.mock.calls[1]?.[1]?.method).toBe('GET')
      expect(screen.getByRole('button', { name: 'buttons.refreshing' })).toBeDisabled()
      expect(volume.closest('details')).toHaveAttribute('open')
      expect(screen.getByTitle(`snap1_${AUX}V5000_VOLUME01`)).toBeInTheDocument()
      act(() => { finishRefresh(Response.json(inventory(2))) })

      expect(await screen.findByTitle(`snap2_${AUX}V5000_VOLUME01`)).toBeInTheDocument()
      expect(volume.closest('details')).toHaveAttribute('open')
      expect(screen.getByLabelText('Inventory summary')).toHaveTextContent('recoveryInventory.summary.relations.other:2')
      expect(screen.getByRole('button', { name: 'buttons.refreshInventory' })).toBeEnabled()
    } finally {
      view.unmount()
      client.clear()
      vi.unstubAllGlobals()
    }
  })

  it('keeps visible snapshots on refresh failure and retries the same ordinary GET', async () => {
    const actual = await vi.importActual<typeof import('@/generated/query/recovery-groups/recovery-groups.gen')>('@/generated/query/recovery-groups/recovery-groups.gen')
    vi.mocked(useGetRecoveryGroupInventory).mockImplementation(actual.useGetRecoveryGroupInventory)
    const client = createAppQueryClient()
    client.setDefaultOptions({ queries: { ...client.getDefaultOptions().queries, retry: false } })
    const inventory = { recovery_group_id: 'group-1', recovery_group_name: 'Group', run_id: 'run-1', volumes: volumes({ V5000_VOLUME01: 1 }) }
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(Response.json(inventory))
      .mockResolvedValueOnce(Response.json({ detail: 'Unavailable' }, { status: 503 }))
      .mockResolvedValueOnce(Response.json(inventory))
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<QueryClientProvider client={client}><RecoveryGroupInventory runId="run-1" active /></QueryClientProvider>)
    try {
      await userEvent.setup().click(await screen.findByTitle(`${AUX}V5000_VOLUME01`))
      await screen.findByTitle(`snap1_${AUX}V5000_VOLUME01`)
      await userEvent.setup().click(screen.getByRole('button', { name: 'buttons.refreshInventory' }))
      expect(await screen.findByRole('alert')).toHaveTextContent('recoveryInventory.refreshFailed')
      expect(screen.getByTitle(`snap1_${AUX}V5000_VOLUME01`)).toBeInTheDocument()
      await userEvent.setup().click(screen.getByRole('button', { name: 'buttons.retry' }))
      await waitFor(() => { expect(screen.queryByRole('alert')).not.toBeInTheDocument() })
      expect(fetchMock).toHaveBeenCalledTimes(3)
      expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
        '/api/get_recovery_group_inventory?run_id=run-1',
        '/api/get_recovery_group_inventory?run_id=run-1&force_refresh=true',
        '/api/get_recovery_group_inventory?run_id=run-1',
      ])
    } finally {
      view.unmount()
      client.clear()
      vi.unstubAllGlobals()
    }
  })

  it('pages many mappings five at a time', async () => {
    const names = Array.from({ length: 12 }, (_, index) => `ORACLE_VOLUME_${String(index + 1)}`)
    mockInventory({ volumes: volumes(Object.fromEntries(names.map(name => [name, 2]))), metro_mirror: metroMirror({ consistency_group: { ...group, relationship_count: 12 }, mappings: names.map(name => mapping(name)) }) })
    renderInventory()

    expect(chainRows()).toHaveLength(5)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Page 3' }))
    expect(chainRows()).toHaveLength(2)
    expect(screen.getByRole('group', { name: 'ORACLE_VOLUME_12' })).toBeInTheDocument()
  })
})
