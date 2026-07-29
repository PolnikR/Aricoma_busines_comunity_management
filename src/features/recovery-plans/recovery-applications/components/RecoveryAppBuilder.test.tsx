import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryAppBuilder } from './RecoveryAppBuilder'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
const recoveryGroupsQuery = vi.hoisted(() => ({
  current: {
    groups: [{
      id: 'database_group',
      name: 'Database Group',
      description: 'Database recovery group',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      resources: ['DB-01', 'DB-02'],
      resourceCount: 2,
      status: 'Active',
    }],
    isLoading: false,
    isFetching: false,
    error: null as Error | null,
    refresh: vi.fn(),
  },
}))

vi.mock('../../recovery-groups/hooks/useRecoveryGroups', () => ({
  useRecoveryGroups: () => recoveryGroupsQuery.current,
}))
vi.mock('./TierCanvas', () => ({
  TierCanvas: ({
    tiers,
    onRecoveryGroupAdded,
    onRecoveryGroupRemoved,
  }: {
    tiers: Record<string, RecoveryTier>
    onRecoveryGroupAdded?: (tierId: string, groupId: string) => void
    onRecoveryGroupRemoved?: (tierId: string) => void
  }) => (
    <div>
      <span>Database VMs: {tiers['database']?.recovery_group?.vms.length ?? 0}</span>
      <button type="button" onClick={() => { onRecoveryGroupAdded?.('database', 'database_group') }}>
        Add test group
      </button>
      <button type="button" onClick={() => { onRecoveryGroupRemoved?.('database') }}>
        Remove test group
      </button>
      <button
        type="button"
        onClick={() => {
          Object.keys(tiers).forEach(tierId => {
            onRecoveryGroupAdded?.(tierId, 'database_group')
          })
        }}
      >
        Assign all tiers
      </button>
    </div>
  ),
}))

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RecoveryAppBuilder', () => {
  beforeEach(() => {
    recoveryGroupsQuery.current.groups = [{
      id: 'database_group',
      name: 'Database Group',
      description: 'Database recovery group',
      sourceCategory: 'backup_system_workload',
      workloadType: 'vmware_virtual_machines',
      resourceType: 'vm',
      resources: ['DB-01', 'DB-02'],
      resourceCount: 2,
      status: 'Active',
    }]
    recoveryGroupsQuery.current.isLoading = false
    recoveryGroupsQuery.current.isFetching = false
    recoveryGroupsQuery.current.error = null
    recoveryGroupsQuery.current.refresh.mockReset()
  })

  it('shows a loading skeleton while recovery groups are loading', () => {
    recoveryGroupsQuery.current.isLoading = true

    render(<RecoveryAppBuilder />)

    expect(screen.getByRole('status', { name: 'Loading recovery groups...' })).toHaveAttribute('aria-busy', 'true')
    expect(screen.queryByText('Database Group')).not.toBeInTheDocument()
  })

  it('shows a recovery-groups error and retries loading', async () => {
    const user = userEvent.setup()
    recoveryGroupsQuery.current.groups = []
    recoveryGroupsQuery.current.error = new Error('Groups unavailable')

    render(<RecoveryAppBuilder />)

    expect(screen.getByText('Groups unavailable')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(recoveryGroupsQuery.current.refresh).toHaveBeenCalledOnce()
  })

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
    fireEvent.click(screen.getByRole('button', { name: 'Assign all tiers' }))
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

  it('does not retain assigned groups in a new builder instance', async () => {
    const user = userEvent.setup()
    const firstRender = render(<RecoveryAppBuilder />)

    await user.click(screen.getByRole('button', { name: 'Assign all tiers' }))
    expect(screen.getByText('Database VMs: 2')).toBeInTheDocument()
    firstRender.unmount()

    render(<RecoveryAppBuilder />)
    expect(screen.getByText('Database VMs: 0')).toBeInTheDocument()
  })

  it('requires a recovery group in every tier before saving', async () => {
    const user = userEvent.setup()
    const alertMock = vi.fn()
    const onSave = vi.fn()
    vi.stubGlobal('alert', alertMock)
    render(<RecoveryAppBuilder onSave={onSave} />)

    fireEvent.change(screen.getByLabelText('File name *'), { target: { value: 'finance_recovery' } })
    fireEvent.change(screen.getByLabelText('Application Name *'), { target: { value: 'Finance' } })
    fireEvent.change(screen.getByLabelText('Description *'), { target: { value: 'Finance recovery' } })
    await user.click(screen.getByRole('button', { name: 'Save Application' }))

    expect(alertMock).toHaveBeenCalledWith('Assign a recovery group to every tier.')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('stores a detached recovery-group snapshot in the selected tier', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RecoveryAppBuilder onSave={onSave} />)

    await user.click(screen.getByRole('button', { name: 'Assign all tiers' }))
    fireEvent.change(screen.getByLabelText('File name *'), { target: { value: 'finance_recovery' } })
    fireEvent.change(screen.getByLabelText('Application Name *'), { target: { value: 'Finance' } })
    fireEvent.change(screen.getByLabelText('Description *'), { target: { value: 'Finance recovery' } })
    await user.click(screen.getByRole('button', { name: 'Save Application' }))

    const savedState = onSave.mock.calls[0]?.[0] as { tiers: Map<string, RecoveryTier> }
    expect(savedState.tiers.get('database')?.recovery_group).toEqual({
      name: 'database_group',
      description: 'Database recovery group',
      vms: [{ name: 'DB-01' }, { name: 'DB-02' }],
    })
  })

  it('removes an assigned recovery group and reports the builder as dirty', async () => {
    const user = userEvent.setup()
    const onDirtyChange = vi.fn()
    render(<RecoveryAppBuilder onDirtyChange={onDirtyChange} />)

    await user.click(screen.getByRole('button', { name: 'Add test group' }))
    expect(screen.getByText('Database VMs: 2')).toBeInTheDocument()

    onDirtyChange.mockClear()
    await user.click(screen.getByRole('button', { name: 'Remove test group' }))

    expect(screen.getByText('Database VMs: 0')).toBeInTheDocument()
    expect(onDirtyChange).toHaveBeenCalledWith(true)
  })
})
