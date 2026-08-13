import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RecoveryGroup } from '../model/recoveryGroupTypes'
import { RecoveryGroupsTable } from './RecoveryGroupsTable'

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/recovery-plans/policy-sets/hooks/usePolicySets', () => ({
  usePolicySets: () => ({
    data: [
      {
        id: 'tier2-apps',
        name: 'Tier 2 applications',
        description: 'Policy set using the medium-tier, 6-hour cadence.',
        snapshotPolicyId: 'medium-6h',
        recoveryAppPolicyId: 'critical-daily-latest',
        cleanRoomPolicyId: 'enforce-clean-target',
      },
    ],
  }),
}))

const groups: RecoveryGroup[] = [
  {
    id: 'database-group',
    name: 'Database group',
    description: 'Primary database virtual machines',
    sourceCategory: 'backup_system_workload',
    workloadType: 'vmware_virtual_machines',
    resourceType: 'vm',
    providerId: 'vmware-vcenter-01',
    policySetId: 'tier2-apps',
    resources: ['DB-01', 'DB-02'],
    relatedVolumeProviderId: 'ibm-flashsystem-01',
    relatedVolumes: ['VOL-01'],
    resourceCount: 2,
    status: 'Active',
  },
  {
    id: 'power-group',
    name: 'Power group',
    description: 'Production Power workloads',
    sourceCategory: 'backup_system_workload',
    workloadType: 'ibm_power_virtual_machines',
    resourceType: 'vm',
    providerId: 'ibm-power-01',
    policySetId: 'tier2-apps',
    resources: ['LPAR-01', 'LPAR-02'],
    relatedVolumeProviderId: null,
    relatedVolumes: [],
    resourceCount: 2,
    status: 'Active',
  },
]

const unresolvedGroup: RecoveryGroup = {
  ...groups[0],
  id: 'orphan-vm-group',
  name: 'Orphan VM group',
  description: 'Provider no longer exists',
  providerId: 'removed-vmware-provider',
  policySetId: 'tier2-apps',
  resources: ['ORPHAN-VM-01'],
  relatedVolumeProviderId: null,
  relatedVolumes: [],
  resourceCount: 1,
  status: 'Active',
  sourceCategory: 'backup_system_workload',
  resourceType: 'vm',
  workloadType: null,
  providerResolution: 'unresolved',
}

describe('RecoveryGroupsTable', () => {
  it('renders group columns and opens the group detail drawer', async () => {
    const user = userEvent.setup()
    render(
      <RecoveryGroupsTable groups={groups} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />,
    )

    expect(await screen.findByText('Recovery Group')).toBeInTheDocument()
    expect(screen.getByText('Workload Type')).toBeInTheDocument()
    expect(screen.getByText('Resource Type')).toBeInTheDocument()

    await user.click(screen.getByText('Database group'))

    expect(await screen.findByRole('dialog', { name: 'Recovery group detail' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Database group' })).toBeInTheDocument()
  })

  it('filters groups by search text', async () => {
    const user = userEvent.setup()
    render(
      <RecoveryGroupsTable groups={groups} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />,
    )

    const search = await screen.findByRole('searchbox', { name: 'Search recovery groups' })
    await user.type(search, 'missing')

    expect(screen.getByText('No recovery groups defined yet')).toBeInTheDocument()
  })

  it('renders the IBM Power workload label', () => {
    render(
      <RecoveryGroupsTable groups={groups} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />,
    )

    expect(screen.getByText('IBM Power virtual machines')).toBeInTheDocument()
  })

  it('edits and confirms deletion from the detail panel', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const databaseGroup = groups.find(group => group.id === 'database-group')
    if (!databaseGroup) throw new Error('Expected database group fixture')
    render(
      <RecoveryGroupsTable groups={groups} onEdit={onEdit} onDelete={onDelete} onRollback={vi.fn()} />,
    )

    await user.click(screen.getByText('Database group'))
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledWith('database-group')

    await user.click(screen.getByText('Database group'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Delete recovery group' })
    expect(confirmDialog).toHaveTextContent('Database group')

    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(databaseGroup)
  })

  it('shows the rollback report after deleting an orchestrated group', async () => {
    const user = userEvent.setup()
    const databaseGroup = groups.find(group => group.id === 'database-group')
    if (!databaseGroup) throw new Error('Expected database group fixture')
    const orchestratedGroup: RecoveryGroup = {
      ...databaseGroup,
      pushToOrchestrator: true,
      orchestrationProviderId: 'airflow-01',
    }
    const report = {
      status: 'ok',
      airflow: { status: 'ok', dag_id: 'dag_123' },
      ibm: { status: 'ok', errors: [] },
    }
    const onDelete = vi.fn().mockResolvedValue(report)
    render(
      <RecoveryGroupsTable
        groups={[orchestratedGroup]}
        onEdit={vi.fn()}
        onDelete={onDelete}
        onRollback={vi.fn()}
      />,
    )

    await user.click(screen.getByText('Database group'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Delete recovery group' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledWith(orchestratedGroup)
    expect(await screen.findByText('Orchestration rolled back')).toBeInTheDocument()
    expect(screen.getByText('dag_123')).toBeInTheDocument()
  })

  it('does not show a rollback report after a regular delete', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue(null)
    const databaseGroup = groups.find(group => group.id === 'database-group')
    if (!databaseGroup) throw new Error('Expected database group fixture')
    render(
      <RecoveryGroupsTable groups={groups} onEdit={vi.fn()} onDelete={onDelete} onRollback={vi.fn()} />,
    )

    await user.click(screen.getByText('Database group'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Delete recovery group' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledWith(databaseGroup)
    expect(screen.queryByText('Orchestration rolled back')).not.toBeInTheDocument()
  })

  it('shows the resolved policy set name in the detail drawer', async () => {
    const user = userEvent.setup()
    render(
      <RecoveryGroupsTable groups={groups} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />,
    )

    await user.click(screen.getByText('Database group'))

    expect(await screen.findByRole('dialog', { name: 'Recovery group detail' })).toBeInTheDocument()
    expect(screen.getByText('Tier 2 applications')).toBeInTheDocument()
  })

  it('opens a JSON viewer showing the recovery group submit payload', async () => {
    const user = userEvent.setup()
    render(
      <RecoveryGroupsTable groups={groups} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />,
    )

    const [viewJsonButton] = screen.getAllByRole('button', { name: 'View' })
    if (!viewJsonButton) throw new Error('Expected a View button to be rendered')
    await user.click(viewJsonButton)

    const dialog = await screen.findByRole('dialog', { name: 'Recovery Group JSON' })
    expect(within(dialog).getByText(/"id": "database-group"/)).toBeInTheDocument()
    expect(within(dialog).getByText(/"provider_id_vm": "vmware-vcenter-01"/)).toBeInTheDocument()
    expect(within(dialog).getByText(/"provider_id_volume": "ibm-flashsystem-01"/)).toBeInTheDocument()
    expect(within(dialog).getByText(/"policy_set_id": "tier2-apps"/)).toBeInTheDocument()
  })

  it('keeps unresolved groups visible and disables only unsafe editing', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    render(
      <RecoveryGroupsTable
        groups={[unresolvedGroup]}
        onEdit={onEdit}
        onDelete={vi.fn()}
        onRollback={vi.fn()}
      />,
    )

    expect(screen.getByText('Orphan VM group')).toBeInTheDocument()
    expect(screen.getAllByText('Provider unavailable').length).toBeGreaterThan(0)
    await user.click(screen.getByText('Orphan VM group'))

    const detail = await screen.findByRole('dialog', { name: 'Recovery group detail' })
    expect(detail).toHaveTextContent('removed-vmware-provider')
    expect(within(detail).getByRole('button', { name: 'Edit' })).toBeDisabled()
    expect(within(detail).getByRole('button', { name: 'Delete' })).toBeEnabled()
  })

})
