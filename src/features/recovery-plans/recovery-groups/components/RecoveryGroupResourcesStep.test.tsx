import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mockVirtualLayout } from '@/shared/components/resource-sidebar/test/mockVirtualLayout'
import type { RecoveryGroupProviderScope } from '../model/recoveryGroupTypes'
import { RecoveryGroupResourcesStep } from './RecoveryGroupResourcesStep'

interface InventoryQueryDouble {
  data: { resourceNames: string[], vmMetadataByName?: Record<string, { os?: string }> } | undefined
  error: Error | null
  isLoading: boolean
  isSearching: boolean
  isFetching: boolean
  refetch: () => void
}

const useRecoveryGroupResourceInventory = vi.fn<
  (workloadType: string | null, providerId: string | null, options?: { providerScope?: RecoveryGroupProviderScope | null, vmwareNamePrefix?: string }) => InventoryQueryDouble
>()

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('../hooks/useRecoveryGroupResourceInventory', () => ({
  useRecoveryGroupResourceInventory: (
    workloadType: string | null,
    providerId: string | null,
    options?: { providerScope?: RecoveryGroupProviderScope | null, vmwareNamePrefix?: string },
  ) => useRecoveryGroupResourceInventory(workloadType, providerId, options),
}))


// The virtualized ResourceSidebar renders no rows without a measurable viewport.
let restoreVirtualLayout: () => void
beforeEach(() => { restoreVirtualLayout = mockVirtualLayout() })
afterEach(() => { restoreVirtualLayout() })

describe('RecoveryGroupResourcesStep', () => {
  it('offers keyboard add and clear controls next to the compact selection', async () => {
    const onAdd = vi.fn()
    const onClear = vi.fn()
    useRecoveryGroupResourceInventory.mockReturnValue({ data: { resourceNames: ['VOL-01', 'VOL-02'] }, error: null, isLoading: false, isSearching: false, isFetching: false, refetch: vi.fn() })
    render(<RecoveryGroupResourcesStep compact workloadType="ibm_flashsystem" providerId="source" resources={['VOL-01']} onAdd={onAdd} onRemove={vi.fn()} onClear={onClear} />)
    expect(screen.getByRole('button', { name: 'Add: VOL-01' })).toBeDisabled()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Add: VOL-02' }))
    expect(onAdd).toHaveBeenCalledWith('VOL-02')
    const clear = screen.getByRole('button', { name: 'Clear selection' })
    expect(clear.parentElement).toHaveTextContent('Selected volumes')
    await userEvent.setup().click(clear)
    expect(onClear).toHaveBeenCalledOnce()
  })

  it.each([false, true])('composes the editable auxiliary row with compact=%s', async (compact) => {
    const remove = vi.fn()
    render(<RecoveryGroupResourcesStep compact={compact} selectionHint={<p id="aux-hint">Auxiliary names required</p>} workloadType="ibm_flashsystem" providerId="source" resources={['VOL-01']}
      onAdd={vi.fn()} onRemove={remove} renderItemContent={name => <input aria-label={`Auxiliary: ${name}`} defaultValue="AUX-01" />} />)
    expect(screen.getByLabelText('Auxiliary: VOL-01')).toHaveValue('AUX-01')
    expect(screen.getByText('Auxiliary names required')).toBeInTheDocument()
    const selection = screen.getByLabelText('Selected recovery group volumes').closest('section')
    if (compact) {
      expect(selection).not.toHaveClass('border')
      expect(screen.getByRole('button', { name: 'Remove volume: VOL-01' })).toHaveClass('size-6')
    } else {
      expect(selection).toHaveClass('border')
    }
    await userEvent.setup().click(screen.getByRole('button', { name: 'Remove volume: VOL-01' }))
    expect(remove).toHaveBeenCalledWith('VOL-01')
  })
  beforeEach(() => {
    vi.clearAllMocks()
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: [] },
      error: null,
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })
  })

  it.each([
    ['vmware_virtual_machines', 'vmware-1', 'VM-01'],
    ['ibm_power_virtual_machines', 'power-1', 'LPAR-01'],
    ['ibm_flashsystem', 'flash-1', 'VOL-01'],
  ] as const)('shows %s resources from the selected provider', (
    workloadType,
    providerId,
    resourceName,
  ) => {
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: [resourceName] },
      error: null,
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    render(
      <RecoveryGroupResourcesStep
        workloadType={workloadType}
        providerId={providerId}
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    expect(screen.getByText(resourceName)).toBeInTheDocument()
    expect(useRecoveryGroupResourceInventory).toHaveBeenLastCalledWith(
      workloadType,
      providerId,
      {},
    )
  })

  it('shows a retryable inventory error', () => {
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: undefined,
      error: new Error('Provider unavailable'),
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    render(
      <RecoveryGroupResourcesStep
        workloadType="ibm_flashsystem"
        providerId="flash-1"
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    expect(screen.getByText('Recovery group resources could not be loaded')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument()
  })

  it('searches VMware locally inside the provider scope without changing the inventory request', async () => {
    const user = userEvent.setup()
    const providerScope = { vmPrefix: 'TEST-', vmTags: ['WEB'] }
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: ['TEST-WEB-01', 'TEST-DB-01'] },
      error: null,
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    render(
      <RecoveryGroupResourcesStep
        workloadType="vmware_virtual_machines"
        providerId="vmware-1"
        providerScope={providerScope}
        resources={['SELECTED-VM']}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    await user.type(screen.getByRole('searchbox', { name: 'Search virtual machines' }), 'PROD-')
    expect(screen.queryByText('TEST-WEB-01')).not.toBeInTheDocument()

    await user.clear(screen.getByRole('searchbox', { name: 'Search virtual machines' }))
    await user.type(screen.getByRole('searchbox', { name: 'Search virtual machines' }), 'db')

    expect(screen.getByText('TEST-DB-01')).toBeInTheDocument()
    expect(screen.queryByText('TEST-WEB-01')).not.toBeInTheDocument()
    expect(screen.getByText('SELECTED-VM')).toBeInTheDocument()
    for (const [workloadType, providerId, options] of useRecoveryGroupResourceInventory.mock.calls) {
      expect([workloadType, providerId, options]).toEqual(['vmware_virtual_machines', 'vmware-1', { providerScope }])
    }
  })

  it('shows the loading list while VMware inventory refreshes and keeps the search box usable', async () => {
    const user = userEvent.setup()
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: ['DB-01'] },
      error: null,
      isLoading: false,
      isSearching: true,
      isFetching: true,
      refetch: vi.fn(),
    })

    render(
      <RecoveryGroupResourcesStep
        workloadType="vmware_virtual_machines"
        providerId="vmware-1"
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    const searchbox = screen.getByRole('searchbox', { name: 'Search virtual machines' })
    expect(screen.getByRole('status', { name: 'Loading virtual machines' })).toBeInTheDocument()
    expect(screen.queryByText('DB-01')).not.toBeInTheDocument()
    expect(searchbox).toBeEnabled()

    await user.type(searchbox, 'WEB')

    expect(searchbox).toHaveValue('WEB')
  })

  it('clears VMware search text when the provider changes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(
      <RecoveryGroupResourcesStep
        workloadType="vmware_virtual_machines"
        providerId="vmware-1"
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    await user.type(screen.getByRole('searchbox', { name: 'Search virtual machines' }), 'WEB')
    rerender(
      <RecoveryGroupResourcesStep
        workloadType="vmware_virtual_machines"
        providerId="vmware-2"
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    expect(screen.getByRole('searchbox', { name: 'Search virtual machines' })).toHaveValue('')
    expect(useRecoveryGroupResourceInventory).toHaveBeenLastCalledWith('vmware_virtual_machines', 'vmware-2', {})
  })

  it('keeps IBM Power search local', async () => {
    const user = userEvent.setup()
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: ['LPAR-01'] },
      error: null,
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    render(
      <RecoveryGroupResourcesStep
        workloadType="ibm_power_virtual_machines"
        providerId="power-1"
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    await user.type(screen.getByRole('searchbox', { name: 'Search virtual machines' }), 'WEB')

    expect(useRecoveryGroupResourceInventory).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('LPAR-01')).not.toBeInTheDocument()
  })

  it('sends VMware search text to the server without filtering its result when the provider has no scope', async () => {
    const user = userEvent.setup()
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: ['DB-01'] },
      error: null,
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    render(
      <RecoveryGroupResourcesStep
        workloadType="vmware_virtual_machines"
        providerId="vmware-1"
        providerScope={null}
        resources={['SELECTED-VM']}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    expect(useRecoveryGroupResourceInventory).toHaveBeenLastCalledWith('vmware_virtual_machines', 'vmware-1', {
      providerScope: null,
      vmwareNamePrefix: '',
    })

    await user.type(screen.getByRole('searchbox', { name: 'Search virtual machines' }), 'PROD-')

    expect(useRecoveryGroupResourceInventory).toHaveBeenLastCalledWith('vmware_virtual_machines', 'vmware-1', {
      providerScope: null,
      vmwareNamePrefix: 'PROD-',
    })
    expect(screen.getByText('DB-01')).toBeInTheDocument()
    expect(screen.getByText('SELECTED-VM')).toBeInTheDocument()
  })

  it('keeps IBM Power search local even when the provider has a prefix', async () => {
    const user = userEvent.setup()
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: ['TEST-AIX-01', 'TEST-DB-01'] },
      error: null,
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    render(
      <RecoveryGroupResourcesStep
        workloadType="ibm_power_virtual_machines"
        providerId="power-1"
        providerScope={{ vmPrefix: 'TEST-' }}
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    await user.type(screen.getByRole('searchbox', { name: 'Search virtual machines' }), 'db')

    expect(screen.getByText('TEST-DB-01')).toBeInTheDocument()
    expect(screen.queryByText('TEST-AIX-01')).not.toBeInTheDocument()
    for (const [, , options] of useRecoveryGroupResourceInventory.mock.calls) {
      expect(options).toEqual({ providerScope: { vmPrefix: 'TEST-' } })
    }
  })

  it('reports metadata of every new inventory result', () => {
    const onMetadataAvailable = vi.fn()
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: ['PROD-01'], vmMetadataByName: { 'PROD-01': { os: 'Linux' } } },
      error: null,
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    render(
      <RecoveryGroupResourcesStep
        workloadType="vmware_virtual_machines"
        providerId="vmware-1"
        providerScope={null}
        resources={[]}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onMetadataAvailable={onMetadataAvailable}
      />,
    )

    expect(onMetadataAvailable).toHaveBeenCalledWith({ 'PROD-01': { os: 'Linux' } })
  })

  it('keeps available and selected resources in independent scroll regions', () => {
    useRecoveryGroupResourceInventory.mockReturnValue({
      data: { resourceNames: ['VM-01'] },
      error: null,
      isLoading: false,
      isSearching: false,
      isFetching: false,
      refetch: vi.fn(),
    })

    const { container } = render(
      <RecoveryGroupResourcesStep
        workloadType="vmware_virtual_machines"
        providerId="vmware-1"
        resources={['VM-01']}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
      />,
    )

    expect(container.firstElementChild?.children[0]).toHaveClass('h-72', 'min-h-0', 'overflow-hidden', 'lg:h-full')
    expect(container.firstElementChild?.children[1]).toHaveClass('flex', 'h-72', 'min-h-0', 'flex-col', 'lg:h-full')
    expect(screen.getByRole('list', { name: 'Available virtual machines' }).parentElement).toHaveClass(
      'custom-scrollbar',
      'min-h-0',
      'flex-1',
      'overflow-y-auto',
    )
    expect(screen.getByLabelText('Selected recovery group virtual machines')).toHaveClass(
      'custom-scrollbar',
      'min-h-0',
      'flex-1',
      'overflow-y-auto',
    )
  })
})
