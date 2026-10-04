import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { useTranslation } from '@/test-utils/mockUseTranslation'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'
import type { PowerPartitionResource } from '../../model/discoveryTypes'
import type { StorageVolume, VmStorageVolumes } from '../../model/vmStorageVolumesTypes'
import { PowerInventoryView } from './PowerInventoryView'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
// The drawer resolves backing storage through useVdisksByVm; keep it off the network.
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

function renderInRouter(ui: ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const partition: PowerPartitionResource = {
  id: 'power-01:VIOS:1',
  providerId: 'power-01',
  providerType: 'IBM_POWER',
  partitionKind: 'VIOS',
  partitionData: {
    PartitionUUID: 'power-uuid-1',
    PartitionName: 'vios1',
    PartitionID: '1',
    PartitionType: 'Virtual IO Server',
    PartitionState: 'running',
    LogicalSerialNumber: '21486AV1',
    OperatingSystemVersion: 'VIOS 4.1.2.10',
    SystemName: 'power-system',
    CurrentProcessors: '2',
    DesiredProcessors: '2',
    MinimumProcessors: '1',
    MaximumProcessors: '2',
    CurrentMemory: '4096',
    DesiredMemory: '4096',
    MinimumMemory: '1024',
    MaximumMemory: '4096',
    HasDedicatedProcessors: 'true',
    CurrentSharingMode: 'share idle processors',
    LastActivatedProfile: 'default_profile',
    Uptime: '260773',
    ResourceMonitoringControlState: 'active',
    ResourceMonitoringIPAddress: '10.99.99.56',
    InterfaceName: 'en0',
    DeviceName: 'ent0',
    State: 'Inactive',
    IPAddress: '10.99.99.56',
    SubnetMask: '255.255.255.0',
    IsBootable: true,
    MaximumVirtualIOSlots: '20',
    HasPhysicalIO: 'true',
    PhysicalLocation: 'U78C9.001.WZS00VV-P1-C8-T1',
    SRIOVCapableSlot: 'false',
    VolumeName: 'hdisk1',
    VolumeState: 'active',
    VolumeCapacity: '270648',
    VolumeUniqueID: 'volume-uid-1',
    ReservePolicy: 'NoReserve',
    ReservePolicyAlgorithm: 'Failover',
    IsFibreChannelBacked: 'false',
    IsISCSIBacked: 'false',
  },
  lpar: {},
  vios: {},
  partitionName: 'vios1',
  partitionState: 'running',
  systemName: 'power-system',
  operatingSystemType: 'VIOS',
  deviceName: 'ent0',
  bootMode: 'Normal',
  powerOnWithHypervisor: 'true',
  volumeCapacity: '270648',
  volumeName: 'hdisk1',
  volumeState: 'active',
}

const lpar: PowerPartitionResource = {
  ...partition,
  id: 'power-01:LPAR:2',
  partitionKind: 'LPAR',
  partitionName: 'aix2source',
  partitionData: { ...partition.partitionData, PartitionName: 'aix2source', PartitionType: 'AIX/Linux' },
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

function backingVolume(storageProviderId: string): StorageVolume {
  return {
    key: `${storageProviderId}:2`,
    naa: null,
    volumeId: '2',
    id: '2',
    name: 'aix2_source_rootvg',
    volumeName: 'aix2_source_rootvg',
    capacity: '30.00GB',
    status: 'degraded',
    pool: 'Pool0',
    ioGroupName: 'io_grp0',
    storageProviderId,
    type: 'striped',
    protocol: 'scsi',
    vdiskUid: '600507638082007A48000000000000A1',
    copyCount: '1',
    fcMapCount: '0',
    snapshots: { hasSnapshots: false, snapshotCount: 0, isSnapshot: false, sourceMappings: [], targetMappings: [] },
  }
}

// Opens the LPAR drawer and its Backing Storage Info section; returns the backing provider value.
function openLparBackingProvider(t: ReturnType<typeof useTranslation>['t'], storageProviderId: string) {
  useVdisksByVmMock.mockReturnValue({
    data: { vmName: 'aix2source', countVm: 1, countIbm: 1, volumes: [backingVolume(storageProviderId)] },
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn().mockResolvedValue(undefined),
  })
  renderInRouter(<PowerInventoryView resources={[lpar]} providers={[flashProvider]} t={t} />)
  fireEvent.click(screen.getByText('aix2source'))
  const dialog = screen.getByRole('dialog', { name: 'IBM Power partition detail' })
  const toggle = within(dialog).getByRole('button', { name: 'Backing Storage Info' })
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(toggle)
  const card = within(dialog).getByRole('region', { name: 'aix2_source_rootvg' })
  return within(card).getByText('Backing provider', { selector: 'dt' }).nextElementSibling
}

describe('PowerInventoryView', () => {
  it('shows a compact operational column set', () => {
    const { t } = useTranslation()
    renderInRouter(
      <PowerInventoryView
        resources={[partition]}
        t={t}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Partition' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Status' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Operating system' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Managed system' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Management IP' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Compute' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Provider' })).toBeInTheDocument()
    expect(screen.getByText('VIOS 4.1.2.10')).toBeInTheDocument()
    expect(screen.getByText('2 CPU · 4 GB')).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Device' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Boot mode' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Volume capacity' })).not.toBeInTheDocument()
  })

  it('renders only the curated detail sections and combines related values', () => {
    const { t } = useTranslation()
    renderInRouter(
      <PowerInventoryView
        resources={[partition]}
        t={t}
      />,
    )

    fireEvent.click(screen.getByText('vios1'))
    const dialog = screen.getByRole('dialog', { name: 'IBM Power partition detail' })
    expect(within(dialog).getByRole('button', { name: 'Summary' })).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(within(dialog).getByRole('button', { name: 'IBM Power partition help' }))
    expect(within(dialog).getByRole('dialog', { name: 'What this partition view shows' })).toHaveTextContent('Processor and memory')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Close help' }))
    expect(within(dialog).getByRole('heading', { name: 'vios1' }).parentElement?.nextElementSibling).toHaveTextContent('Partition')
    expect(within(dialog).getByText('Processor and memory')).toBeInTheDocument()
    expect(within(dialog).getByText('Network and monitoring')).toBeInTheDocument()
    expect(within(dialog).getByText('Storage')).toBeInTheDocument()
    expect(within(dialog).getByText('I/O and virtualization')).toBeInTheDocument()
    expect(within(dialog).getByText('power-uuid-1')).toBeInTheDocument()
    expect(within(dialog).getByText('2 / 2')).toBeInTheDocument()
    expect(within(dialog).getByText('4096 / 4096')).toBeInTheDocument()
    expect(within(dialog).getByText('en0 · ent0')).toBeInTheDocument()
    expect(within(dialog).getByText('hdisk1 · active')).toBeInTheDocument()
    expect(within(dialog).getByText('NoReserve · Failover')).toBeInTheDocument()
    expect(within(dialog).queryByText('Operating system and lifecycle')).not.toBeInTheDocument()
    expect(within(dialog).queryByText('Partition state')).not.toBeInTheDocument()
  })

  it('does not render a duplicate provider filter for the selected source tab', () => {
    const { t } = useTranslation()

    renderInRouter(
      <PowerInventoryView
        resources={[partition]}
        t={t}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }))
    expect(screen.queryByLabelText('Provider')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Partition kind')).toBeInTheDocument()
  })

  it('keeps provider filters available when the inventory request fails', () => {
    const { t } = useTranslation()
    const onRetry = vi.fn()

    renderInRouter(
      <PowerInventoryView
        resources={[]}
        error={{
          title: 'Resource inventory could not be loaded',
          description: 'Resource inventory could not be loaded',
          retryLabel: 'Retry loading',
          isRetrying: false,
          onRetry,
        }}
        t={t}
      />,
    )

    expect(screen.getByRole('button', { name: 'Filters' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Resource inventory could not be loaded')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Retry loading' }))
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('titles the LPAR backing storage section with the shared drawer label and names its provider from the loaded providers', () => {
    const { t } = useTranslation()
    const provider = openLparBackingProvider(t, 'ibm-flashsystem-02')

    expect(useVdisksByVmMock).toHaveBeenCalledWith('aix2source', 'power-01')
    expect(provider).toHaveTextContent('IBM Flash Source 02')
    expect(provider).toHaveTextContent('ibm-flashsystem-02')
  })

  it('shows only the raw backing provider ID when that provider is not loaded', () => {
    const { t } = useTranslation()
    const provider = openLparBackingProvider(t, 'ibm-flashsystem-09')

    expect(provider).toHaveTextContent(/^ibm-flashsystem-09$/)
  })

  it('closes the detail drawer when the selected partition is no longer in the provider dataset', async () => {
    const { t } = useTranslation()
    const view = renderInRouter(<PowerInventoryView resources={[partition]} t={t} />)

    fireEvent.click(screen.getByText('vios1'))
    expect(screen.getByRole('dialog', { name: 'IBM Power partition detail' })).toBeInTheDocument()

    view.rerender(<MemoryRouter><PowerInventoryView resources={[]} t={t} /></MemoryRouter>)

    await waitFor(() => { expect(screen.queryByRole('dialog', { name: 'IBM Power partition detail' })).not.toBeInTheDocument() })
  })
})
