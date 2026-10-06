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
    expect(within(detail).getByRole('button', { name: 'Edit' })).toBeDisabled()
    expect(within(detail).getByRole('button', { name: 'Delete' })).toBeEnabled()
    await user.click(within(within(detail).getByRole('navigation', { name: 'Sections' })).getByRole('button', { name: 'Technical' }))
    expect(within(detail).getByRole('region', { name: 'Technical' })).toHaveTextContent('removed-vmware-provider')
  })

  describe('DetailView', () => {
    beforeEach(() => {
      vi.mocked(useLatestOrchestratorRun).mockReturnValue({ latestRun: null, isLoading: false, error: null })
    })

    const openDetail = async (group: RecoveryGroup) => {
      const user = userEvent.setup()
      // The Inventory section mounts the real inventory query.
      render(
        <QueryClientProvider client={new QueryClient()}>
          <MemoryRouter>
            <RecoveryGroupsTable groups={[group]} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />
          </MemoryRouter>
        </QueryClientProvider>,
      )
      await user.click(screen.getByText(group.name))
      const detail = await screen.findByRole('dialog', { name: 'Recovery group detail' })
      return { user, detail }
    }
    const navItem = (detail: HTMLElement, name: string) =>
      within(within(detail).getByRole('navigation', { name: 'Sections' })).getByRole('button', { name })
    const openSection = async (user: ReturnType<typeof userEvent.setup>, detail: HTMLElement, name: string) => {
      await user.click(navItem(detail, name))
      return within(detail).getByRole('region', { name })
    }
    const header = (detail: HTMLElement) => {
      const element = within(detail).getByRole('heading', { level: 2 }).closest('header')
      if (!element) throw new Error('Expected the detail header')
      return element
    }

    it('opens expanded with Overview active and only one section rendered', async () => {
      const { detail } = await openDetail(getDatabaseGroup())

      expect(detail).toHaveAttribute('data-mode', 'expanded')
      expect(navItem(detail, 'Overview')).toHaveAttribute('aria-current', 'true')
      expect(within(detail).getAllByRole('region')).toHaveLength(1)
      const overview = within(detail).getByRole('region', { name: 'Overview' })
      expect(overview).toHaveTextContent('Tier 2 applications')
      expect(within(detail).queryByText('Latest run status')).not.toBeInTheDocument()
    })

    it('lists the sections with Technical last and the resource count on Inventory', async () => {
      const { detail } = await openDetail(getDatabaseGroup())
      const items = within(within(detail).getByRole('navigation', { name: 'Sections' })).getAllByRole('button')
      expect(items.map(item => item.textContent)).toEqual(['Overview', 'Orchestration', 'Inventory2', 'Technical'])
    })

    it('shows general and workload fields without status or provider IDs in Overview', async () => {
      const { detail } = await openDetail(getDatabaseGroup())
      const overview = within(detail).getByRole('region', { name: 'Overview' })

      expect(within(overview).getByRole('heading', { name: 'General' })).toBeInTheDocument()
      expect(within(overview).getByRole('heading', { name: 'Workload' })).toBeInTheDocument()
      expect(overview).toHaveTextContent('Primary database virtual machines')
      expect(overview).toHaveTextContent('Compute workloads')
      expect(overview).toHaveTextContent('VMware virtual machines')
      expect(within(overview).getByText('Resource Type').nextElementSibling).toHaveTextContent(/^VM$/)
      expect(overview).not.toHaveTextContent('Resource type: VM')
      expect(overview).not.toHaveTextContent('Active')
      expect(overview).not.toHaveTextContent('vmware-vcenter-01')
    })

    it('shows "Not set" for an empty description', async () => {
      const { detail } = await openDetail({ ...getDatabaseGroup(), description: '' })
      expect(within(detail).getByText('Description').nextElementSibling).toHaveTextContent('Not set')
    })

    it('summarises volume groups and empty groups on Inventory', async () => {
      const volumeGroup: RecoveryGroup = {
        ...getDatabaseGroup(),
        id: 'volume-group',
        name: 'Volume group',
        sourceCategory: 'storage_system',
        workloadType: 'ibm_flashsystem',
        resourceType: 'volume',
        resourceCount: 3,
      }
      const { user, detail } = await openDetail(volumeGroup)
      expect(within(detail).getByText('Resource Type').nextElementSibling).toHaveTextContent(/^Volume$/)
      expect(await openSection(user, detail, 'Inventory')).toHaveTextContent('Volumes: 3')
    })

    it('says "No resources" for an empty group', async () => {
      const { user, detail } = await openDetail({ ...getDatabaseGroup(), resources: [], resourceCount: 0 })
      expect(await openSection(user, detail, 'Inventory')).toHaveTextContent('No resources')
    })

    it('mounts the inventory only once its section is opened', async () => {
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
      expect(await openSection(user, detail, 'Inventory')).toHaveTextContent('Inventory is available after an orchestrated run.')
      expect(within(detail).queryByRole('region', { name: 'Overview' })).not.toBeInTheDocument()
    })

    it('lists the real identifiers in Technical', async () => {
      const { user, detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: true, orchestrationProviderId: 'airflow-01', airflowRunId: 'run-1' })
      const technical = await openSection(user, detail, 'Technical')
      for (const value of ['database-group', 'tier2-apps', 'vmware-vcenter-01', 'ibm-flashsystem-01', 'airflow-01', 'run-1']) {
        expect(technical).toHaveTextContent(value)
      }
      expect(within(technical).getByRole('button', { name: 'Copy Group ID' })).toBeInTheDocument()
    })

    it('shows the entity, the status badge and the orchestration fact in the header', async () => {
      const { detail } = await openDetail({ ...getDatabaseGroup(), status: 'Draft' })
      expect(header(detail)).toHaveTextContent('Recovery group')
      expect(within(header(detail)).getByText('Draft')).toBeInTheDocument()
      expect(header(detail)).toHaveTextContent('Not orchestrated')
      expect(header(detail)).not.toHaveTextContent('database-group')
    })

    it('A: not configured when push is off', async () => {
      const { user, detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: false, orchestrationProviderId: 'airflow-01' })
      const orchestration = await openSection(user, detail, 'Orchestration')
      expect(orchestration).toHaveTextContent('Latest run status')
      expect(orchestration).toHaveTextContent('Not configured')
      expect(orchestration).not.toHaveTextContent('Orchestration: Yes')
      expect(within(orchestration).queryByRole('button', { name: 'View recovery runs →' })).not.toBeInTheDocument()
    })

    it('B: orchestration incomplete without an orchestration provider', async () => {
      const { user, detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: true, orchestrationProviderId: null })
      expect(header(detail)).toHaveTextContent('Orchestration incomplete')
      const orchestration = await openSection(user, detail, 'Orchestration')
      expect(orchestration).toHaveTextContent('Orchestration incomplete')
      expect(detail).not.toHaveTextContent('Not orchestrated')
      expect(detail).not.toHaveTextContent('Not configured')
    })

    it('C: orchestrator unavailable when the provider is not in the list', async () => {
      const { user, detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: true, orchestrationProviderId: 'airflow-gone', airflowRunId: 'run-1' })
      expect(header(detail)).toHaveTextContent('Orchestrator unavailable')
      const orchestration = await openSection(user, detail, 'Orchestration')
      expect(orchestration).toHaveTextContent('Orchestrator unavailable')
      expect(detail).not.toHaveTextContent('Not configured')
    })

    it('D: no run ID yet when the provider exists without a run id', async () => {
      const { user, detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: true, orchestrationProviderId: 'airflow-01', airflowRunId: null })
      expect(header(detail)).toHaveTextContent('No run ID yet')
      const orchestration = await openSection(user, detail, 'Orchestration')
      expect(orchestration).toHaveTextContent('No run ID yet')
      expect(orchestration).toHaveTextContent('Dynamic Airflow')
      expect(within(orchestration).queryByRole('link')).not.toBeInTheDocument()
    })

    it('E3: no runs yet when the orchestrator has no run', async () => {
      const { user, detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: true, orchestrationProviderId: 'airflow-01', airflowRunId: 'run-1' })
      expect(header(detail)).toHaveTextContent('No runs yet')
      const orchestration = await openSection(user, detail, 'Orchestration')
      expect(orchestration).toHaveTextContent('No runs yet')
      expect(orchestration).toHaveTextContent('Dynamic Airflow')
      expect(within(orchestration).getByRole('link', { name: /run-1/ })).toBeInTheDocument()
      expect(within(orchestration).getByRole('button', { name: 'View recovery runs →' })).toBeInTheDocument()
    })

    it('E4: last run status, execution time, duration, orchestrator and run ID', async () => {
      vi.mocked(useLatestOrchestratorRun).mockReturnValue({
        latestRun: { runId: 'r1', status: 'success', startedAt: '2026-08-19T08:51:00Z', endedAt: '2026-08-19T08:51:07Z', durationSeconds: 7.45 },
        isLoading: false,
        error: null,
      })
      const { user, detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: true, orchestrationProviderId: 'airflow-01', airflowRunId: 'run-1' })
      expect(header(detail)).toHaveTextContent('Last run: success · 7s')
      const orchestration = await openSection(user, detail, 'Orchestration')
      const block = within(orchestration).getByRole('heading', { name: 'Latest run status' }).closest('section')
      expect(block).toHaveAttribute('data-tone', 'success')
      expect(orchestration).toHaveTextContent('success')
      expect(orchestration).toHaveTextContent(new Date('2026-08-19T08:51:00Z').toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }))
      expect(within(orchestration).getByText('Duration').nextElementSibling).toHaveTextContent('7s')
      expect(within(orchestration).getByText('Orchestrator').nextElementSibling).toHaveTextContent('Dynamic Airflow')
      expect(within(orchestration).getByRole('button', { name: 'Copy Airflow run ID' })).toBeInTheDocument()
    })

    it('E1: shows loading while the latest run loads (E2 is covered by the state unit test)', async () => {
      vi.mocked(useLatestOrchestratorRun).mockReturnValue({ latestRun: null, isLoading: true, error: null })
      const { user, detail } = await openDetail({ ...getDatabaseGroup(), pushToOrchestrator: true, orchestrationProviderId: 'airflow-01', airflowRunId: 'run-1' })
      expect(header(detail)).not.toHaveTextContent('No runs yet')
      expect(header(detail)).not.toHaveTextContent('Last run')
      expect(await openSection(user, detail, 'Orchestration')).toHaveTextContent('Loading...')
    })

    it('puts Delete in the left footer group and Edit on the right', async () => {
      const { detail } = await openDetail(getDatabaseGroup())
      const deleteButton = within(detail).getByRole('button', { name: 'Delete' })
      const editButton = within(detail).getByRole('button', { name: 'Edit' })
      const footer = deleteButton.closest('footer')

      expect(footer?.children[0]).toContainElement(deleteButton)
      expect(footer?.children[1]).toContainElement(editButton)
    })

    it('shows the resource provider unavailable badge in the header for unresolved groups', async () => {
      const { detail } = await openDetail({ ...getDatabaseGroup(), providerResolution: 'unresolved' })
      expect(within(header(detail)).getByText('Provider unavailable')).toBeInTheDocument()
      expect(within(detail).getByRole('button', { name: 'Edit' })).toHaveAccessibleDescription(
        'Editing is unavailable until the configured provider is restored.',
      )
    })

    it('switches to compact and back keeping the selected group and section', async () => {
      const { user, detail } = await openDetail(getDatabaseGroup())
      await openSection(user, detail, 'Orchestration')

      await user.click(within(detail).getByRole('button', { name: 'Compact view' }))
      expect(detail).toHaveAttribute('data-mode', 'compact')
      expect(within(detail).getByRole('heading', { level: 2, name: 'Database group' })).toBeInTheDocument()
      expect(navItem(detail, 'Orchestration')).toHaveAttribute('aria-current', 'true')

      await user.click(within(detail).getByRole('button', { name: 'Expand' }))
      expect(detail).toHaveAttribute('data-mode', 'expanded')
      expect(within(detail).getByRole('region', { name: 'Orchestration' })).toBeInTheDocument()
    })

    it('closes the detail from the close button and on Escape in compact mode', async () => {
      const { user, detail } = await openDetail(getDatabaseGroup())
      await user.click(within(detail).getByRole('button', { name: 'Compact view' }))
      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog', { name: 'Recovery group detail' })).not.toBeInTheDocument()

      await user.click(screen.getByText('Database group'))
      const reopened = await screen.findByRole('dialog', { name: 'Recovery group detail' })
      expect(reopened).toHaveAttribute('data-mode', 'expanded')
      await user.click(within(reopened).getByRole('button', { name: 'Close recovery group detail' }))
      expect(screen.queryByRole('dialog', { name: 'Recovery group detail' })).not.toBeInTheDocument()
    })

    it('opens the recovery group help from the header actions and closes only the help on Escape', async () => {
      const { user, detail } = await openDetail(getDatabaseGroup())
      const trigger = within(detail).getByRole('button', { name: 'Recovery group help' })

      expect(header(detail)).toContainElement(trigger)
      await user.click(trigger)
      const help = screen.getByRole('dialog', { name: 'How a recovery group works' })
      expect(help).toHaveTextContent('Local protection')
      expect(help).toHaveTextContent('Remote protection')
      expect(help).toHaveTextContent('Metro Mirror')
      expect(help).toHaveTextContent('Airflow')

      await user.keyboard('{Escape}')
      expect(screen.queryByRole('dialog', { name: 'How a recovery group works' })).not.toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'Recovery group detail' })).toBeInTheDocument()
      expect(trigger).toHaveFocus()

      await user.click(within(detail).getByRole('button', { name: 'Close recovery group detail' }))
      expect(screen.queryByRole('dialog', { name: 'Recovery group detail' })).not.toBeInTheDocument()
    })

    it('starts the next group on Overview in expanded mode', async () => {
      const user = userEvent.setup()
      renderTable(<RecoveryGroupsTable groups={groups} onEdit={vi.fn()} onDelete={vi.fn()} onRollback={vi.fn()} />)

      await user.click(screen.getByText('Database group'))
      let detail = await screen.findByRole('dialog', { name: 'Recovery group detail' })
      await user.click(navItem(detail, 'Technical'))
      await user.click(within(detail).getByRole('button', { name: 'Compact view' }))
      await user.click(within(detail).getByRole('button', { name: 'Close recovery group detail' }))

      await user.click(screen.getByText('Power group'))
      detail = await screen.findByRole('dialog', { name: 'Recovery group detail' })
      expect(detail).toHaveAttribute('data-mode', 'expanded')
      expect(navItem(detail, 'Overview')).toHaveAttribute('aria-current', 'true')
    })
  })
})
