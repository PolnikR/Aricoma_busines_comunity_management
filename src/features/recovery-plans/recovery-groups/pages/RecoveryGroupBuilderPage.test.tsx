import { render, screen, within, waitFor } from '@testing-library/react'
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

vi.mock('@/generated/query/platform-providers/platform-providers.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/platform-providers/platform-providers.gen')>(),
  useGetPlatformProviders: () => ({
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
    onDirtyChange,
    onCancel,
    isInitialLoading,
  }: {
    onCreate: (draft: RecoveryGroupDraft) => void
    isInitialLoading?: boolean
    onDirtyChange?: (dirty: boolean) => void
    onCancel: () => void
  }) => (
    <fieldset disabled={isInitialLoading} aria-busy={isInitialLoading}>
      <button type="button" onClick={() => { onDirtyChange?.(true) }}>Edit draft</button>
      <button type="button" onClick={onCancel}>Cancel builder</button>
      <span>Group type</span>
      <button type="button" onClick={() => { onCreate(buildDraft(true)) }}>
        Create with orchestration
      </button>
      <button type="button" onClick={() => { onCreate(buildDraft(false)) }}>
        Create without orchestration
      </button>
      <button type="button" onClick={() => { onCreate({
        ...buildDraft(false),
        topology: 'metro_mirror',
        metroMirrorMode: 'existing',
        consistencyGroupId: 'CG-7',
        relatedVolumeProviderId: 'ibm-flashsystem-01',
        relatedVolumes: ['VOL-01'],
        auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' },
      }) }}>
        Create Metro group
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
  it('keeps the dirty guard after failed save and clears it after successful save', async () => {
    const user = userEvent.setup()
    create.mockRejectedValue(new Error('Save failed'))
    render(<RecoveryGroupBuilderPage />)
    await user.click(screen.getByRole('button', { name: 'Edit draft' }))
    const beforeSave = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(beforeSave)
    expect(beforeSave.defaultPrevented).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Cancel builder' }))
    const dialog = screen.getByRole('dialog', { name: 'Discard unsaved changes?' })
    expect(navigate).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Create without orchestration' }))
    await screen.findByRole('alert')
    const afterFailure = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(afterFailure)
    expect(afterFailure.defaultPrevented).toBe(true)
    expect(navigate).not.toHaveBeenCalled()
    create.mockResolvedValue({ orchestratorPush: null })
    await user.click(screen.getByRole('button', { name: 'Create without orchestration' }))
    await waitFor(() => { expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-groups') })
    const afterSave = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(afterSave)
    expect(afterSave.defaultPrevented).toBe(false)
  })

  it.each([null, { status: 'skipped', reason: 'Provider disabled', dag: null, dag_id: null, json: null }])('shows a nullable or skipped push result without inventing a DAG (%j)', async push => {
    const user = userEvent.setup()
    create.mockResolvedValue({ airflowRunId: 'legacy_wrong_id', orchestratorPush: push })
    render(<RecoveryGroupBuilderPage />)
    await user.click(screen.getByRole('button', { name: 'Create with orchestration' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(push ? 'Orchestrator push skipped' : 'The API did not return an orchestrator push result.')
    expect(screen.queryByRole('button', { name: 'View in Airflow' })).not.toBeInTheDocument()
    expect(screen.queryByText('legacy_wrong_id')).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-groups')
  })

  it('forwards the Metro draft and keeps the builder open after a failed create', async () => {
    const user = userEvent.setup()
    create.mockRejectedValue(new RecoveryGroupsError('invalid_draft', 'Metro group rejected'))
    render(<RecoveryGroupBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Create Metro group' }))

    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      topology: 'metro_mirror',
      metroMirrorMode: 'existing',
      consistencyGroupId: 'CG-7',
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['VOL-01'],
      auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' },
    }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Complete all required recovery group fields.')
    expect(screen.getByRole('button', { name: 'Create Metro group' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

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
    create.mockResolvedValue({ airflowRunId: 'legacy_wrong_id', orchestratorPush: { status: 'pushed', dag_id: 'dag_260806091844_d023a7ef', dag: '/airflow/group.py', json: '/airflow/group.json' } })
    render(<RecoveryGroupBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Create with orchestration' }))

    expect(await screen.findByText('dag_260806091844_d023a7ef')).toBeInTheDocument()
    expect(screen.getByRole('list')).toHaveTextContent('/airflow/group.py')
    expect(screen.getByText('OrchestratorPush')).toBeInTheDocument()
    expect(screen.getByText('2 / 2 passed')).toBeInTheDocument()
    expect(screen.queryByText('Queued')).not.toBeInTheDocument()
    expect(screen.queryByText('legacy_wrong_id')).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'View in Airflow' }))
    expect(openWindow).toHaveBeenCalledWith(
      `${airflowProviderUrl}/dags/dag_260806091844_d023a7ef`,
      '_blank',
      'noopener,noreferrer',
    )
    openWindow.mockRestore()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-groups')
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

    expect(screen.getByRole('heading', { name: 'Create recovery group', level: 1 })).toBeInTheDocument()
    expect(screen.getByText('Group type')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create without orchestration' })).toBeDisabled()
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: 'Loading recovery groups' })).not.toBeInTheDocument()
  })
})
