import type { ReactElement } from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
vi.mock('@/generated/query/policy-sets/policy-sets.gen', () => ({
  useGetPolicySets: () => ({
    data: [
      {
        id: 'tier2-apps',
        name: 'Tier 2 applications',
        description: 'Policy set using the medium-tier, 6-hour cadence.',
        snapshot_policy_id: 'medium-6h',
        recovery_app_policy_id: 'critical-daily-latest',
        clean_room_policy_id: 'enforce-clean-target',
      },
    ],
  }),
}))
vi.mock('@/generated/query/platform-providers/platform-providers.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/platform-providers/platform-providers.gen')>(),
  useGetPlatformProviders: () => ({
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
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument()

    await user.click(screen.getByText('Database group'))

    expect(await screen.findByRole('dialog', { name: 'Recovery group detail' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Database group' })).toBeInTheDocument()
  })

  it('renders a clickable Airflow DAG ID without opening the row detail', async () => {
    const user = userEvent.setup()
    const orchestratedGroup: RecoveryGroup = {
      ...getDatabaseGroup(),
      airflowRunId: '260812103627_4c06f9c8',
      pushToOrchestrator: true,
      orchestrationProviderId: 'airflow-01',
    }
    renderTable(
      <RecoveryGroupsTable
        groups={[orchestratedGroup]}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRollback={vi.fn()}
      />,
    )

    expect(screen.getByText('Airflow DAG ID')).toBeInTheDocument()
    const dagLink = screen.getByRole('link', { name: /dag_260812103627_4c06f9c8/ })
    expect(dagLink).toHaveAttribute(
      'href',
      'https://airflow.dynamic.test:8443/dags/dag_260812103627_4c06f9c8',
    )
    expect(dagLink).toHaveAttribute('target', '_blank')
    expect(dagLink).toHaveAttribute('rel', 'noopener noreferrer')

    await user.click(dagLink)
    expect(screen.queryByRole('dialog', { name: 'Recovery group detail' })).not.toBeInTheDocument()
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

  it('keeps cached group content mounted when a refresh fails after search filters all rows out', async () => {
    const user = userEvent.setup()
    const error = new Error('Background refresh failed')
    renderTable(
      <RecoveryGroupsTable
        groups={groups}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onRollback={vi.fn()}
        error={error}
      />,
    )

    const search = await screen.findByRole('searchbox', { name: 'Search recovery groups' })
    await user.type(search, 'missing')

    expect(screen.getByRole('alert')).toHaveTextContent('Recovery groups could not be loaded')
    expect(screen.getByText('No recovery groups defined yet')).toBeInTheDocument()
    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument()
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

  it('shows the rollback report after a standalone rollback', async () => {
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
    const onRollback = vi.fn().mockResolvedValue(report)
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
    expect(screen.getAllByText(/dag_123/).length).toBeGreaterThan(0)
    expect(screen.getByText('Airflow')).toBeInTheDocument()
    expect(screen.getByText('IBM FlashCopy')).toBeInTheDocument()
  })

  it('does not open a rollback result modal when a standalone rollback is rejected', async () => {
    const user = userEvent.setup()
    const databaseGroup = groups.find(group => group.id === 'database-group')
    if (!databaseGroup) throw new Error('Expected database group fixture')
    const orchestratedGroup: RecoveryGroup = {
      ...databaseGroup,
      pushToOrchestrator: true,
      orchestrationProviderId: 'airflow-01',
    }
    const onRollback = vi.fn().mockRejectedValue(new Error('Rollback request failed'))
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
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Roll back orchestration?' })).not.toBeInTheDocument()
    })
    expect(screen.queryByRole('dialog', { name: 'Recovery group rollback result' })).not.toBeInTheDocument()
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
    await user.click(within(detail).getByRole('button', { name: 'Orchestration' }))
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
    await user.click(within(detail).getByRole('button', { name: 'Orchestration' }))
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
    await user.click(within(detail).getByRole('button', { name: 'Orchestration' }))
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
    await user.click(within(detail).getByRole('button', { name: 'Orchestration' }))

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
    await user.click(within(detail).getByRole('button', { name: 'Orchestration' }))

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

  describe('Model C drawer', () => {
    beforeEach(() => {
      vi.mocked(useLatestOrchestratorRun).mockReturnValue({ latestRun: null, isLoading: false, error: null })
    })

    const openDetail = async (group: RecoveryGroup) => {
      const user = userEvent.setup()
      renderTable(<RecoveryGroupsTable groups={[group]} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />)
      await user.click(screen.getByText(group.name))
      const detail = await screen.findByRole('dialog', { name: 'Recovery group detail' })
      return { user, detail }
    }
    const metaRow = (detail: HTMLElement) => {
      const row = within(detail).getByText('Recovery group').parentElement
      if (!row) throw new Error('Expected the meta row')
      return row
    }
    const orchestrationToggle = (detail: HTMLElement) => within(detail).getByRole('button', { name: 'Orchestration' })

    it('replaces the tabs with Overview open and Orchestration and Inventory collapsed', async () => {
      const { detail } = await openDetail(getDatabaseGroup())

      expect(within(detail).queryByRole('tab')).not.toBeInTheDocument()
      expect(within(detail).queryByRole('tablist')).not.toBeInTheDocument()
      expect(within(detail).getByRole('button', { name: 'Overview' })).toHaveAttribute('aria-expanded', 'true')
      expect(orchestrationToggle(detail)).toHaveAttribute('aria-expanded', 'false')
      expect(within(detail).getByRole('button', { name: 'Inventory' })).toHaveAttribute('aria-expanded', 'false')
      expect(within(detail).getByRole('region', { name: 'Overview' })).toHaveTextContent('Tier 2 applications')
    })

    it('toggles sections independently', async () => {
      const { user, detail } = await openDetail(getDatabaseGroup())

      await user.click(orchestrationToggle(detail))
      expect(within(detail).getByRole('region', { name: 'Overview' })).toBeInTheDocument()
      expect(within(detail).getByRole('region', { name: 'Orchestration' })).toBeInTheDocument()

      await user.click(within(detail).getByRole('button', { name: 'Overview' }))
      expect(within(detail).queryByRole('region', { name: 'Overview' })).not.toBeInTheDocument()
      expect(within(detail).getByRole('region', { name: 'Orchestration' })).toBeInTheDocument()
    })

    it('summarises the workload and the resource count', async () => {
      const { detail } = await openDetail(getDatabaseGroup())

      expect(within(detail).getByRole('button', { name: 'Overview' })).toHaveAccessibleDescription('VMware virtual machines')
      expect(within(detail).getByRole('button', { name: 'Inventory' })).toHaveAccessibleDescription('VMs: 2')
    })

    it('summarises volume groups and empty groups', async () => {
      const volumeGroup: RecoveryGroup = {
        ...getDatabaseGroup(),
        id: 'volume-group',
        name: 'Volume group',
        sourceCategory: 'storage_system',
        workloadType: 'ibm_flashsystem',
        resourceType: 'volume',
        resourceCount: 3,
      }
      const { detail } = await openDetail(volumeGroup)
      expect(within(detail).getByRole('button', { name: 'Inventory' })).toHaveAccessibleDescription('Volumes: 3')
    })

    it('says "No resources" for an empty group', async () => {
      const { detail } = await openDetail({ ...getDatabaseGroup(), resources: [], resourceCount: 0 })
      expect(within(detail).getByRole('button', { name: 'Inventory' })).toHaveAccessibleDescription('No resources')
    })

    it('mounts the inventory only once the section is opened', async () => {
      const user = userEvent.setup()
      render(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <RecoveryGroupsTable groups={[getDatabaseGroup()]} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />
          </MemoryRouter>
        </QueryClientProvider>,
      )
      await user.click(screen.getByText('Database group'))
      const detail = await screen.findByRole('dialog', { name: 'Recovery group detail' })

      expect(within(detail).queryByText('Inventory is available after an orchestrated run.')).not.toBeInTheDocument()
      await user.click(within(detail).getByRole('button', { name: 'Inventory' }))
      expect(within(detail).getByRole('region', { name: 'Inventory' })).toHaveTextContent('Inventory is available after an orchestrated run.')
    })

    it('shows the entity, the status badge and the draft state in the meta row', async () => {
      const { detail } = await openDetail({ ...getDatabaseGroup(), status: 'Draft' })
      expect(metaRow(detail)).toHaveTextContent('Recovery group')
      expect(within(metaRow(detail)).getByText('Draft')).toBeInTheDocument()
    })

    it('A: not orchestrated and not configured only when push is off', async () => {
      const { detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: false, orchestrationProviderId: 'airflow-01' })
      expect(metaRow(detail)).toHaveTextContent('Not orchestrated')
      expect(orchestrationToggle(detail)).toHaveAccessibleDescription('Not configured')
    })

    it('B: orchestration incomplete without an orchestration provider', async () => {
      const { detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: true, orchestrationProviderId: null })
      expect(metaRow(detail)).toHaveTextContent('Orchestration incomplete')
      expect(orchestrationToggle(detail)).toHaveAccessibleDescription('Orchestration incomplete')
      expect(detail).not.toHaveTextContent('Not orchestrated')
      expect(detail).not.toHaveTextContent('Not configured')
    })

    it('C: orchestrator unavailable when the provider is not in the list', async () => {
      const { detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: true, orchestrationProviderId: 'airflow-gone', airflowRunId: 'run-1' })
      expect(metaRow(detail)).toHaveTextContent('Orchestrator unavailable')
      expect(orchestrationToggle(detail)).toHaveAccessibleDescription('Orchestrator unavailable')
      expect(detail).not.toHaveTextContent('Not orchestrated')
      expect(detail).not.toHaveTextContent('Not configured')
    })

    it('D: no run ID yet when the provider exists without a run id', async () => {
      const { detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: true, orchestrationProviderId: 'airflow-01', airflowRunId: null })
      expect(metaRow(detail)).toHaveTextContent('No run ID yet')
      expect(orchestrationToggle(detail)).toHaveAccessibleDescription('Dynamic Airflow')
      expect(detail).not.toHaveTextContent('Not orchestrated')
      expect(detail).not.toHaveTextContent('Not configured')
    })

    it('E3: no runs yet when the orchestrator has no run', async () => {
      const { detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: true, orchestrationProviderId: 'airflow-01', airflowRunId: 'run-1' })
      expect(metaRow(detail)).toHaveTextContent('No runs yet')
      expect(orchestrationToggle(detail)).toHaveAccessibleDescription('Dynamic Airflow')
      expect(detail).not.toHaveTextContent('Not orchestrated')
    })

    it('E4: last run status and duration from the latest run', async () => {
      vi.mocked(useLatestOrchestratorRun).mockReturnValue({
        latestRun: { runId: 'r1', status: 'success', startedAt: '2026-08-19T08:51:00Z', endedAt: '2026-08-19T08:51:07Z', durationSeconds: 7.45 },
        isLoading: false,
        error: null,
      })
      const { detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: true, orchestrationProviderId: 'airflow-01', airflowRunId: 'run-1' })
      expect(metaRow(detail)).toHaveTextContent('Last run: success · 7s')
      expect(orchestrationToggle(detail)).toHaveAccessibleDescription('Dynamic Airflow')
    })

    it('E1: leaves the run fact out while the latest run loads (E2 is covered by the state unit test)', async () => {
      vi.mocked(useLatestOrchestratorRun).mockReturnValue({ latestRun: null, isLoading: true, error: null })
      const { detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: true, orchestrationProviderId: 'airflow-01', airflowRunId: 'run-1' })
      expect(metaRow(detail)).not.toHaveTextContent('No runs yet')
      expect(metaRow(detail)).not.toHaveTextContent('Last run')
    })

    it('puts Delete in the left footer group and Edit on the right', async () => {
      const { detail } = await openDetail(getDatabaseGroup())
      const deleteButton = within(detail).getByRole('button', { name: 'Delete' })
      const editButton = within(detail).getByRole('button', { name: 'Edit' })
      const footer = deleteButton.parentElement?.parentElement

      expect(footer?.children[0]).toContainElement(deleteButton)
      expect(footer?.children[1]).toContainElement(editButton)
      expect(deleteButton).not.toHaveClass('flex-1')
      expect(editButton).not.toHaveClass('flex-1')
    })

    it('shows the resource provider unavailable badge in the meta row for unresolved groups', async () => {
      const { detail } = await openDetail({ ...getDatabaseGroup(), providerResolution: 'unresolved' })
      expect(within(metaRow(detail)).getByText('Provider unavailable')).toBeInTheDocument()
      expect(within(detail).getByRole('button', { name: 'Edit' })).toHaveAccessibleDescription(
        'Editing is unavailable until the configured provider is restored.',
      )
    })

    it('closes the drawer from the close button', async () => {
      const { user, detail } = await openDetail(getDatabaseGroup())
      await user.click(within(detail).getByRole('button', { name: 'Close recovery group detail' }))
      expect(screen.queryByRole('dialog', { name: 'Recovery group detail' })).not.toBeInTheDocument()
    })

    it('opens the recovery group help from the header actions and closes only the help on Escape', async () => {
      const { user, detail } = await openDetail(getDatabaseGroup())
      const titleRow = within(detail).getByRole('heading', { name: 'Database group' }).parentElement
      const trigger = within(detail).getByRole('button', { name: 'Recovery group help' })

      expect(titleRow).toContainElement(trigger)
      await user.click(trigger)
      const help = within(detail).getByRole('dialog', { name: 'How a recovery group works' })
      expect(help).toHaveTextContent('Local protection')
      expect(help).toHaveTextContent('Remote protection')
      expect(help).toHaveTextContent('Metro Mirror')
      expect(help).toHaveTextContent('Airflow')

      await user.keyboard('{Escape}')
      expect(within(detail).queryByRole('dialog', { name: 'How a recovery group works' })).not.toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'Recovery group detail' })).toBeInTheDocument()
      expect(trigger).toHaveFocus()

      await user.click(within(detail).getByRole('button', { name: 'Close recovery group detail' }))
      expect(screen.queryByRole('dialog', { name: 'Recovery group detail' })).not.toBeInTheDocument()
    })

    it('resets the sections when another group is opened', async () => {
      const user = userEvent.setup()
      renderTable(<RecoveryGroupsTable groups={groups} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />)

      await user.click(screen.getByText('Database group'))
      let detail = await screen.findByRole('dialog', { name: 'Recovery group detail' })
      await user.click(orchestrationToggle(detail))
      expect(orchestrationToggle(detail)).toHaveAttribute('aria-expanded', 'true')
      await user.click(within(detail).getByRole('button', { name: 'Close recovery group detail' }))

      await user.click(screen.getByText('Power group'))
      detail = await screen.findByRole('dialog', { name: 'Recovery group detail' })
      expect(orchestrationToggle(detail)).toHaveAttribute('aria-expanded', 'false')
    })
  })
})
