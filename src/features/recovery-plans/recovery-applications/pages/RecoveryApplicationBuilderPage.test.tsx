import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { RecoveryApplicationBuilderPage } from './RecoveryApplicationBuilderPage'
import type {
  RecoveryApplicationFormState,
  SubmitDagResponse,
  SubmitRecoveryApplicationInput,
} from '../model/recoveryApplicationTypes'

const navigate = vi.fn()
const mutate = vi.fn()
const submitMutation = {
  mutate,
  error: null as Error | null,
  isPending: false,
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

vi.mock('../hooks/useRecoveryApplications', () => ({
  useSubmitRecoveryApplication: () => submitMutation,
}))

vi.mock('@/generated/query/platform-providers/platform-providers.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/platform-providers/platform-providers.gen')>(),
  useGetPlatformProviders: () => ({
    data: [{ id: 'airflow-01', name: 'Dynamic Airflow', url: 'https://airflow.dynamic.test:8443' }],
  }),
}))

vi.mock('@/generated/query/providers/providers.gen', async (importOriginal) => ({
  ...await importOriginal<typeof import('@/generated/query/providers/providers.gen')>(),
  useGetProviders: () => ({
    data: [
      { id: 'vmware-vcenter-01', name: 'VMware Source', type: 'VMWARE', role: 'source', credentialStatus: 'ok' },
      { id: 'ibm-power-01', name: 'IBM Power Source', type: 'IBM_POWER', role: 'source', credentialStatus: 'ok' },
      { id: 'vmware-vcenter-02', name: 'VMware Target', type: 'VMWARE', role: 'target', credentialStatus: 'ok' },
      { id: 'ibm-power-02', name: 'IBM Power Target', type: 'IBM_POWER', role: 'target', credentialStatus: 'ok' },
    ],
  }),
}))

vi.mock('../components/RecoveryAppBuilder', () => ({
  RecoveryAppBuilder: ({
    onSave,
    onDirtyChange,
  }: {
    onSave?: (state: RecoveryApplicationFormState) => void
    onDirtyChange?: (isDirty: boolean) => void
  }) => (
    <>
      <button
        type="button"
        onClick={() => {
          onSave?.({
            fileName: 'finance_recovery',
            policySetId: 'test_1_hour_ps',
            pushToOrchestrator: false,
            name: 'Finance',
            description: 'Finance recovery',
            environment: 'prod',
            platform: 'vmware-vcenter-01',
            orchestrationProviderId: 'airflow-01',
            targetProviderId: 'vmware-vcenter-02',
            notificationEmail: null,
            tiers: new Map(),
          })
        }}
      >
        Save fixture
      </button>
      <button
        type="button"
        onClick={() => {
          onSave?.({
            fileName: 'finance_recovery',
            policySetId: 'test_1_hour_ps',
            pushToOrchestrator: true,
            name: 'Finance',
            description: 'Finance recovery',
            environment: 'prod',
            platform: 'vmware-vcenter-01',
            orchestrationProviderId: 'airflow-01',
            targetProviderId: 'vmware-vcenter-02',
            notificationEmail: null,
            tiers: new Map(),
          })
        }}
      >
        Save orchestrated fixture
      </button>
      <button
        type="button"
        onClick={() => {
          onSave?.({
            fileName: 'power_recovery',
            policySetId: 'test_1_hour_ps',
            pushToOrchestrator: false,
            name: 'Power',
            description: 'Power recovery',
            environment: 'prod',
            platform: 'ibm-power-01',
            orchestrationProviderId: 'airflow-01',
            targetProviderId: 'ibm-power-02',
            notificationEmail: null,
            tiers: new Map(),
          })
        }}
      >
        Save Power fixture
      </button>
      <button type="button" onClick={() => { onDirtyChange?.(true) }}>
        Change builder
      </button>
    </>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  submitMutation.error = null
})

describe('RecoveryApplicationBuilderPage', () => {
  it.each([false, true])('clears dirty state after a locked successful save (push=%s)', async push => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)
    await user.click(screen.getByRole('button', { name: 'Change builder' }))
    await user.click(screen.getByRole('button', { name: push ? 'Save orchestrated fixture' : 'Save fixture' }))
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    const before = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(before)
    expect(before.defaultPrevented).toBe(true)
    const options = mutate.mock.calls[0]?.[1] as { onSuccess: (response: SubmitDagResponse) => void }
    act(() => { options.onSuccess({ applications: [], ...(push ? { orchestrator_push: null } : {}) }) })
    const after = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(after)
    expect(after.defaultPrevented).toBe(false)
    if (push) {
      expect(navigate).not.toHaveBeenCalled()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Close' }))
    }
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
  })

  it.each([false, true])('resolves stale discard when Save starts and completes (push=%s)', async push => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)
    await user.click(screen.getByRole('button', { name: 'Change builder' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: push ? 'Save orchestrated fixture' : 'Save fixture' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const options = mutate.mock.calls[0]?.[1] as { onSuccess: (response: SubmitDagResponse) => void }
    act(() => { options.onSuccess({ applications: [], ...(push ? { orchestrator_push: null } : {}) }) })
    expect(screen.queryByRole('dialog', { name: 'Discard unsaved changes?' })).not.toBeInTheDocument()
    if (push) {
      expect(navigate).not.toHaveBeenCalled()
      await user.click(screen.getByRole('button', { name: 'Close' }))
    }
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
    expect(navigate).toHaveBeenCalledOnce()
  })

  it('rejects duplicate submissions and restores normal dirty Back after failure', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)
    await user.click(screen.getByRole('button', { name: 'Change builder' }))
    await user.click(screen.getByRole('button', { name: 'Save fixture' }))
    await user.click(screen.getByRole('button', { name: 'Save fixture' }))
    expect(mutate).toHaveBeenCalledOnce()
    const options = mutate.mock.calls[0]?.[1] as { onError: () => void }
    act(() => { options.onError() })
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('preserves local fallback when a callback bypasses push normalization', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)
    await user.click(screen.getByRole('button', { name: 'Save orchestrated fixture' }))
    const options = mutate.mock.calls[0]?.[1] as { onSuccess: (response: SubmitDagResponse) => void }
    act(() => { options.onSuccess({ applications: [] }) })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
  })

  it('passes manual-only schedule and notes from the create response to the shared push dialog', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)
    await user.click(screen.getByRole('button', { name: 'Save orchestrated fixture' }))
    const call = mutate.mock.calls[0]
    if (!call) throw new Error('Expected submit mutation')
    const options = call[1] as { onSuccess: (response: SubmitDagResponse) => void }
    options.onSuccess({ applications: [], orchestrator_push: {
      status: 'pushed', dag_id: 'dag_manual_finance', schedule: 'manual_only', notes: ['Create backend note'],
    } })
    const info = await screen.findByRole('region', { name: 'Manual execution in Airflow' })
    expect(info).toHaveTextContent('The DAG was successfully pushed, but has not started yet.')
    expect(info).toHaveTextContent('first select Unpause, then Trigger')
    expect(info).toHaveTextContent('Create backend note')
    expect(navigate).not.toHaveBeenCalled()
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    await user.click(screen.getByRole('button', { name: 'View in Airflow' }))
    expect(openSpy).toHaveBeenCalledWith('https://airflow.dynamic.test:8443/dags/dag_manual_finance', '_blank', 'noopener,noreferrer')
    openSpy.mockRestore()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
  })

  it.each([null, { status: 'skipped', reason: 'Provider disabled', dag: null, json: null, dag_id: null }] as const)('shows a nullable or skipped push result and closes to the list (%j)', async push => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)
    await user.click(screen.getByRole('button', { name: 'Save orchestrated fixture' }))
    const call = mutate.mock.calls[0]
    if (!call) throw new Error('Expected submit mutation')
    const options = call[1] as { onSuccess: (response: SubmitDagResponse) => void }
    options.onSuccess({ applications: [], orchestrator_push: push })
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(push ? 'Orchestrator push skipped' : 'The API did not return an orchestrator push result.')
    expect(screen.queryByRole('button', { name: 'View in Airflow' })).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
  })

  it('keeps the builder in a constrained body region for nested resource scrolling', () => {
    render(<RecoveryApplicationBuilderPage />)

    expect(screen.getByRole('button', { name: 'Save fixture' }).parentElement).toHaveClass(
      'flex',
      'flex-1',
      'flex-col',
      'lg:min-h-0',
    )
  })

  it('keeps the localized submit title and shows nested backend detail', () => {
    submitMutation.error = new Error('Submit recovery application request failed with status 409', {
      cause: new OrvalApiError(409, 'Conflict', { detail: 'An application with this ID already exists.' }),
    })
    render(<RecoveryApplicationBuilderPage />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Failed to submit recovery application.')
    expect(alert).toHaveTextContent('An application with this ID already exists.')
    expect(alert).not.toHaveTextContent('status 409')
  })

  it('submits the selected platform provider ID', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Save fixture' }))

    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({ providerId: 'airflow-01' }),
      expect.any(Object),
    )
  })

  it.each([
    ['Save Power fixture', 'IBM_POWER', 'ibm-power-01', 'ibm-power-02'],
    ['Save fixture', 'VMWARE', 'vmware-vcenter-01', 'vmware-vcenter-02'],
  ])('%s sends the provider type as platform and the source and target provider ids', async (button, platform, providerId, targetProviderId) => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)

    await user.click(screen.getByRole('button', { name: button }))

    const [submission] = mutate.mock.calls[0] as [SubmitRecoveryApplicationInput]
    expect(submission.providerId).toBe('airflow-01')
    expect(submission.data.application).toMatchObject({ platform, source_provider_id: providerId, target_provider_id: targetProviderId })
    expect(submission.data.application.notificationEmail).toBeNull()
    expect(submission.data.application).not.toHaveProperty('source_connection')
    expect(submission.data.application).not.toHaveProperty('target_connection')
  })

  it('returns to the list after a local-only submit response', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Save fixture' }))
    const call = mutate.mock.calls[0]
    expect(call).toBeDefined()
    if (!call) throw new Error('Expected submit mutation to be called')

    const options = call[1] as { onSuccess: (response: SubmitDagResponse) => void }
    options.onSuccess({ applications: [] })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
  })

  it('shows orchestrator details and waits for close after an orchestrated submit', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Save orchestrated fixture' }))
    const call = mutate.mock.calls[0]
    expect(call).toBeDefined()
    if (!call) throw new Error('Expected submit mutation to be called')

    const options = call[1] as { onSuccess: (response: SubmitDagResponse) => void }
    options.onSuccess({
      applications: [],
      orchestrator_push: {
        status: 'pushed',
        dag: '/home/airflow/dags/finance.py',
        json: '/home/airflow/dags/finance.json',
        dag_id: 'dag_finance',
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(screen.getAllByText(/\/home\/airflow\/dags\/finance\.py/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/dag_finance/).length).toBeGreaterThan(0)
    expect(navigate).not.toHaveBeenCalled()

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    await user.click(screen.getByRole('button', { name: 'View in Airflow' }))
    expect(openSpy).toHaveBeenCalledWith(
      'https://airflow.dynamic.test:8443/dags/dag_finance',
      '_blank',
      'noopener,noreferrer',
    )
    openSpy.mockRestore()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
  })

  it('navigates back immediately when the builder is unchanged', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the builder open when discarding changes is cancelled', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Change builder' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Change builder' })).toBeInTheDocument()
  })

  it('discards changes and returns to the table after confirmation', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationBuilderPage />)

    await user.click(screen.getByRole('button', { name: 'Change builder' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.click(screen.getByRole('button', { name: 'Discard changes' }))

    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
  })
})
