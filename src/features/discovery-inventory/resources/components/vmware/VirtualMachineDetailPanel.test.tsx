import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VirtualMachineDetailPanel } from './VirtualMachineDetailPanel'
import type { VirtualMachine } from '../../types/virtualMachineTypes'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { StorageVolume, StorageVolumeMapping, VmStorageVolumes } from '../../model/vmStorageVolumesTypes'
import { formatStartTime } from '@/shared/utils/dateFormat'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
const useVdisksByVmMock = vi.hoisted(() => vi.fn<() => {
  data: VmStorageVolumes | undefined
  isLoading: boolean
  isError: boolean
  isFetching: boolean
  refetch: () => Promise<unknown>
}>(() => ({
  data: undefined,
  isLoading: false,
  isError: false,
  isFetching: false,
  refetch: vi.fn().mockResolvedValue(undefined),
})))
vi.mock('../../hooks/useVmStorageVolumes', () => ({ useVdisksByVm: useVdisksByVmMock }))

const vm = {
  name: 'app-server-01',
  hostname: 'app-server-01',
  ipAddress: '10.0.0.5',
  powerState: 'poweredOn',
  connectionState: 'connected',
  toolsStatus: 'toolsOk',
  vcpu: 4,
  memoryGb: 16,
  guestOs: 'Ubuntu 22.04',
  cluster: 'prod',
  host: 'esx-01',
  datastore: 'ds-01',
  diskCount: 2,
  diskCapacityGb: 120,
  vmPath: '[ds-01] app-server-01/app-server-01.vmx',
  providerId: 'vmware-vcenter-01',
  providerType: 'VMWARE',
  vdisks: [
    {
      id: 'disk-1',
      label: 'Hard disk 1',
      capacityGb: 100,
      datastore: 'ds-01',
      filePath: '[ds-01] app-server-01/disk.vmdk',
      thinProvisioned: true,
      naa: [],
    },
    {
      id: 'disk-2',
      label: 'Hard disk 2',
      capacityGb: 20,
      datastore: 'ds-01',
      filePath: '[ds-01] app-server-01/disk2.vmdk',
      thinProvisioned: true,
      naa: [],
    },
  ],
  folder: '/prod',
  snapshotCount: 0,
  tags: ['prod'],
} as unknown as VirtualMachine

function renderWithQueryClient(element: React.ReactElement) {
  const queryClient = new QueryClient()
  return render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>)
}

function snapshots(overrides: Partial<StorageVolume['snapshots']> = {}): StorageVolume['snapshots'] {
  return {
    hasSnapshots: false,
    snapshotCount: 0,
    isSnapshot: false,
    sourceMappings: [],
    targetMappings: [],
    ...overrides,
  }
}

function volume(overrides: Partial<StorageVolume> = {}): StorageVolume {
  return {
    key: 'naa.60050763808104d94000000000000016',
    naa: 'naa.60050763808104d94000000000000016',
    volumeId: '1',
    id: '1',
    name: 'V5000_VOLUME02',
    volumeName: 'V5000_VOLUME02',
    capacity: '1.00TB',
    status: 'degraded',
    pool: 'Pool0',
    ioGroupName: 'io_grp0',
    storageProviderId: 'ibm-flashsystem-01',
    type: 'striped',
    protocol: 'scsi',
    vdiskUid: '60050763808104D94000000000000016',
    copyCount: '1',
    fcMapCount: '0',
    snapshots: snapshots(),
    ...overrides,
  }
}

function mapping(status: string, cleanProgress: string): StorageVolumeMapping {
  return {
    id: 'fcmap0',
    name: 'fcmap0',
    sourceVdiskId: '1',
    sourceVdiskName: 'source-volume',
    targetVdiskId: '7',
    targetVdiskName: 'target-volume',
    status,
    progress: cleanProgress,
    copyRate: '50',
    cleanProgress,
    startTime: '260724200509',
  }
}

async function openBackingStorage(volumes: StorageVolume[], providers: ProviderRecord[] = []) {
  const user = userEvent.setup()
  useVdisksByVmMock.mockReturnValue({
    data: { vmName: 'app-server-01', countVm: 1, countIbm: 1, volumes },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn().mockResolvedValue(undefined),
  })
  renderWithQueryClient(<VirtualMachineDetailPanel virtualMachine={vm} open onClose={vi.fn()} providers={providers} />)
  await user.click(screen.getByRole('button', { name: 'Backing Storage Info' }))
  return screen.getByRole('region', { name: 'Backing Storage Info' })
}

// The <dd> next to the <dt> with this label.
const flashProvider = { id: 'ibm-flashsystem-01', name: 'IBM Flash Source 01', type: 'FLASHCOPY', role: 'source', credentialStatus: 'ok' } as ProviderRecord

async function openRelationshipHelp(volumes: StorageVolume[], providers: ProviderRecord[] = [], state: { isLoading?: boolean; isError?: boolean } = {}) {
  const user = userEvent.setup()
  useVdisksByVmMock.mockReturnValue({
    data: state.isLoading || state.isError ? undefined : { vmName: 'app-server-01', countVm: 1, countIbm: 1, volumes },
    isLoading: state.isLoading ?? false,
    isError: state.isError ?? false,
    isFetching: false,
    refetch: vi.fn().mockResolvedValue(undefined),
  })
  renderWithQueryClient(<VirtualMachineDetailPanel virtualMachine={vm} open onClose={vi.fn()} providers={providers} />)
  await user.click(screen.getByRole('button', { name: 'Virtual machine help' }))
  return screen.getByRole('dialog', { name: 'What this virtual machine view shows' })
}

function detailValue(container: HTMLElement, label: string) {
  return within(container).getByText(label, { selector: 'dt' }).nextElementSibling
}

function expectMappingRow(table: HTMLElement, status: string, progress: string) {
  const [, row] = within(table).getAllByRole('row')
  if (!row) throw new Error('mapping row not rendered')
  const cells = within(row).getAllByRole('cell').map(cellElement => cellElement.textContent)
  expect(cells).toEqual(['source-volume', 'target-volume', status, progress, formatStartTime('260724200509')])
}

describe('VirtualMachineDetailPanel resize', () => {
  afterEach(() => {
    cleanup()
    useVdisksByVmMock.mockReset()
    useVdisksByVmMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue(undefined),
    })
  })

  it('loads related volumes with the VM and its vCenter provider only', () => {
    renderWithQueryClient(
      <VirtualMachineDetailPanel
        virtualMachine={vm}
        open
        onClose={vi.fn()}
      />,
    )

    expect(useVdisksByVmMock).toHaveBeenCalledWith(
      'app-server-01',
      'vmware-vcenter-01',
    )
  })

  it('shows Overview open and Disks and Backing Storage Info collapsed instead of tabs', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<VirtualMachineDetailPanel virtualMachine={vm} open onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')

    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'Disks' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Disks' })).toHaveAccessibleDescription('Disks: 2')
    expect(screen.getByRole('button', { name: 'Backing Storage Info' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('heading', { name: 'app-server-01' }).parentElement?.nextElementSibling).toHaveTextContent(/^Virtual machine/)
    expect(dialog).not.toHaveTextContent('Hard disk 1')

    await user.click(screen.getByRole('button', { name: 'Disks' }))
    expect(screen.getByRole('region', { name: 'Disks' })).toHaveTextContent('Hard disk 1')
  })

  it('lists every NAA of a disk in its own Disks column, in API order, or a dash when there is none', async () => {
    const user = userEvent.setup()
    const disksVm = {
      ...vm,
      vdisks: [
        { ...vm.vdisks[0], id: 'one', label: 'Hard disk 1', naa: ['naa.60050763808104d94000000000000015'] },
        { ...vm.vdisks[0], id: 'many', label: 'Hard disk 2', naa: ['naa.B', 'naa.A'] },
        { ...vm.vdisks[0], id: 'none', label: 'Hard disk 3', naa: [] },
      ],
    } as VirtualMachine
    renderWithQueryClient(<VirtualMachineDetailPanel virtualMachine={disksVm} open onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Disks' }))
    const table = within(screen.getByRole('region', { name: 'Disks' })).getByRole('table')
    const headers = within(table).getAllByRole('columnheader').map(header => header.textContent)
    const naaColumn = headers.indexOf('NAA')
    const naaCell = (label: string) => {
      const found = within(within(table).getByRole('row', { name: new RegExp(label) })).getAllByRole('cell')[naaColumn]
      if (!found) throw new Error(`no NAA cell for ${label}`)
      return found
    }

    expect(headers).toEqual(['Label', 'Capacity', 'Datastore', 'NAA', 'File', 'Thin Prov.'])
    expect(within(naaCell('Hard disk 1')).getAllByRole('listitem').map(item => item.textContent)).toEqual(['naa.60050763808104d94000000000000015'])
    expect(within(naaCell('Hard disk 2')).getAllByRole('listitem').map(item => item.textContent)).toEqual(['naa.B', 'naa.A'])
    expect(naaCell('Hard disk 3')).toHaveTextContent(/^-$/)
    expect(naaCell('Hard disk 1')).toHaveClass('font-mono')
    expect(within(table).getByRole('row', { name: /Hard disk 1/ })).toHaveTextContent(/Hard disk 1.*100 GB.*ds-01.*naa\.6005.*disk\.vmdk.*Yes/)
  })

  it('lays out accented sections that scroll on their own', () => {
    renderWithQueryClient(<VirtualMachineDetailPanel virtualMachine={vm} open onClose={vi.fn()} />)
    const accentOf = (name: string) => screen.getByRole('button', { name }).closest('section')?.getAttribute('data-accent')

    expect(screen.getByRole('dialog').querySelector('[data-body-layout]')).toHaveAttribute('data-body-layout', 'sections')
    expect(accentOf('Overview')).toBe('overview')
    expect(accentOf('Disks')).toBe('storage')
    expect(accentOf('Backing Storage Info')).toBe('storage')
  })

  it('explains backing volumes, NAA identity and FlashCopy mappings in the VM help', async () => {
    const user = userEvent.setup()
    renderWithQueryClient(<VirtualMachineDetailPanel virtualMachine={vm} open onClose={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Virtual machine help' }))
    const help = screen.getByRole('dialog', { name: 'What this virtual machine view shows' })

    expect(help).toHaveTextContent('Backing Storage Info')
    expect(help).toHaveTextContent(/storage volumes behind this VM's VMware disks/)
    expect(help).toHaveTextContent(/NAA/)
    expect(help).toHaveTextContent(/FlashCopy snapshot mappings/)
  })

  it('draws the VM relationship graphic in the help from the already loaded volumes', async () => {
    const help = await openRelationshipHelp([
      volume({ snapshots: snapshots({ snapshotCount: 1, sourceMappings: [mapping('copied', '100')] }) }),
      volume({ key: 'naa.second', naa: 'naa.second', volumeName: 'V5000_VOLUME03', storageProviderId: 'ibm-flashsystem-09' }),
    ], [flashProvider])

    // The help reuses the panel's lookup: every call is the same VM and provider.
    expect(new Set(useVdisksByVmMock.mock.calls.map(call => JSON.stringify(call)))).toEqual(new Set([JSON.stringify(['app-server-01', 'vmware-vcenter-01'])]))
    expect(help.querySelector('[data-body-layout]')).toBeNull()
    expect(within(help).getByRole('list', { name: 'Discovered from' })).toHaveTextContent(/vmware-vcenter-01.*app-server-01/)
    expect(within(help).getAllByRole('group', { name: 'app-server-01' })[0]).toHaveTextContent('Virtual disks: 2')
    const flash = within(help).getByRole('list', { name: 'Backing storage on IBM Flash Source 01' })
    expect(within(flash).getByRole('group', { name: 'V5000_VOLUME02' })).toHaveTextContent('naa.60050763808104d94000000000000016')
    expect(within(flash).getByRole('group', { name: 'FlashCopy' })).toHaveTextContent('→ target-volume')
    const unknown = within(help).getByRole('list', { name: 'Backing storage on ibm-flashsystem-09' })
    expect(within(unknown).getByRole('group', { name: 'V5000_VOLUME03' })).toBeInTheDocument()
    expect(unknown).toHaveTextContent('No FlashCopy mappings')
    expect(help).toHaveTextContent('Which virtual disk is stored on which volume is not reported.')
  })

  it('keeps the help open while Tab moves through relationship nodes and closes only the help on Escape', async () => {
    const user = userEvent.setup()
    const help = await openRelationshipHelp([volume()])
    const [firstNode] = within(help).getAllByRole('group', { name: 'vmware-vcenter-01' })
    if (!firstNode) throw new Error('provider node not rendered')

    firstNode.focus()
    await user.tab()
    expect(help).toContainElement(document.activeElement as HTMLElement)
    expect(document.activeElement).toHaveAttribute('data-highlight', 'on')
    expect(screen.getByRole('dialog', { name: 'What this virtual machine view shows' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'What this virtual machine view shows' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Virtual machine detail' })).toBeInTheDocument()
  })

  it('does not draw a virtual disk to NAA mapping or the vdisk_UID in the help', async () => {
    const help = await openRelationshipHelp([volume()])

    expect(within(help).queryByRole('group', { name: /Hard disk/ })).not.toBeInTheDocument()
    expect(help).not.toHaveTextContent(/60050763808104D94000000000000016/)
    expect([...help.querySelectorAll('[data-entity-id]')].map(node => node.getAttribute('data-entity-id'))).not.toContainEqual(expect.stringMatching(/disk/))
  })

  it.each([
    [{ isLoading: true }, 'Loading backing storage...'],
    [{ isError: true }, 'Resource inventory could not be loaded'],
    [{}, 'No backing storage volume was resolved for this virtual machine.'],
  ])('keeps the VM in the help graphic with a neutral backing state (%o)', async (state, text) => {
    const help = await openRelationshipHelp([], [], state)

    expect(within(help).getAllByRole('group', { name: 'app-server-01' })).toHaveLength(2)
    expect(within(help).getByRole('list', { name: 'Backing storage' })).toHaveTextContent(text)
  })

  it('shows a volume with its storage details even when it has no snapshots', async () => {
    const container = await openBackingStorage([volume()])
    const card = within(container).getByRole('region', { name: 'V5000_VOLUME02' })

    expect(card).toHaveTextContent('Backing storage volume')
    expect(detailValue(card, 'Backing provider')).toHaveTextContent('ibm-flashsystem-01')
    expect(detailValue(card, 'vdisk UID')).toHaveTextContent('60050763808104D94000000000000016')
    expect(detailValue(card, 'Capacity')).toHaveTextContent('1.00TB')
    expect(detailValue(card, 'Status')).toHaveTextContent('degraded')
    expect(detailValue(card, 'Pool')).toHaveTextContent('Pool0')
    expect(detailValue(card, 'I/O group')).toHaveTextContent('io_grp0')
    expect(detailValue(card, 'Protocol')).toHaveTextContent('scsi')
    expect(detailValue(card, 'Type')).toHaveTextContent('striped')
    expect(detailValue(card, 'Snapshot count')).toHaveTextContent('0')
  })

  it('renders raw backend values without formatting them', async () => {
    const container = await openBackingStorage([volume()])
    const card = within(container).getByRole('region', { name: 'V5000_VOLUME02' })

    for (const text of ['Degraded', 'SCSI', 'Striped', '1.00 TB']) {
      expect(card).not.toHaveTextContent(text)
    }
  })

  it('identifies the resolved FlashSystem volume by its vdisk UID, not by the VMware NAA', async () => {
    const container = await openBackingStorage([volume({ vdiskUid: 'UID-FROM-VOLUME' })])
    const card = within(container).getByRole('region', { name: 'V5000_VOLUME02' })

    expect(detailValue(card, 'vdisk UID')).toHaveTextContent('UID-FROM-VOLUME')
    expect(within(card).queryByText('NAA', { selector: 'dt' })).not.toBeInTheDocument()
    expect(card).not.toHaveTextContent('naa.60050763808104d94000000000000016')
  })

  it('identifies a VMware volume by vdisk UID only, without the IBM Power Volume ID and Volume UID rows', async () => {
    const container = await openBackingStorage([volume()])
    const card = within(container).getByRole('region', { name: 'V5000_VOLUME02' })

    expect(within(card).getByText('vdisk UID', { selector: 'dt' })).toBeInTheDocument()
    expect(within(card).queryByText('Volume ID', { selector: 'dt' })).not.toBeInTheDocument()
    expect(within(card).queryByText('Volume UID', { selector: 'dt' })).not.toBeInTheDocument()
  })

  it('shows No FlashCopy mappings below the volume details when it has no mappings', async () => {
    const container = await openBackingStorage([volume()])
    const card = within(container).getByRole('region', { name: 'V5000_VOLUME02' })

    expect(card).toHaveTextContent(/Type.*FlashCopy \/ Snapshots.*No FlashCopy mappings/)
    expect(within(card).queryByRole('table')).not.toBeInTheDocument()
    expect(within(container).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('falls back from volume name to name to id for the volume heading', async () => {
    const container = await openBackingStorage([
      volume({ key: 'naa.a', naa: 'naa.a', volumeName: '', name: 'raw-name' }),
      volume({ key: 'naa.b', naa: 'naa.b', volumeName: '', name: '', id: '42' }),
    ])

    expect(within(container).getByRole('heading', { name: 'raw-name' })).toBeInTheDocument()
    expect(within(container).getByRole('heading', { name: '42' })).toBeInTheDocument()
  })

  it('shows every backing volume of the VM', async () => {
    const container = await openBackingStorage([
      volume(),
      volume({ key: 'naa.second', naa: 'naa.second', volumeName: 'V5000_VOLUME03', vdiskUid: 'UID-SECOND' }),
    ])

    expect(within(container).getByRole('region', { name: 'V5000_VOLUME02' })).toBeInTheDocument()
    expect(within(container).getByRole('region', { name: 'V5000_VOLUME03' })).toHaveTextContent('UID-SECOND')
  })

  it('names the backing provider from the loaded providers and keeps its raw ID', async () => {
    const flashProvider = { id: 'ibm-flashsystem-01', name: 'IBM Flash Source 01', type: 'IBM_FLASHSYSTEM' } as unknown as ProviderRecord
    const container = await openBackingStorage([volume()], [flashProvider])
    const value = detailValue(within(container).getByRole('region', { name: 'V5000_VOLUME02' }), 'Backing provider')

    expect(value).toHaveTextContent(/^IBM Flash Source 01ibm-flashsystem-01$/)
  })

  it('shows only the raw provider ID when the provider is not loaded', async () => {
    const otherProvider = { id: 'ibm-flashsystem-02', name: 'IBM Flash Target 02', type: 'IBM_FLASHSYSTEM' } as unknown as ProviderRecord
    const container = await openBackingStorage([volume()], [otherProvider])
    const value = detailValue(within(container).getByRole('region', { name: 'V5000_VOLUME02' }), 'Backing provider')

    expect(value).toHaveTextContent(/^ibm-flashsystem-01$/)
  })

  it('shows source FlashCopy mappings in detail under their volume', async () => {
    const container = await openBackingStorage([volume({ snapshots: snapshots({ sourceMappings: [mapping('copying', '40')] }) })])
    const card = within(container).getByRole('region', { name: 'V5000_VOLUME02' })
    const table = within(within(card).getByLabelText('Source FlashCopy mappings of V5000_VOLUME02')).getByRole('table')

    expect(detailValue(card, 'Source mappings')).toHaveTextContent('1')
    expect(card).not.toHaveTextContent('No FlashCopy mappings')
    expectMappingRow(table, 'copying', '40%')
  })

  it('shows target FlashCopy mappings in detail under their volume', async () => {
    const container = await openBackingStorage([volume({ snapshots: snapshots({ snapshotCount: 1, targetMappings: [mapping('copied', '100')] }) })])
    const card = within(container).getByRole('region', { name: 'V5000_VOLUME02' })
    const table = within(within(card).getByLabelText('Target FlashCopy mappings of V5000_VOLUME02')).getByRole('table')

    expect(detailValue(card, 'Target mappings')).toHaveTextContent('1')
    expect(within(card).queryByLabelText(/^Source FlashCopy/)).not.toBeInTheDocument()
    expectMappingRow(table, 'copied', '100%')
  })

  it('shows a backing-storage empty state when no volume was resolved', async () => {
    const container = await openBackingStorage([])

    expect(container).toHaveTextContent('No backing storage volume was resolved for this virtual machine.')
    expect(container).not.toHaveTextContent('No FlashCopy mappings')
  })

  it('shows a backing volume skeleton while the volumes load', async () => {
    const user = userEvent.setup()
    useVdisksByVmMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: true,
      refetch: vi.fn().mockResolvedValue(undefined),
    })

    renderWithQueryClient(<VirtualMachineDetailPanel virtualMachine={vm} open onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Backing Storage Info' }))

    expect(screen.getByRole('status', { name: 'Loading backing storage...' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.queryByText('No backing storage volume was resolved for this virtual machine.')).not.toBeInTheDocument()
  })

  it('shows the shared error state and retries the same request', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn().mockResolvedValue(undefined)
    useVdisksByVmMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch,
    })

    renderWithQueryClient(<VirtualMachineDetailPanel virtualMachine={vm} open onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Backing Storage Info' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Resource inventory could not be loaded')
    expect(screen.queryByText('No backing storage volume was resolved for this virtual machine.')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('shows retrying state without falling through to the empty state', async () => {
    const user = userEvent.setup()
    useVdisksByVmMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: true,
      refetch: vi.fn().mockResolvedValue(undefined),
    })

    renderWithQueryClient(<VirtualMachineDetailPanel virtualMachine={vm} open onClose={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Backing Storage Info' }))

    expect(screen.getByRole('button', { name: 'Retrying' })).toBeDisabled()
    expect(screen.queryByText('No backing storage volume was resolved for this virtual machine.')).not.toBeInTheDocument()
  })

  it('resizes the panel via the drag handle and keyboard', () => {
    renderWithQueryClient(<VirtualMachineDetailPanel virtualMachine={vm} open onClose={vi.fn()} />)
    const panel = screen.getByRole('dialog')
    expect(panel.style.getPropertyValue('--detail-drawer-width')).toBe('420px')

    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' })
    expect(panel.style.getPropertyValue('--detail-drawer-width')).toBe('436px')

    fireEvent.mouseDown(screen.getByRole('separator'), { clientX: 500 })
    fireEvent.mouseMove(window, { clientX: 460 })
    fireEvent.mouseUp(window)
    expect(panel.style.getPropertyValue('--detail-drawer-width')).toBe('476px')
  })

  it('resets to the default width after closing and reopening', () => {
    const queryClient = new QueryClient()
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <VirtualMachineDetailPanel virtualMachine={vm} open onClose={vi.fn()} />
      </QueryClientProvider>
    )
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' })
    expect(screen.getByRole('dialog').style.getPropertyValue('--detail-drawer-width')).toBe('436px')

    rerender(
      <QueryClientProvider client={queryClient}>
        <VirtualMachineDetailPanel virtualMachine={vm} open={false} onClose={vi.fn()} />
      </QueryClientProvider>
    )
    rerender(
      <QueryClientProvider client={queryClient}>
        <VirtualMachineDetailPanel virtualMachine={vm} open onClose={vi.fn()} />
      </QueryClientProvider>
    )
    expect(screen.getByRole('dialog').style.getPropertyValue('--detail-drawer-width')).toBe('420px')
  })
})
