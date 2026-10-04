import type { ComponentProps } from 'react'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import en from '@/locales/en.json'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PowerPartitionResource } from '../../model/discoveryTypes'
import type { StorageVolume, StorageVolumeMapping, VmStorageVolumes } from '../../model/vmStorageVolumesTypes'
import { IbmPowerDetailPanel } from './IbmPowerDetailPanel'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
const useVdisksByVmMock = vi.hoisted(() => vi.fn<(vmName: string, providerId?: string) => {
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

type Labels = ComponentProps<typeof IbmPowerDetailPanel>['labels']

const english: Record<string, string> = en

function labels(): Labels {
  const fields = [
    'partitionUuid', 'logicalSerialNumber', 'lastActivatedProfile', 'uptime', 'bootable', 'processors',
    'processorLimits', 'processorMode', 'memory', 'memoryLimits', 'interface', 'address', 'interfaceState',
    'monitoring', 'volume', 'capacity', 'volumeUniqueId', 'reservation', 'storageConnection',
    'fibreChannelIdentity', 'virtualIoSlots', 'physicalIo', 'sriov',
  ]
  return {
    entity: 'Partition',
    detail: 'IBM Power partition detail',
    close: 'Close partition detail',
    resize: 'Resize',
    yes: 'Yes',
    no: 'No',
    emptyBackingStorage: english['resources.power.detail.noBackingVolumes'] ?? '',
    sections: {
      summary: 'Summary',
      processorMemory: 'Processor and memory',
      network: 'Network and monitoring',
      storage: 'Storage',
      virtualIo: 'I/O and virtualization',
      backingStorage: english['drawer.sections.backingStorageInfo'] ?? '',
    },
    fields: Object.fromEntries(fields.map(field => [field, field])) as Labels['fields'],
    values: { dedicated: 'Dedicated', shared: 'Shared', fibreChannel: 'Fibre Channel', iscsi: 'iSCSI', direct: 'Direct' },
  }
}

const lpar: PowerPartitionResource = {
  id: 'ibm-power-01:LPAR:2',
  providerId: 'ibm-power-01',
  providerType: 'IBM_POWER',
  partitionKind: 'LPAR',
  partitionData: {
    PartitionUUID: 'lpar-uuid-2',
    PartitionName: 'aix2source',
    VolumeName: 'hdisk0',
    VolumeState: 'active',
    IsFibreChannelBacked: 'true',
    MaximumVirtualIOSlots: '20',
  },
  lpar: {},
  vios: {},
  partitionName: 'aix2source',
  partitionState: 'running',
  systemName: 'power-system',
  operatingSystemType: 'AIX',
  deviceName: '',
  bootMode: 'Normal',
  powerOnWithHypervisor: 'true',
  volumeCapacity: '',
  volumeName: 'hdisk0',
  volumeState: 'active',
}

const vios: PowerPartitionResource = {
  ...lpar,
  id: 'ibm-power-01:VIOS:1',
  partitionKind: 'VIOS',
  partitionName: 'vios1',
  partitionData: { ...lpar.partitionData, PartitionName: 'vios1' },
}

const flashProvider: ProviderRecord = {
  id: 'ibm-flashsystem-02',
  name: 'IBM Flash Source 02',
  description: '',
  type: 'FLASHCOPY',
  role: 'source',
  ipAddress: '10.0.0.2',
  credentialId: null,
  credentialStatus: 'none',
}

function powerVolume(overrides: Partial<StorageVolume> = {}): StorageVolume {
  return {
    key: 'ibm-flashsystem-02:2',
    naa: null,
    volumeId: '2',
    id: '2',
    name: 'aix2_source_rootvg',
    volumeName: 'aix2_source_rootvg',
    capacity: '30.00GB',
    status: 'degraded',
    pool: 'Pool0',
    ioGroupName: 'io_grp0',
    storageProviderId: 'ibm-flashsystem-02',
    type: 'striped',
    protocol: 'scsi',
    vdiskUid: '600507638082007A48000000000000A1',
    copyCount: '1',
    fcMapCount: '0',
    snapshots: { hasSnapshots: false, snapshotCount: 0, isSnapshot: false, sourceMappings: [], targetMappings: [] },
    ...overrides,
  }
}

const swapVolume = powerVolume({
  key: 'ibm-flashsystem-02:3',
  volumeId: '3',
  id: '3',
  name: 'aix2_source_swapvg',
  volumeName: 'aix2_source_swapvg',
  capacity: '1.00GB',
  vdiskUid: '600507638082007A48000000000000A2',
})

function mapping(id: string): StorageVolumeMapping {
  return {
    id,
    name: `fcmap${id}`,
    sourceVdiskId: '2',
    sourceVdiskName: 'aix2_source_rootvg',
    targetVdiskId: '9',
    targetVdiskName: 'aix2_target_rootvg',
    status: 'copying',
    progress: '40',
    copyRate: '50',
    cleanProgress: '100',
    startTime: '260724200509',
  }
}

function mockVolumes(volumes: StorageVolume[]) {
  useVdisksByVmMock.mockReturnValue({
    data: { vmName: 'aix2source', countVm: 2, countIbm: 4, volumes },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn().mockResolvedValue(undefined),
  })
}

function renderPanel(partition: PowerPartitionResource = lpar) {
  render(<IbmPowerDetailPanel partition={partition} open onClose={vi.fn()} providers={[flashProvider]} labels={labels()} />)
  return screen.getByRole('dialog', { name: 'IBM Power partition detail' })
}

async function openBackingStorage(volumes: StorageVolume[]) {
  mockVolumes(volumes)
  const dialog = renderPanel()
  await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Backing Storage Info' }))
  return within(dialog).getByRole('region', { name: 'Backing Storage Info' })
}

// The <dd> next to the <dt> with this label.
function detailValue(container: HTMLElement, label: string) {
  return within(container).getByText(label, { selector: 'dt' }).nextElementSibling
}

describe('IbmPowerDetailPanel backing storage', () => {
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

  it('resolves backing storage for an LPAR with its partition name and compute provider', () => {
    renderPanel()

    expect(useVdisksByVmMock).toHaveBeenCalledWith('aix2source', 'ibm-power-01')
  })

  it('keeps the HMC Storage section separate from Backing Storage Info, which comes last and starts collapsed', () => {
    const dialog = renderPanel()
    // Section toggles; the icon-only help trigger has no text. Sections without data stay hidden.
    const sections = within(dialog).getAllByRole('button')
      .filter(button => button.hasAttribute('aria-expanded') && button.textContent)

    expect(sections.map(button => button.textContent)).toEqual([
      'Summary', 'Storage', 'I/O and virtualization', 'Backing Storage Info',
    ])
    expect(within(dialog).getByRole('button', { name: 'Storage' })).not.toBe(within(dialog).getByRole('button', { name: 'Backing Storage Info' }))
    expect(within(dialog).getByRole('button', { name: 'Backing Storage Info' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('shows an IBM Power volume by Volume ID and Volume UID with its storage details', async () => {
    const container = await openBackingStorage([powerVolume()])
    const card = within(container).getByRole('region', { name: 'aix2_source_rootvg' })

    expect(detailValue(card, 'Backing provider')).toHaveTextContent('IBM Flash Source 02')
    expect(detailValue(card, 'Backing provider')).toHaveTextContent('ibm-flashsystem-02')
    expect(detailValue(card, 'Volume ID')).toHaveTextContent(/^2$/)
    expect(detailValue(card, 'Volume UID')).toHaveTextContent('600507638082007A48000000000000A1')
    expect(detailValue(card, 'Capacity')).toHaveTextContent('30.00GB')
    expect(detailValue(card, 'Status')).toHaveTextContent('degraded')
    expect(detailValue(card, 'Pool')).toHaveTextContent('Pool0')
    expect(detailValue(card, 'I/O group')).toHaveTextContent('io_grp0')
    expect(detailValue(card, 'Protocol')).toHaveTextContent('scsi')
    expect(detailValue(card, 'Type')).toHaveTextContent('striped')
    expect(within(card).queryByText('NAA', { selector: 'dt' })).not.toBeInTheDocument()
  })

  it('never renders the composite vdisks key', async () => {
    await openBackingStorage([powerVolume(), swapVolume])

    expect(screen.getByRole('dialog', { name: 'IBM Power partition detail' })).not.toHaveTextContent(/ibm-flashsystem-02:\d/)
  })

  it('shows every backing volume separately', async () => {
    const container = await openBackingStorage([powerVolume(), swapVolume])

    expect(within(container).getByRole('region', { name: 'aix2_source_rootvg' })).toHaveTextContent('600507638082007A48000000000000A1')
    expect(within(container).getByRole('region', { name: 'aix2_source_swapvg' })).toHaveTextContent('600507638082007A48000000000000A2')
  })

  it('shows a volume without snapshots with No FlashCopy mappings, not as an empty or error state', async () => {
    const container = await openBackingStorage([powerVolume()])
    const card = within(container).getByRole('region', { name: 'aix2_source_rootvg' })

    expect(detailValue(card, 'Snapshot count')).toHaveTextContent('0')
    expect(card).toHaveTextContent('No FlashCopy mappings')
    expect(container).not.toHaveTextContent('No backing storage volume was resolved for this logical partition.')
    expect(within(container).queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows source and target FlashCopy mappings under their volume', async () => {
    const container = await openBackingStorage([powerVolume({
      snapshots: { hasSnapshots: true, snapshotCount: 1, isSnapshot: true, sourceMappings: [mapping('0')], targetMappings: [mapping('1')] },
    })])

    expect(within(within(container).getByLabelText('Source FlashCopy mappings of aix2_source_rootvg')).getByRole('table')).toHaveTextContent('aix2_target_rootvg')
    expect(within(within(container).getByLabelText('Target FlashCopy mappings of aix2_source_rootvg')).getByRole('table')).toHaveTextContent('aix2_source_rootvg')
    expect(container).not.toHaveTextContent('No FlashCopy mappings')
  })

  it('shows a loading skeleton while the volumes load', async () => {
    useVdisksByVmMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: true,
      refetch: vi.fn().mockResolvedValue(undefined),
    })
    const dialog = renderPanel()
    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Backing Storage Info' }))

    expect(within(dialog).getByRole('status', { name: 'Loading backing storage...' })).toBeInTheDocument()
  })

  it('shows the shared error state and retries the same request', async () => {
    const refetch = vi.fn().mockResolvedValue(undefined)
    useVdisksByVmMock.mockReturnValue({ data: undefined, isLoading: false, isError: true, isFetching: false, refetch })
    const user = userEvent.setup()
    const dialog = renderPanel()
    await user.click(within(dialog).getByRole('button', { name: 'Backing Storage Info' }))
    const region = within(dialog).getByRole('region', { name: 'Backing Storage Info' })

    expect(region).toHaveTextContent('Resource inventory could not be loaded')
    await user.click(within(region).getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('shows the logical partition empty state when no volume was resolved', async () => {
    const container = await openBackingStorage([])

    expect(container).toHaveTextContent('No backing storage volume was resolved for this logical partition.')
  })

  it('passes disabled arguments for a VIOS and renders no Backing Storage Info section', () => {
    const dialog = renderPanel(vios)

    expect(useVdisksByVmMock).toHaveBeenCalledWith('', undefined)
    expect(within(dialog).queryByRole('button', { name: 'Backing Storage Info' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Storage' })).toBeInTheDocument()
  })
})
