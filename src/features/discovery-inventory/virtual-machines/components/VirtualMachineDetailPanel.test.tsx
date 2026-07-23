import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { VirtualMachineDetailPanel } from './VirtualMachineDetailPanel'
import type { VirtualMachine } from '../types'

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
  folder: '/prod',
  snapshotCount: 0,
  tags: ['prod'],
} as unknown as VirtualMachine

afterEach(cleanup)

function renderWithQueryClient(element: React.ReactElement) {
  const queryClient = new QueryClient()
  return render(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>)
}

describe('VirtualMachineDetailPanel resize', () => {
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
