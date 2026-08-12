import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryAppBuilder } from './RecoveryAppBuilder'
import type { RecoveryTier } from '../model/recoveryApplicationTypes'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

const platformProvidersQuery = vi.hoisted(() => ({
  current: {
    data: [{ id: 'airflow-01', name: 'Primary Airflow', type: 'AIRFLOW', credentialStatus: 'ok' }],
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}))
const policySetsQuery = vi.hoisted(() => ({
  current: {
    data: [{
      id: 'critical-daily-latest',
      name: 'Critical - Daily DR Test',
      description: 'Daily recovery test',
      snapshotPolicyId: 'daily-latest',
      recoveryAppPolicyId: 'critical-daily-latest',
      cleanRoomPolicyId: 'enforce-clean-target',
    }],
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}))
const providersQuery = vi.hoisted(() => ({
  current: {
    data: [{
      id: 'vmware-01',
      name: 'Production vCenter',
      description: 'VMware provider',
      type: 'VMWARE',
      ipAddress: '10.0.0.10',
      credentialId: 'vmware-cred',
      credentialStatus: 'ok',
    }],
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
}))
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

vi.mock('@/features/platform-administration/platform-providers/hooks/usePlatformProviders', () => ({
  usePlatformProviders: () => platformProvidersQuery.current,
}))
vi.mock('@/features/recovery-plans/policy-sets/hooks/usePolicySets', () => ({
  usePolicySets: () => policySetsQuery.current,
}))
vi.mock('@/features/providers-connectors/providers/hooks/useProviders', () => ({
  useProviders: () => providersQuery.current,
}))
vi.mock('../../recovery-groups/hooks/useRecoveryGroups', () => ({
  useRecoveryGroups: () => recoveryGroupsQuery.current,
}))
vi.mock('./TierCanvas', () => ({
  TierCanvas: ({
    tiers,
    recoveryGroupVmOptions,
    onRecoveryGroupAdded,
    onRecoveryGroupRemoved,
    onRecoveryVmSelectionChange,
  }: {
    tiers: Record<string, RecoveryTier>
    recoveryGroupVmOptions?: Record<string, string[]>
    onRecoveryGroupAdded?: (tierId: string, groupId: string) => void
    onRecoveryGroupRemoved?: (tierId: string) => void
    onRecoveryVmSelectionChange?: (tierId: string, vmName: string, selected: boolean) => void
  }) => (
    <div>
      <span>Tier count: {Object.keys(tiers).length}</span>
      <span>Database VMs: {tiers['database']?.recovery_group?.vms.length ?? 0}</span>
      <span>Database options: {recoveryGroupVmOptions?.['database_group']?.length ?? 0}</span>
      <button type="button" onClick={() => { onRecoveryGroupAdded?.('database', 'database_group') }}>
        Add test group
      </button>
      <button type="button" onClick={() => { onRecoveryGroupRemoved?.('database') }}>
        Remove test group
      </button>
      <button type="button" onClick={() => { onRecoveryVmSelectionChange?.('database', 'DB-01', false) }}>
        Exclude DB-01
      </button>
      <button
        type="button"
        onClick={() => { Object.keys(tiers).forEach(tierId => { onRecoveryGroupAdded?.(tierId, 'database_group') }) }}
      >
        Assign all tiers
      </button>
    </div>
  ),
}))

function fillDetails() {
  fireEvent.change(screen.getByLabelText('File name *'), { target: { value: 'finance_recovery' } })
  fireEvent.change(screen.getByLabelText('Application Name *'), { target: { value: 'Finance' } })
  fireEvent.change(screen.getByLabelText('Description *'), { target: { value: 'Finance recovery' } })
  fireEvent.change(screen.getByLabelText('Provider ID *'), { target: { value: 'vmware-01' } })
}

async function openTiers() {
  fillDetails()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Next' }))
}

async function openPolicy() {
  await openTiers()
  await userEvent.setup().click(screen.getByRole('button', { name: 'Assign all tiers' }))
  await userEvent.setup().click(screen.getByRole('button', { name: 'Next' }))
}

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
    platformProvidersQuery.current.isLoading = false
    platformProvidersQuery.current.error = null
    platformProvidersQuery.current.refetch.mockReset()
    policySetsQuery.current.isLoading = false
    policySetsQuery.current.error = null
    policySetsQuery.current.refetch.mockReset()
    providersQuery.current.isLoading = false
    providersQuery.current.error = null
    providersQuery.current.refetch.mockReset()
  })

  it('renders the four-step wizard and keeps later steps disabled until details are valid', () => {
    render(<RecoveryAppBuilder />)
    expect(screen.getByRole('list', { name: 'Recovery application creation steps' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Application details' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('button', { name: 'Recovery groups & tiers' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Policy set' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Orchestration' })).toBeDisabled()
  })

  it('opens the recovery groups and tiers step after valid details', async () => {
    render(<RecoveryAppBuilder />)
    await openTiers()
    expect(screen.getByRole('button', { name: 'Recovery groups & tiers' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByText('Tier count: 1')).toBeInTheDocument()
    expect(screen.getByText('Database options: 2')).toBeInTheDocument()
  })

  it('keeps tier assignments when moving to policy selection', async () => {
    render(<RecoveryAppBuilder />)
    await openPolicy()
    expect(screen.getByRole('button', { name: 'Policy set' })).toHaveAttribute('aria-current', 'step')
    expect(screen.getByRole('button', { name: /Critical - Daily DR Test/ })).toBeInTheDocument()
  })

  it('requires a policy before opening orchestration', async () => {
    const user = userEvent.setup()
    render(<RecoveryAppBuilder />)
    await openPolicy()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Critical - Daily DR Test/ }))
    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByRole('button', { name: 'Orchestration' })).toHaveAttribute('aria-current', 'step')
  })

  it('requires an Airflow provider only when push is enabled and saves the form state', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn()
    render(<RecoveryAppBuilder onSave={onSave} />)
    await openPolicy()
    await user.click(screen.getByRole('button', { name: /Critical - Daily DR Test/ }))
    await user.click(screen.getByRole('button', { name: 'Next' }))

    const save = screen.getByRole('button', { name: 'Save Application' })
    expect(save).toBeEnabled()
    await user.click(screen.getByRole('switch', { name: 'Push to orchestrator' }))
    expect(save).toBeDisabled()
    await user.selectOptions(screen.getByLabelText('Airflow provider *'), 'airflow-01')
    expect(save).toBeEnabled()
    await user.click(save)
    expect(onSave).toHaveBeenCalledOnce()
    expect(onSave.mock.calls[0]?.[0]).toMatchObject({
      fileName: 'finance_recovery',
      policySetId: 'critical-daily-latest',
      platform: 'vmware-01',
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: true,
    })
  })

  it('retries a recovery-group load error in its own step', async () => {
    const user = userEvent.setup()
    recoveryGroupsQuery.current.error = new Error('Groups unavailable')
    render(<RecoveryAppBuilder />)
    await openTiers()
    expect(screen.getByRole('alert')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(recoveryGroupsQuery.current.refresh).toHaveBeenCalledOnce()
  })

  it('reports metadata and tier changes as dirty', async () => {
    const user = userEvent.setup()
    const onDirtyChange = vi.fn()
    render(<RecoveryAppBuilder onDirtyChange={onDirtyChange} />)
    fireEvent.change(screen.getByLabelText('Application Name *'), { target: { value: 'Finance' } })
    expect(onDirtyChange).toHaveBeenCalledWith(true)
    await openTiers()
    await user.click(screen.getByRole('button', { name: 'Add test group' }))
    expect(screen.getByText('Database VMs: 2')).toBeInTheDocument()
  })
})
