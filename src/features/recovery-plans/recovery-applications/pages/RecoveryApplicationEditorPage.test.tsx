import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
  options: { onSuccess: (response: SubmitDagResponse) => void },
) => void>()
const refetch = vi.fn()

const application: RecoveryApplicationListItem = {
  id: 'finance_app.json',
  policySetId: 'test_1_hour_ps',
  orchestrationProviderId: 'airflow-01',
  data: {
    application: {
      name: 'Finance App',
      description: 'Finance recovery',
      environment: 'prod',
      platform: 'airflow-01',
      source_connection: 'vcenter_default',
      target_connection: 'vcenter_default_destination',
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
  useSubmitRecoveryApplication: () => ({
    mutate,
    error: null,
    isPending: false,
  }),
}))

vi.mock('@/features/platform-administration/platform-providers/hooks/usePlatformProviders', () => ({
  usePlatformProviders: () => ({
    data: [{ id: 'airflow-01', name: 'Dynamic Airflow', url: 'https://airflow.dynamic.test:8443' }],
  }),
}))

vi.mock('../components/RecoveryAppBuilder', () => ({
  RecoveryAppBuilder: ({
    initialData,
    onSave,
    onDirtyChange,
    disableFileName,
  }: {
    initialData: RecoveryApplicationFormState
    onSave: (state: RecoveryApplicationFormState) => void
    onDirtyChange?: (isDirty: boolean) => void
    disableFileName?: boolean
  }) => (
    <div>
      <span>{initialData.name}</span>
      <span>{initialData.fileName}</span>
      <span>{disableFileName ? 'Filename disabled' : 'Filename enabled'}</span>
      <button type="button" onClick={() => { onSave(initialData) }}>Save unchanged</button>
      <button
        type="button"
        onClick={() => { onSave({ ...initialData, name: 'Renamed App' }) }}
      >
        Save renamed
      </button>
      <button
        type="button"
        onClick={() => { onSave({ ...initialData, pushToOrchestrator: true }) }}
      >
        Save orchestrated
      </button>
      <button type="button" onClick={() => { onDirtyChange?.(true) }}>
        Change builder
      </button>
    </div>
  ),
}))

beforeEach(() => {
  vi.clearAllMocks()
  recoveryQuery = {
    data: [application],
    isLoading: false,
    error: null,
    isFetching: false,
    refetch,
  }
})

describe('RecoveryApplicationEditorPage', () => {
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
    expect(options.onSuccess).toBeTypeOf('function')
    expect(screen.getByText('Filename disabled')).toBeInTheDocument()
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
    const { rerender } = render(<RecoveryApplicationEditorPage />)
    expect(screen.getByRole('status')).toHaveTextContent('Loading recovery application')

    recoveryQuery = {
      ...recoveryQuery,
      isLoading: false,
      error: new Error('Backend unavailable'),
    }
    rerender(<RecoveryApplicationEditorPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('Backend unavailable')

    recoveryQuery = { ...recoveryQuery, data: [], error: null }
    rerender(<RecoveryApplicationEditorPage />)
    expect(screen.getByText('Recovery application not found')).toBeInTheDocument()
  })
})
