import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RecoveryGroupBuilderPage } from './RecoveryGroupBuilderPage'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'

const navigate = vi.fn()
const create = vi.fn()
const airflowProviderUrl = 'https://airflow.dynamic.test:8443'

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
  useRecoveryGroups: () => ({
    groups: [],
    isLoading: false,
    error: null,
    refresh: vi.fn(),
    create,
    isCreating: false,
  }),
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
  }: {
    onCreate: (draft: RecoveryGroupDraft) => void
  }) => (
    <>
      <button type="button" onClick={() => { onCreate(buildDraft(true)) }}>
        Create with orchestration
      </button>
      <button type="button" onClick={() => { onCreate(buildDraft(false)) }}>
        Create without orchestration
      </button>
    </>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('RecoveryGroupBuilderPage', () => {
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
})
