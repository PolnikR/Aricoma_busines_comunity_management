import type { ReactElement } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { RecoveryApplicationsTable } from './RecoveryApplicationsTable'
import { useLatestOrchestratorRun } from '@/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun'
import type { RecoveryApplicationListItem } from '../model/recoveryApplicationTypes'

const navigate = vi.fn()

vi.mock('react-router', async (importOriginal) => ({
  ...await importOriginal<typeof import('react-router')>(),
  useNavigate: () => navigate,
}))
vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))
vi.mock('@/features/recovery-plans/recovery-runs/hooks/useLatestOrchestratorRun', () => ({
  useLatestOrchestratorRun: vi.fn(() => ({ latestRun: null, isLoading: false, error: null })),
}))
vi.mock('@/features/platform-administration/platform-providers/hooks/usePlatformProviders', () => ({
  usePlatformProviders: () => ({
    data: [{ id: 'airflow-01', name: 'Dynamic Airflow', url: 'https://airflow.dynamic.test:8443' }],
  }),
}))

function renderTable(ui: ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>)
}

const application: RecoveryApplicationListItem = {
  id: 'finance-app',
  policySetId: 'critical-daily-latest',
  airflowRunId: '260811133132_fbffbefb',
  pushToOrchestrator: true,
  orchestrationProviderId: 'airflow-01',
  data: {
    application: {
      name: 'Finance Recovery',
      description: 'Finance workloads',
      environment: 'prod',
      platform: 'VMware vCenter ESXi',
      source_connection: 'vcenter_default',
      target_connection: 'vcenter_default_destination',
      tiers: {
        database: {
          description: 'Database tier',
          order: 1,
          recovery_group: {
            id: 'database_group',
            name: 'database_group',
            description: 'Database recovery group',
            vms: [{ name: 'DB-01' }],
          },
        },
      },
    },
  },
  submission: { status: 'ok', remotePath: '/tmp/finance.json' },
}

const developmentApplication: RecoveryApplicationListItem = {
  id: 'development-app',
  data: {
    application: {
      name: 'Development Recovery',
      description: 'Development workloads',
      environment: 'dev',
      platform: 'IBM PowerVM',
      source_connection: 'vcenter_default',
      target_connection: 'vcenter_default_destination',
      tiers: {},
    },
  },
}

describe('RecoveryApplicationsTable', () => {
  it('shows nested backend detail in the localized retry state', () => {
    const error = new Error('Get recovery applications request failed with status 503', {
      cause: new OrvalApiError(503, 'Unavailable', { detail: 'The recovery applications service is unavailable.' }),
    })
    renderTable(
      <RecoveryApplicationsTable applications={[]} error={error} />,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Recovery applications could not be loaded')
    expect(alert).toHaveTextContent('The recovery applications service is unavailable.')
    expect(screen.getByRole('button', { name: /Retry/ })).toBeEnabled()
  })

  it('shows generated response contract diagnostics in the request error state', () => {
    renderTable(
      <RecoveryApplicationsTable
        applications={[]}
        error={new Error('GET /get_recovery_apps response does not match OpenAPI: applications: expected array')}
      />,
    )

    expect(screen.getByText(/applications: expected array/)).toBeInTheDocument()
  })

  it('keeps pagination available when cached applications remain after a refresh error', () => {
    renderTable(
      <RecoveryApplicationsTable
        applications={[application]}
        error={new Error('background refresh failed')}
      />,
    )

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByLabelText('Rows per page')).toBeInTheDocument()
  })

  it('opens backend application details and dispatches Edit without Delete', async () => {
    const user = userEvent.setup()
    const onEdit = vi.fn()
    renderTable(<RecoveryApplicationsTable applications={[application]} onEdit={onEdit} />)

    await user.click(screen.getByText('Finance Recovery'))
    const drawer = screen.getByRole('dialog', { name: 'Application detail' })
    expect(within(drawer).getByText('/tmp/finance.json')).toBeInTheDocument()
    expect(within(drawer).queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument()

    await user.click(within(drawer).getByRole('button', { name: 'Edit' }))
    expect(onEdit).toHaveBeenCalledWith('finance-app')
  })

  it('renders a clickable Airflow DAG ID without opening the row detail', async () => {
    const user = userEvent.setup()
    renderTable(<RecoveryApplicationsTable applications={[application, developmentApplication]} />)

    expect(screen.getByText('Airflow DAG ID')).toBeInTheDocument()
    const dagLink = screen.getByRole('link', { name: /dag_260811133132_fbffbefb/ })
    expect(dagLink).toHaveAttribute(
      'href',
      'https://airflow.dynamic.test:8443/dags/dag_260811133132_fbffbefb',
    )
    expect(dagLink).toHaveAttribute('target', '_blank')
    expect(dagLink).toHaveAttribute('rel', 'noopener noreferrer')

    await user.click(dagLink)
    expect(screen.queryByRole('dialog', { name: 'Application detail' })).not.toBeInTheDocument()
  })

  it('opens and closes the JSON viewer without selecting the row', async () => {
    const user = userEvent.setup()
    const applicationWithRawRecord = {
      ...application,
      rawRecord: {
        id: 'finance-app',
        policy_set_id: 'critical-daily-latest',
        application: {
          name: 'Finance Recovery from raw API',
          description: 'Finance workloads',
          environment: 'prod',
          platform: 'VMware vCenter ESXi',
          source_connection: 'vcenter_default',
          target_connection: 'vcenter_default_destination',
          tiers: {},
        },
        airflow_run_id: '260811133132_fbffbefb',
        push_to_orchestrator: true,
      },
    }
    renderTable(<RecoveryApplicationsTable applications={[applicationWithRawRecord]} />)

    await user.click(screen.getByRole('button', { name: 'View' }))
    const modal = screen.getByRole('dialog', { name: 'Application JSON' })
    expect(within(modal).getByText(/Finance Recovery from raw API/)).toBeInTheDocument()
    expect(within(modal).getByText(/"id": "finance-app"/)).toBeInTheDocument()
    expect(within(modal).getByText(/"policy_set_id": "critical-daily-latest"/)).toBeInTheDocument()
    expect(within(modal).getByText(/"airflow_run_id": "260811133132_fbffbefb"/)).toBeInTheDocument()
    expect(within(modal).getByText(/"push_to_orchestrator": true/)).toBeInTheDocument()

    await user.click(within(modal).getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Application JSON' })).not.toBeInTheDocument()
  })

  it('falls back to the mapped application when no raw GET record is available', async () => {
    const user = userEvent.setup()
    renderTable(<RecoveryApplicationsTable applications={[developmentApplication]} />)

    await user.click(screen.getByRole('button', { name: 'View' }))

    const modal = screen.getByRole('dialog', { name: 'Application JSON' })
    expect(modal).toHaveTextContent('"id": "development-app"')
    expect(modal).toHaveTextContent('"name": "Development Recovery"')
    expect(modal).not.toHaveTextContent('rawRecord')
  })

  it('filters applications by environment and platform and reports the active count', async () => {
    const user = userEvent.setup()
    renderTable(<RecoveryApplicationsTable applications={[application, developmentApplication]} />)

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const modal = screen.getByRole('dialog', { name: 'Filter recovery applications' })
    await user.selectOptions(within(modal).getByLabelText('Environment'), 'dev')
    await user.selectOptions(within(modal).getByLabelText('Platform'), 'IBM PowerVM')
    await user.click(within(modal).getByRole('button', { name: 'Apply' }))

    expect(screen.getByText('Development Recovery')).toBeInTheDocument()
    expect(screen.queryByText('Finance Recovery')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Filters 2/ })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Filters 2/ }))
    await user.click(screen.getByRole('button', { name: 'Clear all' }))

    expect(screen.getByText('Finance Recovery')).toBeInTheDocument()
    expect(screen.getByText('Development Recovery')).toBeInTheDocument()
  })

  it('does not apply pending filter changes when the modal is cancelled', async () => {
    const user = userEvent.setup()
    renderTable(<RecoveryApplicationsTable applications={[application, developmentApplication]} />)

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const modal = screen.getByRole('dialog', { name: 'Filter recovery applications' })
    await user.selectOptions(within(modal).getByLabelText('Environment'), 'prod')
    await user.click(within(modal).getByRole('button', { name: 'Cancel' }))

    expect(screen.getByText('Finance Recovery')).toBeInTheDocument()
    expect(screen.getByText('Development Recovery')).toBeInTheDocument()
  })

  it('shows orchestrator status and navigates to Recovery Runs when the app is orchestrated', async () => {
    vi.mocked(useLatestOrchestratorRun).mockReturnValue({
      latestRun: { runId: 'r1', status: 'success', startedAt: '2026-08-19T08:51:00Z', endedAt: '2026-08-19T08:51:07Z', durationSeconds: 7.45 },
      isLoading: false,
      error: null,
    })
    const user = userEvent.setup()
    renderTable(<RecoveryApplicationsTable applications={[application]} />)

    await user.click(screen.getByText('Finance Recovery'))
    const drawer = screen.getByRole('dialog', { name: 'Application detail' })
    await user.click(within(drawer).getByRole('tab', { name: 'Orchestration' }))

    expect(within(drawer).getByRole('link', { name: /dag_260811133132_fbffbefb/ })).toHaveAttribute(
      'href',
      'https://airflow.dynamic.test:8443/dags/dag_260811133132_fbffbefb',
    )
    expect(within(drawer).getByText('success')).toBeInTheDocument()

    await user.click(within(drawer).getByRole('button', { name: 'View recovery runs →' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-runs?tab=applications&entityType=application&entityId=finance-app')
  })

  it('shows no orchestrator status when the app was never pushed to orchestration', async () => {
    const user = userEvent.setup()
    renderTable(<RecoveryApplicationsTable applications={[developmentApplication]} />)

    await user.click(screen.getByText('Development Recovery'))
    const drawer = screen.getByRole('dialog', { name: 'Application detail' })
    await user.click(within(drawer).getByRole('tab', { name: 'Orchestration' }))

    expect(within(drawer).queryByText('Airflow DAG ID')).not.toBeInTheDocument()
    expect(within(drawer).queryByRole('button', { name: 'View recovery runs →' })).not.toBeInTheDocument()
  })
})
