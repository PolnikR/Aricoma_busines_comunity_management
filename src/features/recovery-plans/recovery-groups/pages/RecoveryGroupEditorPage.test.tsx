import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RecoveryGroup, RecoveryGroupDraft } from '../model/recoveryGroupTypes'
import { RecoveryGroupEditorPage } from './RecoveryGroupEditorPage'
import { RecoveryGroupsError } from '../api/recoveryGroupsErrors'
import { OrvalApiError } from '@/shared/api/orvalMutator'

const navigate = vi.fn()
const update = vi.fn()
const airflowProviderUrl = 'https://airflow.dynamic.test:8443'
const group: RecoveryGroup = {
  id: 'database_group',
  name: 'Database group',
  description: 'Production databases',
  sourceCategory: 'backup_system_workload',
  workloadType: 'vmware_virtual_machines',
  resourceType: 'vm',
  providerId: 'vmware-vcenter-01',
  policySetId: 'tier2-apps',
  resources: ['DB-01'],
  relatedVolumeProviderId: null,
  relatedVolumes: [],
  resourceCount: 1,
  status: 'Active',
}
const recoveryGroupsState = {
  groups: [group],
  update,
  isLoading: false,
  isUpdating: false,
  error: null as unknown,
  refresh: vi.fn(),
}

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ id: 'database_group' }),
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

function buildUpdateDraft(pushToOrchestrator: boolean): RecoveryGroupDraft {
  return {
    id: group.id,
    name: 'Updated group',
    description: group.description,
    sourceCategory: group.sourceCategory,
    workloadType: group.workloadType,
    resourceType: group.resourceType,
    providerId: group.providerId,
    policySetId: group.policySetId,
    resources: group.resources,
    orchestrationProviderId: 'airflow-01',
    pushToOrchestrator,
  }
}

vi.mock('../components/RecoveryGroupBuilder', () => ({
  RecoveryGroupBuilder: ({
    initialData,
    submitLabel,
    onCreate,
    isInitialLoading,
  }: {
    initialData?: RecoveryGroup
    submitLabel: string
    onCreate: (draft: RecoveryGroupDraft) => void
    isInitialLoading?: boolean
  }) => (
    <fieldset disabled={isInitialLoading} aria-busy={isInitialLoading}>
      <span>Group details</span>
      <span>{initialData?.name}</span>
      <span>{submitLabel}</span>
      <button type="button" onClick={() => { onCreate(buildUpdateDraft(false)) }}>
        Submit edit
      </button>
      <button type="button" onClick={() => { onCreate(buildUpdateDraft(true)) }}>
        Submit edit with orchestration
      </button>
    </fieldset>
  ),
}))

describe('RecoveryGroupEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    recoveryGroupsState.groups = [group]
    recoveryGroupsState.error = null
    recoveryGroupsState.isLoading = false
  })

  it('prefills the builder and updates the existing recovery group', async () => {
    const user = userEvent.setup()
    update.mockResolvedValue({ airflowRunId: null })
    render(<RecoveryGroupEditorPage />)

    expect(screen.getByText('Database group')).toBeInTheDocument()
    expect(screen.getByText('Save Recovery Group')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Submit edit' }))

    expect(update).toHaveBeenCalledWith(
      'database_group',
      expect.objectContaining({ name: 'Updated group' }),
    )
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-groups')
  })

  it('shows the orchestrator success modal instead of navigating when pushed to the orchestrator', async () => {
    const user = userEvent.setup()
    const openWindow = vi.spyOn(window, 'open').mockImplementation(() => null)
    update.mockResolvedValue({ airflowRunId: '260806091844_d023a7ef' })
    render(<RecoveryGroupEditorPage />)

    await user.click(screen.getByRole('button', { name: 'Submit edit with orchestration' }))

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

  it('shows nested backend detail when updating a recovery group fails', async () => {
    const user = userEvent.setup()
    update.mockRejectedValue(new Error('Submit recovery group request failed', {
      cause: new OrvalApiError(409, 'Conflict', { detail: 'The recovery group is locked by an active run.' }),
    }))
    render(<RecoveryGroupEditorPage />)

    await user.click(screen.getByRole('button', { name: 'Submit edit' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The recovery group is locked by an active run.')
  })

  it('keeps the localized domain error mapping when updating a recovery group fails validation', async () => {
    const user = userEvent.setup()
    update.mockRejectedValue(new RecoveryGroupsError('duplicate_id', 'internal validation detail'))
    render(<RecoveryGroupEditorPage />)

    await user.click(screen.getByRole('button', { name: 'Submit edit' }))

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('A recovery group with this ID already exists.')
    expect(alert).not.toHaveTextContent('internal validation detail')
  })

  it('shows backend detail in the editor load retry state', () => {
    recoveryGroupsState.error = new Error('Get recovery groups request failed', {
      cause: new OrvalApiError(503, 'Unavailable', { detail: 'The recovery groups service is unavailable.' }),
    })
    render(<RecoveryGroupEditorPage />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Recovery groups could not be loaded')
    expect(alert).toHaveTextContent('The recovery groups service is unavailable.')
  })

  it('keeps the editor shell mounted and disabled while the group loads', () => {
    recoveryGroupsState.isLoading = true
    recoveryGroupsState.groups = []

    const { container } = render(<RecoveryGroupEditorPage />)

    expect(screen.getByText('Edit Recovery Group')).toBeInTheDocument()
    expect(screen.getByText('Group details')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit edit' })).toBeDisabled()
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.queryByText('Loading recovery groups...')).not.toBeInTheDocument()
  })
})
