import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EXTERNAL_SERVICES } from '@/config/externalServices'
import { RecoveryGroupBuilderPage } from './RecoveryGroupBuilderPage'
import type { RecoveryGroupDraft } from '../model/recoveryGroupTypes'

const navigate = vi.fn()
const create = vi.fn()

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
      { id: 'airflow-01', name: 'Primary Airflow', url: EXTERNAL_SERVICES.airflow.dagsUrl },
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
    create.mockResolvedValue({ airflowRunId: '260806091844_d023a7ef' })
    render(<RecoveryGroupBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Create with orchestration' }))

    expect(await screen.findByText('260806091844_d023a7ef')).toBeInTheDocument()
    expect(screen.getByText('Primary Airflow')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
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
