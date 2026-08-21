import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VirtualMachineDetailPanel } from './VirtualMachineDetailPanel'
import type { VirtualMachine } from '../../types/virtualMachineTypes'
import type { VmStorageVolumes } from '../../model/vmStorageVolumesTypes'
import type { ProviderRecord } from '@/features/providers-connectors/providers/model/providerTypes'

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

const vmwareProvider = {
  id: 'vmware-vcenter-01',
  name: 'Production vCenter',
  description: '',
  type: 'VMWARE',
  ipAddress: '10.0.0.10',
  port: 22,
  credentialId: 'vcenter-admin',
  credentialStatus: 'ok',
  defaultFlashcopyProviderId: 'ibm-flashsystem-01',
} as ProviderRecord

const flashProvider: ProviderRecord = {
  id: 'ibm-flashsystem-01',
  name: 'Production FlashSystem',
  description: '',
  type: 'FLASHCOPY',
  ipAddress: '10.0.0.20',
  port: 22,
  credentialId: 'flash-admin',
  credentialStatus: 'ok',
}

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
    },
    {
      id: 'disk-2',
      label: 'Hard disk 2',
      capacityGb: 20,
      datastore: 'ds-01',
      filePath: '[ds-01] app-server-01/disk2.vmdk',
      thinProvisioned: true,
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

  it('loads related volumes with the VM and selected FlashSystem provider', () => {
    renderWithQueryClient(
      <VirtualMachineDetailPanel
        virtualMachine={vm}
        providers={[vmwareProvider, flashProvider]}
        open
        onClose={vi.fn()}
      />,
    )

    expect(useVdisksByVmMock).toHaveBeenCalledWith(
      'app-server-01',
      'vmware-vcenter-01',
      'ibm-flashsystem-01',
    )
  })

  it('shows an empty snapshots table when the VM provider has no linked FlashSystem', async () => {
    const user = userEvent.setup()

    renderWithQueryClient(
      <VirtualMachineDetailPanel
        virtualMachine={vm}
        open
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('tab', { name: 'Snapshots' }))

    expect(useVdisksByVmMock).toHaveBeenCalledWith(
      'app-server-01',
      'vmware-vcenter-01',
      undefined,
    )
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('shows the shared table skeleton while snapshots are loading', async () => {
    const user = userEvent.setup()
    useVdisksByVmMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      isFetching: true,
      refetch: vi.fn().mockResolvedValue(undefined),
    })

    renderWithQueryClient(
      <VirtualMachineDetailPanel
        virtualMachine={vm}
        providers={[vmwareProvider, flashProvider]}
        open
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('tab', { name: 'Snapshots' }))

    expect(screen.getByRole('status', { name: 'Loading snapshots...' })).toBeInTheDocument()
  })

  it('shows the shared snapshot error state and retries the same request', async () => {
    const user = userEvent.setup()
    const refetch = vi.fn().mockResolvedValue(undefined)
    useVdisksByVmMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: false,
      refetch,
    })

    renderWithQueryClient(
      <VirtualMachineDetailPanel
        virtualMachine={vm}
        providers={[vmwareProvider, flashProvider]}
        open
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('tab', { name: 'Snapshots' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Resource inventory could not be loaded')
    expect(screen.queryByLabelText('Snapshot mappings table')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(refetch).toHaveBeenCalledOnce()
  })

  it('shows retrying state without falling through to the empty snapshot table', async () => {
    const user = userEvent.setup()
    useVdisksByVmMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      isFetching: true,
      refetch: vi.fn().mockResolvedValue(undefined),
    })

    renderWithQueryClient(
      <VirtualMachineDetailPanel
        virtualMachine={vm}
        providers={[vmwareProvider, flashProvider]}
        open
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('tab', { name: 'Snapshots' }))

    expect(screen.getByRole('button', { name: 'Retrying' })).toBeDisabled()
    expect(screen.queryByLabelText('Snapshot mappings table')).not.toBeInTheDocument()
  })

  it('renders snapshot mappings in an accessible shared data table', async () => {
    const user = userEvent.setup()
    useVdisksByVmMock.mockReturnValue({
      isLoading: false,
      isError: false,
      isFetching: false,
      refetch: vi.fn().mockResolvedValue(undefined),
      data: {
        vmName: 'app-server-01',
        countVm: 1,
        countIbm: 1,
        volumes: [{
          naaId: 'naa.1',
          id: 'volume-1',
          name: 'volume-1',
          volumeName: 'volume-1',
          capacity: '3.00TB',
          status: 'online',
          pool: 'Pool0',
          type: 'striped',
          protocol: 'scsi',
          vdiskUid: 'uid-1',
          copyCount: '1',
          fcMapCount: '1',
          snapshots: {
            hasSnapshots: true,
            snapshotCount: 1,
            isSnapshot: false,
            sourceMappings: [{
              id: 'mapping-1',
              name: 'mapping-1',
              sourceVdiskId: 'volume-1',
              sourceVdiskName: 'source-volume',
              targetVdiskId: 'target-1',
              targetVdiskName: 'target-volume',
              status: 'copied',
              progress: '100',
              copyRate: '0',
              cleanProgress: '100',
              startTime: '260724200509',
            }],
            targetMappings: [],
          },
        }],
      },
    })

    renderWithQueryClient(
      <VirtualMachineDetailPanel
        virtualMachine={vm}
        providers={[vmwareProvider, flashProvider]}
        open
        onClose={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('tab', { name: 'Snapshots' }))

    expect(screen.getByLabelText('Snapshot mappings table')).toBeInTheDocument()
    expect(screen.getByText('source-volume')).toBeInTheDocument()
    expect(screen.getByText('target-volume')).toBeInTheDocument()
  })

  it('resizes the panel via the drag handle and keyboard', () => {
    renderWithQueryClient(<VirtualMachineDetailPanel virtualMachine={vm} open onClose={vi.fn()} />)
    const panel = screen.getByRole('dialog')
    expect(panel.style.width).toBe('420px')

    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' })
    expect(panel.style.width).toBe('436px')

    fireEvent.mouseDown(screen.getByRole('separator'), { clientX: 500 })
    fireEvent.mouseMove(window, { clientX: 460 })
    fireEvent.mouseUp(window)
    expect(panel.style.width).toBe('476px')
  })

  it('resets to the default width after closing and reopening', () => {
    const queryClient = new QueryClient()
    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <VirtualMachineDetailPanel virtualMachine={vm} open onClose={vi.fn()} />
      </QueryClientProvider>
    )
    fireEvent.keyDown(screen.getByRole('separator'), { key: 'ArrowLeft' })
    expect(screen.getByRole('dialog').style.width).toBe('436px')

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
    expect(screen.getByRole('dialog').style.width).toBe('420px')
  })
})
