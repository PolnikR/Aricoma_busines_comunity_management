import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecoveryAppBuilder } from './RecoveryAppBuilder'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/discovery-inventory/api/useDiscoveryInventory', () => ({
  useDiscoveryInventory: () => ({
    data: { virtualMachines: [] },
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  }),
}))
vi.mock('./TierCanvas', () => ({
  TierCanvas: ({
    tiers,
    onVMAdded,
  }: {
    tiers: Record<string, RecoveryTier>
    onVMAdded?: (tierId: string, vmName: string) => void
  }) => (
    <div>
      <span>Database VMs: {tiers['database']?.recovery_group?.vms.length ?? 0}</span>
      <button type="button" onClick={() => { onVMAdded?.('database', 'DB-TEST') }}>
        Add test VM
      </button>
    </div>
  ),
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RecoveryAppBuilder', () => {
  it('validates required metadata before saving', async () => {
    const user = userEvent.setup()
    const alertMock = vi.fn()
    const onSave = vi.fn()
    vi.stubGlobal('alert', alertMock)
    render(<RecoveryAppBuilder onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Save Application' }))
    expect(alertMock).toHaveBeenCalledWith('Enter a valid file name using letters, numbers, and underscores.')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('saves the current metadata and default tiers', () => {
    const onSave = vi.fn()
    render(<RecoveryAppBuilder onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('File name *'), { target: { value: 'finance_recovery' } })
    fireEvent.change(screen.getByLabelText('Application Name *'), { target: { value: 'Finance' } })
    fireEvent.change(screen.getByLabelText('Description *'), { target: { value: 'Finance recovery' } })
    fireEvent.change(screen.getByLabelText('Environment *'), { target: { value: 'prod' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Application' }))

    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      fileName: 'finance_recovery',
      name: 'Finance',
      description: 'Finance recovery',
      environment: 'prod',
    })
    expect((onSave.mock.calls[0]?.[0] as { tiers: Map<string, unknown> }).tiers.size).toBe(4)
  })

  it('disables save while persistence is in progress', () => {
    render(<RecoveryAppBuilder isSaving />)
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled()
  })

  it('reports user changes as dirty', () => {
    const onDirtyChange = vi.fn()
    render(<RecoveryAppBuilder onDirtyChange={onDirtyChange} />)

    fireEvent.change(screen.getByLabelText('Application Name *'), {
      target: { value: 'Finance' },
    })

    expect(onDirtyChange).toHaveBeenCalledWith(true)
  })

  it('does not retain selected VMs in a new builder instance', async () => {
    const user = userEvent.setup()
    const firstRender = render(<RecoveryAppBuilder />)

    await user.click(screen.getByRole('button', { name: 'Add test VM' }))
    expect(screen.getByText('Database VMs: 1')).toBeInTheDocument()
    firstRender.unmount()

    render(<RecoveryAppBuilder />)
    expect(screen.getByText('Database VMs: 0')).toBeInTheDocument()
  })
})
