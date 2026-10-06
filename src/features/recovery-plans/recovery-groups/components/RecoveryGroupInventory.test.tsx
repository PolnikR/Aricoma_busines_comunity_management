import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useGetRecoveryGroupInventory } from '@/generated/query/recovery-groups/recovery-groups.gen'
import { RecoveryGroupInventory } from './RecoveryGroupInventory'

vi.mock('@/generated/query/recovery-groups/recovery-groups.gen', () => ({ useGetRecoveryGroupInventory: vi.fn() }))
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
  it('without Metro Mirror renders only the auxiliary volume inventory', () => {
    mockInventory({})
    render(<RecoveryGroupInventory runId="run-1" active />)

    expect(screen.queryByText('recoveryInventory.metroMirror.title')).toBeNull()
    expect(screen.queryByText('recoveryInventory.chain.title')).toBeNull()
    expect(screen.getByText('recoveryInventory.auxiliary.title')).toBeInTheDocument()
    expect(screen.getByTitle(`${AUX}V5000_VOLUME01`)).toBeInTheDocument()
  })

  it('shows a quiet empty state when Metro Mirror reports no group and no mappings', () => {
    mockInventory({ metro_mirror: metroMirror({ consistency_group: null, mappings: [] }) })
    render(<RecoveryGroupInventory runId="run-1" active />)

    expect(screen.getByText('recoveryInventory.metroMirror.empty')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'recoveryInventory.chain.title' })).toBeNull()
  })

  it('maps master to auxiliary to snapshots with numeric progress and no repeated group state or primary', () => {
    mockInventory({ metro_mirror: metroMirror() })
    render(<RecoveryGroupInventory runId="run-1" active />)
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
    render(<RecoveryGroupInventory runId="run-1" active />)
    const [synced, zero] = chainRows()

    expect(synced && replication(synced)?.querySelector('[data-connector-value]')).toHaveTextContent('recoveryInventory.metroMirror.inSync')
    expect(synced && replication(synced)?.querySelector('[data-connector-progress]')).toBeNull()
    expect(zero && replication(zero)?.querySelector('[data-connector-value]')).toHaveTextContent('0 %')
  })

  it('prints differing and unknown row states, the primary exception and reverses that row', () => {
    mockInventory({ metro_mirror: metroMirror({
      mappings: [mapping('V5000_VOLUME01', { state: 'consistent_stopped', progress: null }), mapping('RDM_DISK01', { state: 'some_future_state', progress: null, primary: 'aux' })],
    }) })
    render(<RecoveryGroupInventory runId="run-1" active />)
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
    render(<RecoveryGroupInventory runId="run-1" active />)

    expect(screen.getByText('recoveryInventory.metroMirror.unavailable')).toBeInTheDocument()
    expect(screen.getByText('Provider did not respond')).toBeInTheDocument()
    expect(screen.getByText('ibm-flashsystem-02')).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'recoveryInventory.chain.title' })).toBeNull()
    expect(screen.getByTitle(`${AUX}RDM_DISK01`)).toBeInTheDocument()
  })

  it('draws an auxiliary volume missing from the inventory as a problem node without actions', () => {
    mockInventory({ metro_mirror: metroMirror({ mappings: [mapping('V5000_VOLUME03')] }) })
    render(<RecoveryGroupInventory runId="run-1" active />)
    const [row] = chainRows()
    if (!row) throw new Error('chain row missing')

    expect(within(row).getByRole('group', { name: `${AUX}V5000_VOLUME03` })).toHaveClass('border-dashed')
    expect(within(row).getByText('recoveryInventory.chain.notInInventory')).toBeInTheDocument()
    expect(within(row).queryAllByRole('button')).toHaveLength(0)
    expect(within(row).getByText('recoveryInventory.chain.noInventoryData')).toBeInTheDocument()
  })

  it('reveals the auxiliary volume from the snapshot endpoint as a fan-out with the source drawn once', async () => {
    mockInventory({ metro_mirror: metroMirror() })
    render(<RecoveryGroupInventory runId="run-1" active />)

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
    render(<RecoveryGroupInventory runId="run-1" active />)

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

  it('pages many mappings five at a time', async () => {
    const names = Array.from({ length: 12 }, (_, index) => `ORACLE_VOLUME_${String(index + 1)}`)
    mockInventory({ volumes: volumes(Object.fromEntries(names.map(name => [name, 2]))), metro_mirror: metroMirror({ consistency_group: { ...group, relationship_count: 12 }, mappings: names.map(name => mapping(name)) }) })
    render(<RecoveryGroupInventory runId="run-1" active />)

    expect(chainRows()).toHaveLength(5)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Page 3' }))
    expect(chainRows()).toHaveLength(2)
    expect(screen.getByRole('group', { name: 'ORACLE_VOLUME_12' })).toBeInTheDocument()
  })
})
