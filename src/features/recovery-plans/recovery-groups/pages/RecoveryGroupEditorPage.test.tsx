import { render, screen, within, waitFor } from '@testing-library/react'
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

vi.mock('@/generated/query/platform-providers/platform-providers.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/platform-providers/platform-providers.gen')>(),
  useGetPlatformProviders: () => ({
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
    onDirtyChange,
    onCancel,
    isInitialLoading,
  }: {
    initialData?: RecoveryGroup
    submitLabel: string
    onCreate: (draft: RecoveryGroupDraft) => void
    isInitialLoading?: boolean
    onDirtyChange?: (dirty: boolean) => void
    onCancel: () => void
  }) => (
    <fieldset disabled={isInitialLoading} aria-busy={isInitialLoading}>
      <button type="button" onClick={() => { onDirtyChange?.(true) }}>Edit draft</button>
      <button type="button" onClick={onCancel}>Cancel builder</button>
      <span>Group details</span>
      <span>{initialData?.name}</span>
      <output data-testid="initial-group">{JSON.stringify(initialData)}</output>
      <span>{submitLabel}</span>
      <button type="button" onClick={() => { onCreate(buildUpdateDraft(false)) }}>
        Submit edit
      </button>
      <button type="button" onClick={() => { onCreate(buildUpdateDraft(true)) }}>
        Submit edit with orchestration
      </button>
      <button type="button" onClick={() => { onCreate({
        ...buildUpdateDraft(false),
        topology: 'metro_mirror',
        metroMirrorMode: 'existing',
        consistencyGroupId: 'CG-7',
        relatedVolumeProviderId: 'ibm-flashsystem-01',
        relatedVolumes: ['VOL-01'],
        auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' },
      }) }}>
        Submit Metro edit
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

  it('keeps the dirty guard after failed save and clears it after successful save', async () => {
    const user = userEvent.setup()
    update.mockRejectedValue(new Error('Save failed'))
    render(<RecoveryGroupEditorPage />)
    await user.click(screen.getByRole('button', { name: 'Edit draft' }))
    const beforeSave = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(beforeSave)
    expect(beforeSave.defaultPrevented).toBe(true)
    await user.click(screen.getByRole('button', { name: 'Cancel builder' }))
    const dialog = screen.getByRole('dialog', { name: 'Discard unsaved changes?' })
    expect(navigate).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await user.click(screen.getByRole('button', { name: 'Submit edit' }))
    await screen.findByRole('alert')
    const afterFailure = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(afterFailure)
    expect(afterFailure.defaultPrevented).toBe(true)
    expect(navigate).not.toHaveBeenCalled()
    update.mockResolvedValue({ orchestratorPush: null })
    await user.click(screen.getByRole('button', { name: 'Submit edit' }))
    await waitFor(() => { expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-groups') })
    const afterSave = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(afterSave)
    expect(afterSave.defaultPrevented).toBe(false)
  })

  it.each([null, { status: 'skipped', reason: 'Provider disabled', dag: null, dag_id: null, json: null }])('shows a nullable or skipped push result without inventing a DAG (%j)', async push => {
    const user = userEvent.setup()
    update.mockResolvedValue({ airflowRunId: 'legacy_wrong_id', orchestratorPush: push })
    render(<RecoveryGroupEditorPage />)
    await user.click(screen.getByRole('button', { name: 'Submit edit with orchestration' }))
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(push ? 'Orchestrator push skipped' : 'The API did not return an orchestrator push result.')
    expect(screen.queryByRole('button', { name: 'View in Airflow' })).not.toBeInTheDocument()
    expect(screen.queryByText('legacy_wrong_id')).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-groups')
  })

  it('prefills Metro fields and keeps the editor open after a failed update', async () => {
    const user = userEvent.setup()
    recoveryGroupsState.groups = [{
      ...group,
      topology: 'metro_mirror',
      metroMirrorMode: 'existing',
      consistencyGroupId: 'CG-7',
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['VOL-01'],
      auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' },
    }]
    update.mockRejectedValue(new RecoveryGroupsError('invalid_draft', 'Metro group rejected'))
    render(<RecoveryGroupEditorPage />)

    expect(JSON.parse(screen.getByTestId('initial-group').textContent)).toEqual(expect.objectContaining({
      topology: 'metro_mirror',
      metroMirrorMode: 'existing',
      consistencyGroupId: 'CG-7',
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['VOL-01'],
      auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' },
    }))

    await user.click(screen.getByRole('button', { name: 'Submit Metro edit' }))

    expect(update).toHaveBeenCalledWith('database_group', expect.objectContaining({
      topology: 'metro_mirror',
      metroMirrorMode: 'existing',
      consistencyGroupId: 'CG-7',
      relatedVolumeProviderId: 'ibm-flashsystem-01',
      relatedVolumes: ['VOL-01'],
      auxiliaryNamesByVolume: { 'VOL-01': 'AUX-01' },
    }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Complete all required recovery group fields.')
    expect(screen.getByRole('button', { name: 'Submit Metro edit' })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('gives the builder a constrained body region for nested resource scrolling', () => {
    const { container } = render(<RecoveryGroupEditorPage />)

    expect(container.querySelector('fieldset')?.parentElement).toHaveClass(
      'flex',
      'flex-1',
      'flex-col',
      'lg:min-h-0',
    )
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
    update.mockResolvedValue({ airflowRunId: 'legacy_wrong_id', orchestratorPush: { status: 'pushed', dag_id: 'dag_260806091844_d023a7ef', dag: '/airflow/group.py', json: '/airflow/group.json' } })
    render(<RecoveryGroupEditorPage />)

    await user.click(screen.getByRole('button', { name: 'Submit edit with orchestration' }))

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

    expect(screen.getByText('Edit recovery group')).toBeInTheDocument()
    expect(screen.getByText('Group details')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Submit edit' })).toBeDisabled()
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(screen.queryByText('Loading recovery groups...')).not.toBeInTheDocument()
  })
})
