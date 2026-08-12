import type { ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { useTranslation } from '@/test-utils/mockUseTranslation'
import type { PowerPartitionResource } from '../../model/discoveryTypes'
import { PowerInventoryView } from './PowerInventoryView'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

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
    expect(within(dialog).getByText('Summary')).toBeInTheDocument()
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
})
