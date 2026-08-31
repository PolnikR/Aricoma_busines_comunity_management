import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryGroupBuilderPage } from './RecoveryGroupBuilderPage'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { RecoveryGroupsError } from '../api/recoveryGroupsErrors'
import { OrvalApiError } from '@/shared/api/orvalMutator'

const navigate = vi.fn()
const create = vi.fn()
const airflowProviderUrl = 'https://airflow.dynamic.test:8443'
const recoveryGroupsState = {
  groups: [],
  isLoading: false,
  error: null as unknown,
  refresh: vi.fn(),
  create,
  isCreating: false,
}

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    useBlocker: () => ({ state: 'unblocked' as const }),
  }
})

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

vi.mock('../hooks/useRecoveryGroups', () => ({
  useRecoveryGroups: () => recoveryGroupsState,
}))

vi.mock('@/features/platform-administration/platform-providers/hooks/usePlatformProviders', () => ({
  usePlatformProviders: () => ({
    data: [
      { id: 'airflow-01', name: 'Primary Airflow', url: airflowProviderUrl },
    ],
  }),
}))

function buildDraft(pushToOrchestrator: boolean): RecoveryGroupDraft {
  return {
    id: 'test_group',
    name: 'test',
    description: 'test',
    sourceCategory: 'backup_system_workload',
    workloadType: 'vmware_virtual_machines',
    resourceType: 'vm',
    providerId: 'vmware-vcenter-01',
    policySetId: 'tier2-apps',
    resources: ['cloud-c007-gw'],
    orchestrationProviderId: 'airflow-01',
    pushToOrchestrator,
  }
}

vi.mock('../components/RecoveryGroupBuilder', () => ({
  RecoveryGroupBuilder: ({
    onCreate,
    isInitialLoading,
  }: {
    onCreate: (draft: RecoveryGroupDraft) => void
    isInitialLoading?: boolean
  }) => (
    <fieldset disabled={isInitialLoading} aria-busy={isInitialLoading}>
      <span>Group type</span>
      <button type="button" onClick={() => { onCreate(buildDraft(true)) }}>
        Create with orchestration
      </button>
      <button type="button" onClick={() => { onCreate(buildDraft(false)) }}>
        Create without orchestration
      </button>
    </fieldset>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  recoveryGroupsState.error = null
  recoveryGroupsState.isLoading = false
})

describe('RecoveryGroupBuilderPage', () => {
  it('gives the builder a constrained body region for nested resource scrolling', () => {
    const { container } = render(<RecoveryGroupBuilderPage />)

    expect(container.querySelector('fieldset')?.parentElement).toHaveClass(
      'flex',
      'flex-1',
      'flex-col',
      'lg:min-h-0',
    )
  })

  it('shows the success modal with the airflow run id when pushed to the orchestrator', async () => {
    const user = userEvent.setup()
    const openWindow = vi.spyOn(window, 'open').mockImplementation(() => null)
    create.mockResolvedValue({ airflowRunId: '260806091844_d023a7ef' })
    render(<RecoveryGroupBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Create with orchestration' }))

    expect(await screen.findByText('260806091844_d023a7ef')).toBeInTheDocument()
    expect(screen.getByText('Primary Airflow')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'View in Airflow' }))
    expect(openWindow).toHaveBeenCalledWith(
      `${airflowProviderUrl}/dags/dag_260806091844_d023a7ef`,
      '_blank',
      'noopener,noreferrer',
    )
    openWindow.mockRestore()
  })

  it('does not offer an exact DAG link when the API omits the airflow run id', async () => {
    const user = userEvent.setup()
    create.mockResolvedValue({ airflowRunId: null })
    render(<RecoveryGroupBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Create with orchestration' }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View in Airflow' })).not.toBeInTheDocument()
  })

  it('navigates back immediately without a modal when not pushed to the orchestrator', async () => {
    const user = userEvent.setup()
    create.mockResolvedValue({ airflowRunId: null })
    render(<RecoveryGroupBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Create without orchestration' }))

    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-groups')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows nested backend detail when creating a recovery group fails', async () => {
    const user = userEvent.setup()
    create.mockRejectedValue(new Error('Submit recovery group request failed', {
      cause: new OrvalApiError(409, 'Conflict', { detail: 'A recovery group with this name already exists.' }),
    }))
    render(<RecoveryGroupBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Create without orchestration' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('A recovery group with this name already exists.')
  })

  it('keeps the localized domain error mapping when creating a recovery group fails validation', async () => {
    const user = userEvent.setup()
    create.mockRejectedValue(new RecoveryGroupsError('invalid_draft', 'internal validation detail'))
    render(<RecoveryGroupBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Create without orchestration' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Complete all required recovery group fields.')
    expect(alert).not.toHaveTextContent('internal validation detail')
  })

  it('shows backend detail in the builder load retry state', () => {
    recoveryGroupsState.error = new Error('Get recovery groups request failed', {
      cause: new OrvalApiError(503, 'Unavailable', { detail: 'The recovery groups service is unavailable.' }),
    })
    render(<RecoveryGroupBuilderPage />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Recovery groups could not be loaded')
    expect(alert).toHaveTextContent('The recovery groups service is unavailable.')
  })

  it('keeps the builder labels mounted and actions disabled while existing ids load', () => {
    recoveryGroupsState.isLoading = true

    const { container } = render(<RecoveryGroupBuilderPage />)

    expect(screen.getByText('Create Recovery Group')).toBeInTheDocument()
    expect(screen.getByText('Group type')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create without orchestration' })).toBeDisabled()
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading recovery groups' })).not.toBeInTheDocument()
  })
})
