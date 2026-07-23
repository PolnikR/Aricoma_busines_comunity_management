import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VirtualMachinesTable } from './VirtualMachinesTable'
import type { VirtualMachine } from '../types'

const vm: VirtualMachine = {
  id: 'vm-1',
  name: 'app-server-01',
  powerState: 'poweredOn',
  connectionState: 'connected',
  guestOs: 'Ubuntu 22.04',
  hostname: 'app-server-01',
  ipAddress: '10.0.0.5',
  vcpu: 4,
  memoryGb: 16,
  host: 'esx-01',
  cluster: 'prod-cluster',
  datastore: 'ds-nvme-01',
  folder: '/prod/apps',
  diskCount: 2,
  diskCapacityGb: 120,
  vdisks: [
    {
      id: 'disk-1',
      label: 'Hard disk 1',
      capacityGb: 100,
      datastore: 'ds-nvme-01',
      filePath: '[ds-nvme-01] app-server-01/disk.vmdk',
      thinProvisioned: true,
    },
    {
      id: 'disk-2',
      label: 'Hard disk 2',
      capacityGb: 20,
      datastore: 'ds-nvme-01',
      filePath: '[ds-nvme-01] app-server-01/disk2.vmdk',
      thinProvisioned: true,
    },
  ],
  snapshotCount: 3,
  toolsStatus: 'toolsOk',
  tags: ['prod', 'linux'],
}

afterEach(cleanup)

describe('VirtualMachinesTable', () => {
  it('renders the eight column headers including Tags', () => {
    render(<VirtualMachinesTable virtualMachines={[vm]} selectedId={null} density="comfortable" onSelect={vi.fn()} />)
    for (const header of ['Virtual machine', 'Operating system', 'Placement', 'Tags', 'Compute', 'Connection', 'Power', 'Snapshots']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
  })

  it('renders cell content for a row, with Connection and Power separate', () => {
    render(<VirtualMachinesTable virtualMachines={[vm]} selectedId={null} density="comfortable" onSelect={vi.fn()} />)
    expect(screen.getByText('app-server-01')).toBeInTheDocument()
    expect(screen.getByText('On')).toBeInTheDocument()
    expect(screen.getByText('Connected')).toBeInTheDocument()
    expect(screen.getByText('4 vCPU · 16 GB')).toBeInTheDocument()
    expect(screen.getByText('2 disks · 120 GB')).toBeInTheDocument()
    expect(screen.getByText('prod-cluster')).toBeInTheDocument()
    expect(screen.getByText('prod')).toBeInTheDocument()
    expect(screen.getByText('linux')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('hides secondary detail in compact density', () => {
    render(<VirtualMachinesTable virtualMachines={[vm]} selectedId={null} density="compact" onSelect={vi.fn()} />)
    expect(screen.queryByText('2 disks · 120 GB')).not.toBeInTheDocument()
  })

  it('calls onSelect when a row is clicked', () => {
    const onSelect = vi.fn()
    render(<VirtualMachinesTable virtualMachines={[vm]} selectedId={null} density="compact" onSelect={onSelect} />)
    fireEvent.click(screen.getByText('app-server-01'))
    expect(onSelect).toHaveBeenCalledWith(vm)
  })
})
