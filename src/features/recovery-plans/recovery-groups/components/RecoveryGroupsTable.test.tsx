import type { ReactElement } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import type { RecoveryGroup } from '../model/recoveryGroupTypes'
import { RecoveryGroupsTable } from './RecoveryGroupsTable'
import { useLatestOrchestratorRun } from '@/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun'
import { OrvalApiError } from '@/shared/api/orvalMutator'

const navigate = vi.fn()

vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useNavigate: () => navigate,
}))
vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun', () => ({
  useLatestOrchestratorRun: vi.fn(() => ({ latestRun: null, isLoading: false, error: null })),
}))

function renderTable(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}
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
vi.mock('@/features/platform-administration/platform-providers/hooks/usePlatformProviders', () => ({
  usePlatformProviders: () => ({
    data: [
      { id: 'airflow-01', name: 'Dynamic Airflow', url: 'https://airflow.dynamic.test:8443' },
      { id: 'airflow-without-url', name: 'Fallback Airflow' },
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

function getDatabaseGroup(): RecoveryGroup {
  const group = groups.find(candidate => candidate.id === 'database-group')
  if (!group) throw new Error('Expected database group fixture')
  return group
}

describe('RecoveryGroupsTable', () => {
  it('shows nested backend detail in the localized retry state', () => {
    const error = new Error('Get recovery groups request failed', {
      cause: new OrvalApiError(503, 'Unavailable', { detail: 'The inventory service is unavailable.' }),
    })
    renderTable(
      <RecoveryGroupsTable groups={[]} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} error={error} />,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Recovery groups could not be loaded')
    expect(alert).toHaveTextContent('The inventory service is unavailable.')
    expect(screen.getByRole('button', { name: 'Retry' })).toBeEnabled()
  })

  it('keeps the localized retry state without a synthetic description when an API error has no detail', () => {
    const error = new Error('Get recovery groups request failed', {
      cause: new OrvalApiError(503, 'Unavailable', { error: 'upstream internals' }),
    })
    renderTable(
      <RecoveryGroupsTable groups={[]} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} error={error} />,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Recovery groups could not be loaded')
    expect(alert).not.toHaveTextContent('upstream internals')
    expect(alert).not.toHaveTextContent('API request failed')
  })

  it('renders group columns and opens the group detail drawer', async () => {
    const user = userEvent.setup()
    renderTable(
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
    renderTable(
      <RecoveryGroupsTable groups={groups} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />,
    )

    const search = await screen.findByRole('searchbox', { name: 'Search recovery groups' })
    await user.type(search, 'missing')

    expect(screen.getByText('No recovery groups defined yet')).toBeInTheDocument()
  })

  it('renders the IBM Power workload label', () => {
    renderTable(
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
    renderTable(
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
    renderTable(
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
    expect(confirmDialog).toHaveTextContent(
      'This recovery group is deployed to the orchestrator. Deleting it will first roll back its Airflow and IBM FlashCopy resources.',
    )
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledWith(orchestratedGroup)
    expect(await screen.findByText('Orchestration rolled back')).toBeInTheDocument()
    expect(screen.getAllByText(/dag_123/).length).toBeGreaterThan(0)
  })

  it('does not show a rollback report after a regular delete', async () => {
    const user = userEvent.setup()
    const onDelete = vi.fn().mockResolvedValue(null)
    const databaseGroup = groups.find(group => group.id === 'database-group')
    if (!databaseGroup) throw new Error('Expected database group fixture')
    renderTable(
      <RecoveryGroupsTable groups={groups} onEdit={vi.fn()} onDelete={onDelete} onRollback={vi.fn()} />,
    )

    await user.click(screen.getByText('Database group'))
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Delete recovery group' })
    expect(confirmDialog).toHaveTextContent(
      'Are you sure you want to delete the recovery group Database group?',
    )
    expect(confirmDialog).not.toHaveTextContent('deployed to the orchestrator')
    await user.click(within(confirmDialog).getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledWith(databaseGroup)
    expect(screen.queryByText('Orchestration rolled back')).not.toBeInTheDocument()
  })

  it('shows a plain success confirmation after a standalone rollback, without report detail', async () => {
    const user = userEvent.setup()
    const databaseGroup = groups.find(group => group.id === 'database-group')
    if (!databaseGroup) throw new Error('Expected database group fixture')
    const orchestratedGroup: RecoveryGroup = {
      ...databaseGroup,
      pushToOrchestrator: true,
      orchestrationProviderId: 'airflow-01',
    }
    const onRollback = vi.fn().mockResolvedValue(undefined)
    renderTable(
      <RecoveryGroupsTable
        groups={[orchestratedGroup]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRollback={onRollback}
      />,
    )

    await user.click(screen.getByRole('button', { name: '⋯' }))
    await user.click(screen.getByRole('menuitem', { name: 'Roll back' }))
    const confirmDialog = screen.getByRole('dialog', { name: 'Roll back orchestration?' })
    await user.click(within(confirmDialog).getByRole('button', { name: 'Roll back' }))

    expect(onRollback).toHaveBeenCalledWith('database-group', 'airflow-01')
    expect(await screen.findByText('Orchestration rolled back')).toBeInTheDocument()
    expect(screen.getByText('Rolled back')).toBeInTheDocument()
    expect(screen.queryByText('DAG ID')).not.toBeInTheDocument()
    expect(screen.queryByText('IBM FlashCopy')).not.toBeInTheDocument()
  })

  it('shows the resolved policy set name in the detail drawer', async () => {
    const user = userEvent.setup()
    renderTable(
      <RecoveryGroupsTable groups={groups} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />,
    )

    await user.click(screen.getByText('Database group'))

    expect(await screen.findByRole('dialog', { name: 'Recovery group detail' })).toBeInTheDocument()
    expect(screen.getByText('Tier 2 applications')).toBeInTheDocument()
  })

  it('links the airflow run id to the exact DAG under the selected provider URL', async () => {
    const user = userEvent.setup()
    const orchestratedGroup: RecoveryGroup = {
      ...getDatabaseGroup(),
      airflowRunId: '260812103627_4c06f9c8',
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: true,
    }
    renderTable(
      <RecoveryGroupsTable groups={[orchestratedGroup]} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />,
    )

    await user.click(screen.getByText('Database group'))

    const detail = await screen.findByRole('dialog', { name: 'Recovery group detail' })
    await user.click(within(detail).getByRole('tab', { name: 'Orchestration' }))
    expect(within(detail).getByRole('link', { name: /260812103627_4c06f9c8/ })).toHaveAttribute(
      'href',
      'https://airflow.dynamic.test:8443/dags/dag_260812103627_4c06f9c8',
    )
  })

  it('uses the central Airflow fallback when the selected provider has no URL', async () => {
    const user = userEvent.setup()
    const orchestratedGroup: RecoveryGroup = {
      ...getDatabaseGroup(),
      airflowRunId: 'run-123',
      orchestrationProviderId: 'airflow-without-url',
      pushToOrchestrator: true,
    }
    renderTable(
      <RecoveryGroupsTable groups={[orchestratedGroup]} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />,
    )

    await user.click(screen.getByText('Database group'))

    const detail = await screen.findByRole('dialog', { name: 'Recovery group detail' })
    await user.click(within(detail).getByRole('tab', { name: 'Orchestration' }))
    expect(within(detail).getByRole('link', { name: /run-123/ })).toHaveAttribute(
      'href',
      'http://10.99.99.55:8080/dags/dag_run-123',
    )
  })

  it('does not render an Airflow link when the group has no run id', async () => {
    const user = userEvent.setup()
    renderTable(
      <RecoveryGroupsTable groups={[getDatabaseGroup()]} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />,
    )

    await user.click(screen.getByText('Database group'))

    const detail = await screen.findByRole('dialog', { name: 'Recovery group detail' })
    await user.click(within(detail).getByRole('tab', { name: 'Orchestration' }))
    expect(within(detail).queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows orchestrator status and navigates to Recovery Runs when the group is orchestrated', async () => {
    vi.mocked(useLatestOrchestratorRun).mockReturnValue({
      latestRun: { runId: 'r1', status: 'success', startedAt: '2026-08-19T08:51:00Z', endedAt: '2026-08-19T08:51:07Z', durationSeconds: 7.45 },
      isLoading: false,
      error: null,
    })
    const user = userEvent.setup()
    const orchestratedGroup: RecoveryGroup = {
      ...getDatabaseGroup(),
      airflowRunId: '260812103627_4c06f9c8',
      orchestrationProviderId: 'airflow-01',
      pushToOrchestrator: true,
    }
    renderTable(
      <RecoveryGroupsTable groups={[orchestratedGroup]} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />,
    )

    await user.click(screen.getByText('Database group'))
    const detail = await screen.findByRole('dialog', { name: 'Recovery group detail' })
    await user.click(within(detail).getByRole('tab', { name: 'Orchestration' }))

    expect(within(detail).getByText('success')).toBeInTheDocument()

    await user.click(within(detail).getByRole('button', { name: 'View recovery runs →' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-runs?tab=groups&entityType=group&entityId=database-group')
  })

  it('shows no orchestrator status when the group has no run id', async () => {
    const user = userEvent.setup()
    renderTable(
      <RecoveryGroupsTable groups={[getDatabaseGroup()]} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />,
    )

    await user.click(screen.getByText('Database group'))
    const detail = await screen.findByRole('dialog', { name: 'Recovery group detail' })
    await user.click(within(detail).getByRole('tab', { name: 'Orchestration' }))

    expect(within(detail).queryByRole('button', { name: 'View recovery runs →' })).not.toBeInTheDocument()
  })

  it('opens a JSON viewer showing the recovery group submit payload', async () => {
    const user = userEvent.setup()
    renderTable(
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
    renderTable(
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
