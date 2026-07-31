import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useTranslation } from '@/test-utils/mockUseTranslation'
import type { PowerPartitionResource } from '../../model/discoveryTypes'
import { PowerInventoryView } from './PowerInventoryView'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const partition: PowerPartitionResource = {
  id: 'power-01:VIOS:1',
  providerId: 'power-01',
  providerType: 'IBM_POWER',
  partitionKind: 'VIOS',
  partitionData: {
    PartitionName: 'vios1',
    PartitionState: 'running',
    State: 'Inactive',
    IPAddress: '10.99.99.56',
    SubnetMask: '255.255.255.0',
    IsBootable: true,
    MaximumVirtualIOSlots: '20',
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
  it('shows the requested columns and keeps unknown capacity units raw', () => {
    const { t } = useTranslation()
    render(<PowerInventoryView resources={[partition]} providers={[]} t={t} />)

    expect(screen.getByRole('columnheader', { name: 'Operating system type' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Device' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Volume capacity' })).toBeInTheDocument()
    expect(screen.getByText('270648')).toBeInTheDocument()
    expect(screen.queryByText(/270648\s*(MB|GB|TB)/i)).not.toBeInTheDocument()
  })

  it('localizes requested detail fields and boolean values', () => {
    const { t } = useTranslation()
    render(<PowerInventoryView resources={[partition]} providers={[]} t={t} />)

    fireEvent.click(screen.getByText('vios1'))
    const dialog = screen.getByRole('dialog', { name: 'IBM Power partition detail' })
    expect(within(dialog).getAllByText('Bootable').length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText('Yes').length).toBeGreaterThan(0)
    expect(within(dialog).getAllByText('IP address').length).toBeGreaterThan(0)
    expect(within(dialog).queryByText('resources.power.fields.IsBootable')).not.toBeInTheDocument()
  })
})
