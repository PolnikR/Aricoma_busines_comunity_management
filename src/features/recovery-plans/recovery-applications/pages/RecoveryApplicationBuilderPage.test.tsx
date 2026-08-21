import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OrvalApiError } from '@/shared/api/orvalMutator'
import { RecoveryApplicationBuilderPage } from './RecoveryApplicationBuilderPage'
import type {
  RecoveryApplicationFormState,
  SubmitDagResponse,
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

vi.mock('@/features/platform-administration/platform-providers/hooks/usePlatformProviders', () => ({
  usePlatformProviders: () => ({
    data: [{ id: 'airflow-01', name: 'Dynamic Airflow', url: 'https://airflow.dynamic.test:8443' }],
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
            platform: 'vmware-01',
            orchestrationProviderId: 'airflow-01',
            sourceConnection: 'vcenter_default',
            targetConnection: 'vcenter_default_destination',
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
            platform: 'vmware-01',
            orchestrationProviderId: 'airflow-01',
            sourceConnection: 'vcenter_default',
            targetConnection: 'vcenter_default_destination',
            tiers: new Map(),
          })
        }}
      >
        Save orchestrated fixture
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
