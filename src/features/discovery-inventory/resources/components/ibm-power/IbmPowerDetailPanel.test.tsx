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

  it('keeps the HMC Storage section separate from Backing Storage Info, without a Technical section', () => {
    const dialog = renderPanel()
    // Sections without data stay hidden: processor and network have no values in this LPAR.
    const sections = within(within(dialog).getByRole('navigation', { name: 'Sections' })).getAllByRole('button')

    expect(dialog).toHaveAttribute('data-size', 'xl')
    expect(sections.map(button => button.textContent)).toEqual([
      'Summary', 'Storage', 'I/O and virtualization', 'Backing Storage Info',
    ])
    expect(within(dialog).getByRole('button', { name: 'Summary' })).toHaveAttribute('aria-current', 'true')
    expect(within(dialog).getByRole('button', { name: 'Backing Storage Info' })).not.toHaveAttribute('aria-current')
  })

  it('shows the partition identifiers in Summary and Storage in the original order, without Technical or the provider ID', async () => {
    const user = userEvent.setup()
    const dialog = renderPanel({
      ...lpar,
      partitionData: {
        ...lpar.partitionData,
        LogicalSerialNumber: 'SN-0042',
        LastActivatedProfile: 'default',
        Uptime: '12 days',
        IsBootable: 'true',
        VolumeCapacity: '30 GB',
        VolumeUniqueID: 'vol-uid-7',
        ReservePolicy: 'NoReserve',
        WWPN: 'c050760000000001',
      },
    })
    const termsOf = (region: HTMLElement) => [...region.querySelectorAll('dt')].map(term => term.textContent)

    const summary = within(dialog).getByRole('region', { name: 'Summary' })
    expect(termsOf(summary)).toEqual(['partitionUuid', 'logicalSerialNumber', 'lastActivatedProfile', 'uptime', 'bootable'])
    expect(detailValue(summary, 'partitionUuid')).toHaveTextContent('lpar-uuid-2')
    expect(detailValue(summary, 'logicalSerialNumber')).toHaveTextContent('SN-0042')
    expect(within(summary).getByRole('button', { name: 'Copy partitionUuid' })).toBeInTheDocument()

    await user.click(within(dialog).getByRole('button', { name: 'Storage' }))
    const storage = within(dialog).getByRole('region', { name: 'Storage' })
    expect(termsOf(storage)).toEqual(['volume', 'capacity', 'volumeUniqueId', 'reservation', 'storageConnection', 'fibreChannelIdentity'])
    expect(detailValue(storage, 'volumeUniqueId')).toHaveTextContent('vol-uid-7')
    expect(detailValue(storage, 'fibreChannelIdentity')).toHaveTextContent('c050760000000001')

    // No Technical section, and the provider ID is in no section body.
    const navigation = within(dialog).getByRole('navigation', { name: 'Sections' })
    expect(within(navigation).queryByRole('button', { name: 'Technical' })).not.toBeInTheDocument()
    for (const item of within(navigation).getAllByRole('button')) {
      await user.click(item)
      expect(within(dialog).getByRole('region')).not.toHaveTextContent('ibm-power-01')
    }
  })

  it.each(['Summary', 'Processor and memory', 'Network and monitoring', 'Storage', 'I/O and virtualization'])(
    'lays the %s fields out on the shared Overview grid',
    async (name) => {
      // Data for every field section, so all five are in the navigation.
      const dialog = renderPanel({
        ...lpar,
        partitionData: { ...lpar.partitionData, CurrentProcessors: '2', InterfaceName: 'en0', WWPN: 'c050760000000001' },
      })
      await userEvent.setup().click(within(within(dialog).getByRole('navigation', { name: 'Sections' })).getByRole('button', { name }))
      const section = within(dialog).getByRole('region', { name })
      const lists = section.querySelectorAll('dl')

      expect(lists).toHaveLength(1)
      expect(lists[0]).toHaveClass('grid-cols-[repeat(auto-fill,minmax(min(12.75rem,100%),1fr))]')
      expect(section.querySelector('.grid-cols-1, [class*="@min-[520px]/detail-content:grid-cols-2"], [class*="@min-[860px]/detail-content:grid-cols-3"]')).toBeNull()
    },
  )

  it('shows no Fibre Channel identity in Storage when the partition is not Fibre Channel backed', async () => {
    const dialog = renderPanel({ ...lpar, partitionData: { ...lpar.partitionData, IsFibreChannelBacked: 'false', WWPN: 'c050760000000001' } })
    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'Storage' }))
    const storage = within(dialog).getByRole('region', { name: 'Storage' })
    expect(within(storage).queryByText('fibreChannelIdentity', { selector: 'dt' })).not.toBeInTheDocument()
    expect(storage).not.toHaveTextContent('c050760000000001')
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
    expect(within(card).queryByText('vdisk UID', { selector: 'dt' })).not.toBeInTheDocument()
  })

  it('lists the volume fields in the original drawer order, with Volume ID and Volume UID in the same list', async () => {
    const container = await openBackingStorage([powerVolume()])
    const card = within(container).getByRole('region', { name: 'aix2_source_rootvg' })
    const lists = card.querySelectorAll('dl')

    // The volume fields and the FlashCopy counts; no separate identifier group.
    expect(lists).toHaveLength(2)
    expect([...(lists[0]?.querySelectorAll('dt') ?? [])].map(term => term.textContent)).toEqual([
      'Backing provider', 'Volume ID', 'Volume UID', 'Capacity', 'Status', 'Pool', 'I/O group', 'Protocol', 'Type',
    ])
    expect([...(lists[1]?.querySelectorAll('dt') ?? [])].map(term => term.textContent)).toEqual([
      'Snapshot count', 'Source mappings', 'Target mappings',
    ])
  })

  it('lays the volume fields and the FlashCopy counts out on the shared Overview grid', async () => {
    const container = await openBackingStorage([powerVolume()])
    const card = within(container).getByRole('region', { name: 'aix2_source_rootvg' })

    for (const list of card.querySelectorAll('dl')) expect(list).toHaveClass('grid-cols-[repeat(auto-fill,minmax(min(12.75rem,100%),1fr))]')
    expect(card.querySelector('.grid-cols-1, [class*="@min-[520px]/detail-content:grid-cols-2"]')).toBeNull()
    expect(within(card).getByRole('button', { name: 'Copy Volume ID' })).toBeInTheDocument()
    expect(within(card).getByRole('button', { name: 'Copy Volume UID' })).toBeInTheDocument()
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

    const status = within(dialog).getByRole('status', { name: 'Loading backing storage...' })
    expect(status).toHaveAttribute('aria-busy', 'true')
    expect(status.querySelector('dl')).toHaveClass('grid-cols-[repeat(auto-fill,minmax(min(12.75rem,100%),1fr))]')
    expect(status.querySelector('.grid-cols-1, [class*="@min-[520px]/detail-content:grid-cols-2"]')).toBeNull()
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

  it('renders every HMC section as its own navigation entry, one at a time', async () => {
    // Summary, processor and network values too, so no HMC section is hidden.
    const dialog = renderPanel({ ...lpar, partitionData: { ...lpar.partitionData, IsBootable: 'true', CurrentProcessors: '4', IPAddress: '10.0.0.10' } })
    const navigation = within(dialog).getByRole('navigation', { name: 'Sections' })

    expect(within(navigation).getAllByRole('button').map(button => button.textContent)).toEqual([
      'Summary', 'Processor and memory', 'Network and monitoring', 'Storage', 'I/O and virtualization', 'Backing Storage Info',
    ])
    await userEvent.setup().click(within(navigation).getByRole('button', { name: 'Network and monitoring' }))
    expect(within(dialog).getAllByRole('region')).toHaveLength(1)
    expect(within(dialog).getByRole('region', { name: 'Network and monitoring' })).toHaveTextContent('10.0.0.10')
  })

  it('draws the LPAR relationship graphic in the help with Volume ID and UID, never NAA', async () => {
    mockVolumes([powerVolume(), powerVolume({ key: 'ibm-flashsystem-01:100', storageProviderId: 'ibm-flashsystem-01', volumeId: '100', id: '100', volumeName: 'aix2_other', vdiskUid: '600507638082007A4800000000000100' })])
    const dialog = renderPanel()
    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'IBM Power partition help' }))
    const help = screen.getByRole('dialog', { name: 'What this partition view shows' })

    expect(within(help).getByRole('list', { name: 'Discovered from' })).toHaveTextContent(/ibm-power-01.*aix2source/)
    const flash = within(help).getByRole('list', { name: 'Backing storage on IBM Flash Source 02' })
    expect(within(flash).getByRole('group', { name: 'aix2_source_rootvg' })).toHaveTextContent(/Volume ID 2.*600507638082007A48000000000000A1/)
    expect(within(help).getByRole('list', { name: 'Backing storage on ibm-flashsystem-01' })).toHaveTextContent('aix2_other')
    expect(help).not.toHaveTextContent(/naa\./i)
    expect(help).not.toHaveTextContent('ibm-flashsystem-02:2')
    expect(help).toHaveTextContent('NPIV WWPNs and the matching FlashSystem host')
  })

  it('keeps the VIOS help without a relationship graphic', async () => {
    const dialog = renderPanel(vios)
    await userEvent.setup().click(within(dialog).getByRole('button', { name: 'IBM Power partition help' }))
    const help = screen.getByRole('dialog', { name: 'What this partition view shows' })

    expect(within(help).queryByRole('heading', { name: 'Relationships' })).not.toBeInTheDocument()
    expect(help.querySelector('[data-entity-id]')).toBeNull()
  })

  it('passes disabled arguments for a VIOS and renders no Backing Storage Info section', () => {
    const dialog = renderPanel(vios)

    expect(useVdisksByVmMock).toHaveBeenCalledWith('', undefined)
    expect(within(dialog).queryByRole('button', { name: 'Backing Storage Info' })).not.toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Storage' })).toBeInTheDocument()
  })
})
