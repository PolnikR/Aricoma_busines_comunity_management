import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { RecoveryApplicationEditorPage } from './RecoveryApplicationEditorPage'
import type {
  RecoveryApplicationFormState,
  RecoveryApplicationListItem,
  SubmitDagResponse,
} from '../model/recoveryApplicationTypes'
import type { SubmitRecoveryApplicationInput } from '../model/recoveryApplicationTypes'

const navigate = vi.fn()
const mutate = vi.fn<(
  input: SubmitRecoveryApplicationInput,
  options: { onSuccess: (response: SubmitDagResponse) => void; onError: (cause?: Error) => void },
) => void>()
const refetch = vi.fn()
const submitMutation = {
  mutate,
  error: null as Error | null,
  isPending: false,
}

const application: RecoveryApplicationListItem = {
  id: 'finance_app.json',
  policySetId: 'test_1_hour_ps',
  orchestrationProviderId: 'airflow-01',
  data: {
    application: {
      name: 'Finance App',
      description: 'Finance recovery',
      environment: 'prod',
      platform: 'IBM_POWER',
      source_provider_id: 'ibm-power-01',
      target_provider_id: 'ibm-power-02',
      notificationEmail: 'dr-team@example.test',
      tiers: {
        database: {
          order: 1,
          description: 'Database tier',
          recovery_group: {
            id: 'database_group',
            name: 'database_group',
            description: 'Database recovery group',
            vms: [{ name: 'db-01' }],
          },
        },
      },
    },
  },
}

let recoveryQuery: {
  data: RecoveryApplicationListItem[] | undefined
  isLoading: boolean
  error: Error | null
  isFetching: boolean
  refetch: typeof refetch
  isFetchedAfterMount: boolean
}

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  return {
    ...actual,
    useNavigate: () => navigate,
    useParams: () => ({ id: 'finance_app' }),
    useBlocker: () => ({ state: 'unblocked' as const }),
  }
})

vi.mock('@/hooks/useTranslation', () => import('@/test-utils/mockUseTranslation'))

vi.mock('../hooks/useRecoveryApplications', () => ({
  useRecoveryApplications: () => recoveryQuery,
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
    initialData,
    onSave,
    onDirtyChange,
    disableFileName,
    isInitialLoading,
    lockPushToOrchestrator,
    lockedProviders,
    readOnly,
  }: {
    initialData?: RecoveryApplicationFormState
    onSave: (state: RecoveryApplicationFormState) => void
    onDirtyChange?: (isDirty: boolean) => void
    disableFileName?: boolean
    isInitialLoading?: boolean
    lockPushToOrchestrator?: boolean
    lockedProviders?: { platform: string; sourceProviderId: string | null; targetProviderId: string | null } | null
    readOnly?: boolean
  }) => (
    <fieldset disabled={isInitialLoading} aria-busy={isInitialLoading}>
      <span>Application details</span>
      <span>{readOnly ? 'Read-only configuration' : 'Editable configuration'}</span>
      <span>{initialData?.name}</span>
      <span>{initialData?.fileName}</span>
      <span>{`Selected provider: ${initialData?.platform ?? ''}`}</span>
      <span>{disableFileName ? 'Filename disabled' : 'Filename enabled'}</span>
      <span>{lockPushToOrchestrator ? 'Push locked' : 'Push unlocked'}</span>
      <span>{lockedProviders ? `Providers locked: ${lockedProviders.sourceProviderId ?? 'none'} -> ${lockedProviders.targetProviderId ?? 'none'}` : 'Providers unlocked'}</span>
      <button
        type="button"
        onClick={() => { if (initialData) onSave({ ...initialData, platform: 'vmware-vcenter-01', targetProviderId: 'vmware-vcenter-02' }) }}
      >
        Save with other providers
      </button>
      <button type="button" onClick={() => { if (initialData) onSave(initialData) }}>Save unchanged</button>
      <button
        type="button"
        onClick={() => { if (initialData) onSave({ ...initialData, name: 'Renamed App' }) }}
      >
        Save renamed
      </button>
      <button
        type="button"
        onClick={() => { if (initialData) onSave({ ...initialData, pushToOrchestrator: true }) }}
      >
        Save orchestrated
      </button>
      <button type="button" onClick={() => { onDirtyChange?.(true) }}>
        Change builder
      </button>
    </fieldset>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  refetch.mockResolvedValue({ isError: false })
  submitMutation.error = null
  recoveryQuery = {
    data: [application],
    isLoading: false,
    error: null,
    isFetching: false,
    isFetchedAfterMount: true,
    refetch,
  }
})

describe('RecoveryApplicationEditorPage', () => {
  it('blocks direct-URL submit for pushed applications while showing configuration', async () => {
    recoveryQuery.data = [{ ...application, pushToOrchestrator: true }]
    render(<RecoveryApplicationEditorPage />)
    expect(screen.getByText('Read-only configuration')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save unchanged' }))
    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByText('Application details')).toBeInTheDocument()
  })

  it('locks a mounted editor immediately when refetch reports pushed', async () => {
    const view = render(<RecoveryApplicationEditorPage />)
    expect(screen.getByText('Editable configuration')).toBeInTheDocument()
    recoveryQuery.data = [{ ...application, pushToOrchestrator: true }]
    view.rerender(<RecoveryApplicationEditorPage />)
    expect(screen.getByText('Read-only configuration')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save unchanged' }))
    expect(mutate).not.toHaveBeenCalled()
  })

  it('waits for a fresh mount result before allowing a cached draft to submit', async () => {
    recoveryQuery.isFetchedAfterMount = false
    const view = render(<RecoveryApplicationEditorPage />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save unchanged' }))
    expect(mutate).not.toHaveBeenCalled()
    recoveryQuery.isFetchedAfterMount = true
    view.rerender(<RecoveryApplicationEditorPage />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Save unchanged' }))
    expect(mutate).toHaveBeenCalledOnce()
  })

  it.each([true, false])('reconciles a 409 conflict and keeps the editor locked if refresh failed=%s', async isError => {
    refetch.mockResolvedValueOnce({ isError })
    render(<RecoveryApplicationEditorPage />)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Save unchanged' }))
    const call = mutate.mock.calls[0]
    if (!call) throw new Error('Expected initial submission')
    act(() => { call[1].onError(new OrvalApiError(409, 'Conflict', { detail: 'Application is pushed' })) })
    expect(refetch).toHaveBeenCalledOnce()
    await waitFor(() => { expect(screen.getByText(isError ? 'Read-only configuration' : 'Editable configuration')).toBeInTheDocument() })
    await user.click(screen.getByRole('button', { name: 'Save unchanged' }))
    expect(mutate).toHaveBeenCalledTimes(isError ? 1 : 2)
  })

  it('navigates back directly when the edit draft is clean', async () => {
    render(<RecoveryApplicationEditorPage />)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
  })

  it.each([false, true])('clears dirty state after a locked successful save (push=%s)', async push => {
    const user = userEvent.setup()
    render(<RecoveryApplicationEditorPage />)
    await user.click(screen.getByRole('button', { name: 'Change builder' }))
    await user.click(screen.getByRole('button', { name: push ? 'Save orchestrated' : 'Save unchanged' }))
    expect(screen.getByRole('button', { name: 'Back' })).toBeDisabled()
    const before = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(before)
    expect(before.defaultPrevented).toBe(true)
    const call = mutate.mock.calls[0]
    if (!call) throw new Error('Expected submission')
    act(() => { call[1].onSuccess({ applications: [], ...(push ? { orchestrator_push: null } : {}) }) })
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
    render(<RecoveryApplicationEditorPage />)
    await user.click(screen.getByRole('button', { name: 'Change builder' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: push ? 'Save orchestrated' : 'Save unchanged' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    const call = mutate.mock.calls[0]
    if (!call) throw new Error('Expected submission')
    act(() => { call[1].onSuccess({ applications: [], ...(push ? { orchestrator_push: null } : {}) }) })
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
    render(<RecoveryApplicationEditorPage />)
    await user.click(screen.getByRole('button', { name: 'Change builder' }))
    await user.click(screen.getByRole('button', { name: 'Save unchanged' }))
    await user.click(screen.getByRole('button', { name: 'Save unchanged' }))
    expect(mutate).toHaveBeenCalledOnce()
    const call = mutate.mock.calls[0]
    if (!call) throw new Error('Expected submission')
    act(() => { call[1].onError(new OrvalApiError(400, 'Bad Request', { detail: 'Save rejected' })) })
    expect(screen.getByRole('button', { name: 'Back' })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
  })

  it('passes manual-only schedule and notes from the edit response to the shared push dialog', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationEditorPage />)
    await user.click(screen.getByRole('button', { name: 'Save orchestrated' }))
    const call = mutate.mock.calls[0]
    if (!call) throw new Error('Expected submit mutation')
    call[1].onSuccess({ applications: [], orchestrator_push: {
      status: 'pushed', dag_id: 'dag_manual_finance', schedule: 'manual_only', notes: ['Edit backend note'],
    } })
    const info = await screen.findByRole('region', { name: 'Manual execution in Airflow' })
    expect(info).toHaveTextContent('The DAG was successfully pushed, but has not started yet.')
    expect(info).toHaveTextContent('first select Unpause, then Trigger')
    expect(info).toHaveTextContent('Edit backend note')
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
    render(<RecoveryApplicationEditorPage />)
    await user.click(screen.getByRole('button', { name: 'Save orchestrated' }))
    const call = mutate.mock.calls[0]
    if (!call) throw new Error('Expected submit mutation')
    const options = call[1]
    options.onSuccess({ applications: [], orchestrator_push: push })
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent(push ? 'Orchestrator push skipped' : 'The API did not return an orchestrator push result.')
    expect(screen.queryByRole('button', { name: 'View in Airflow' })).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
  })

  it('keeps the builder in a constrained body region for nested resource scrolling', () => {
    const { container } = render(<RecoveryApplicationEditorPage />)

    expect(container.querySelector('fieldset')?.parentElement).toHaveClass(
      'flex',
      'flex-1',
      'flex-col',
      'lg:min-h-0',
    )
  })

  it('keeps the localized submit title and shows nested backend detail', () => {
    submitMutation.error = new Error('Submit recovery application request failed with status 409', {
      cause: new OrvalApiError(409, 'Conflict', { detail: 'The recovery application is locked by an active run.' }),
    })
    render(<RecoveryApplicationEditorPage />)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveTextContent('Failed to submit recovery application.')
    expect(alert).toHaveTextContent('The recovery application is locked by an active run.')
    expect(alert).not.toHaveTextContent('status 409')
  })

  it('prefills backend data and submits an unchanged filename', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationEditorPage />)

    expect(screen.getByText('Finance App')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save unchanged' }))

    const call = mutate.mock.calls[0]
    expect(call).toBeDefined()
    if (!call) throw new Error('Expected submit mutation to be called')

    const [submission, options] = call
    expect(submission.data.id).toBe('finance_app')
    expect(submission.providerId).toBe('airflow-01')
    expect(submission.data.application.name).toBe('Finance App')
    expect(submission.data.application.notificationEmail).toBe('dr-team@example.test')
    expect(options.onSuccess).toBeTypeOf('function')
    expect(screen.getByText('Filename disabled')).toBeInTheDocument()
  })

  it('selects the provider by source_provider_id and keeps the wire platform as its type', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationEditorPage />)

    expect(screen.getByText('Selected provider: ibm-power-01')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save unchanged' }))

    expect(mutate.mock.calls[0]?.[0].data.application).toMatchObject({
      platform: 'IBM_POWER',
      source_provider_id: 'ibm-power-01',
      target_provider_id: 'ibm-power-02',
    })
  })

  it('shows a legacy provider id stored in platform but keeps that application locked', () => {
    recoveryQuery = {
      ...recoveryQuery,
      data: [{
        ...application,
        data: { application: { ...application.data.application, platform: 'vmware-vcenter-01', source_provider_id: undefined } },
      }],
    }
    render(<RecoveryApplicationEditorPage />)

    expect(screen.getByText('Selected provider: vmware-vcenter-01')).toBeInTheDocument()
    expect(screen.getByText('Providers locked: none -> ibm-power-02')).toBeInTheDocument()
  })

  it('locks both providers and saves the original platform and provider ids', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationEditorPage />)

    expect(screen.getByText('Providers locked: ibm-power-01 -> ibm-power-02')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save with other providers' }))

    expect(mutate.mock.calls[0]?.[0].data.application).toMatchObject({
      platform: 'IBM_POWER',
      source_provider_id: 'ibm-power-01',
      target_provider_id: 'ibm-power-02',
    })
  })

  it('locks the providers of a legacy application without provider ids too', () => {
    recoveryQuery = {
      ...recoveryQuery,
      data: [{ ...application, data: { application: { ...application.data.application, source_provider_id: undefined, target_provider_id: null } } }],
    }
    render(<RecoveryApplicationEditorPage />)

    expect(screen.getByText('Providers locked: none -> none')).toBeInTheDocument()
  })

  it('locks the push only for an application the backend reports as pushed', () => {
    recoveryQuery = { ...recoveryQuery, data: [{ ...application, pushToOrchestrator: true, airflowRunId: 'run-1' }] }
    render(<RecoveryApplicationEditorPage />)

    expect(screen.getByText('Push locked')).toBeInTheDocument()
  })

  it('does not infer a deployed DAG from a run id alone', () => {
    recoveryQuery = { ...recoveryQuery, data: [{ ...application, pushToOrchestrator: false, airflowRunId: 'run-1' }] }
    render(<RecoveryApplicationEditorPage />)

    expect(screen.getByText('Push unlocked')).toBeInTheDocument()
  })

  it('keeps filename independent when application name changes', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationEditorPage />)

    await user.click(screen.getByRole('button', { name: 'Save renamed' }))

    const call = mutate.mock.calls[0]
    expect(call).toBeDefined()
    if (!call) throw new Error('Expected submit mutation to be called')

    expect(call[0].data.id).toBe('finance_app')
    expect(call[0].data.application.name).toBe('Renamed App')
  })

  it('shows orchestrator details for an orchestrated edit and navigates after close', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationEditorPage />)

    await user.click(screen.getByRole('button', { name: 'Save orchestrated' }))

    const call = mutate.mock.calls[0]
    expect(call).toBeDefined()
    if (!call) throw new Error('Expected submit mutation to be called')

    call[1].onSuccess({
      applications: [],
      orchestrator_push: {
        status: 'pushed',
        dag: '/home/airflow/dags/finance-edit.py',
        json: '/home/airflow/dags/finance-edit.json',
        dag_id: 'dag_finance_edit',
      },
    })

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    expect(screen.getByText('/home/airflow/dags/finance-edit.py')).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()

    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null)
    await user.click(screen.getByRole('button', { name: 'View in Airflow' }))
    expect(openSpy).toHaveBeenCalledWith(
      'https://airflow.dynamic.test:8443/dags/dag_finance_edit',
      '_blank',
      'noopener,noreferrer',
    )
    openSpy.mockRestore()

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
  })

  it('warns before leaving with unsaved edit changes', async () => {
    const user = userEvent.setup()
    render(<RecoveryApplicationEditorPage />)

    await user.click(screen.getByRole('button', { name: 'Change builder' }))
    await user.click(screen.getByRole('button', { name: 'Back' }))

    expect(screen.getByRole('dialog', { name: 'Discard unsaved changes?' })).toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(navigate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Back' }))
    await user.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(navigate).toHaveBeenCalledWith('/recovery-plans/recovery-applications')
  })

  it('renders loading, load-error, and not-found states', () => {
    recoveryQuery = { ...recoveryQuery, data: undefined, isLoading: true }
    const { container, rerender } = render(<RecoveryApplicationEditorPage />)
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
    expect(screen.getByText('Application details')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save unchanged' })).toBeDisabled()
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument()
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument()
    expect(screen.queryByText('Loading recovery application')).not.toBeInTheDocument()

    recoveryQuery = {
      ...recoveryQuery,
      isLoading: false,
      error: new Error('Get recovery applications request failed with status 503', {
        cause: new OrvalApiError(503, 'Unavailable', { detail: 'Recovery applications are unavailable.' }),
      }),
    }
    rerender(<RecoveryApplicationEditorPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('Recovery applications are unavailable.')

    recoveryQuery = { ...recoveryQuery, data: [], error: null }
    rerender(<RecoveryApplicationEditorPage />)
    expect(screen.getByText('Recovery application not found')).toBeInTheDocument()
  })
})
